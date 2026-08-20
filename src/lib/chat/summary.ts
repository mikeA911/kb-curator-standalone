import 'server-only'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ChatMessageRow, ConversationSummary } from '@/types/database'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { getActiveStructuredOutputProvider } from '@/lib/ai'
import { listMessages } from './conversations'

export const SUMMARY_VERSION = 'v1'

// Mirrors ConversationSummary in src/types/database.ts -- kept as a separate
// zod schema (not derived from the interface) since this is specifically the
// shape asked of the model, not just the stored shape.
const ConversationSummarySchema = z.object({
  objective: z.string(),
  confirmedRequirements: z.array(z.string()),
  decisions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  createdRecords: z.array(z.string()),
  referencedEvidence: z.array(z.string()),
  nextAction: z.string(),
})

// Refresh roughly every 10 turns (the doc's own suggested cadence), or
// immediately once composeWorkingContext has actually had to truncate --
// reusing that flag instead of a second token check.
const REFRESH_TURN_THRESHOLD = 10

export async function getConversationSummary(
  supabase: SupabaseClient<Database>,
  conversationId: string
): Promise<ConversationSummary | null> {
  const { data, error } = await supabase.from('conversations').select('summary_json').eq('id', conversationId).single()
  if (error || !data) return null
  return data.summary_json
}

function countTurnsSince(rows: ChatMessageRow[], throughMessageId: string | null): number {
  const startIndex = throughMessageId ? rows.findIndex((r) => r.id === throughMessageId) : -1
  const relevant = startIndex >= 0 ? rows.slice(startIndex + 1) : rows
  return relevant.filter((r) => r.role === 'user').length
}

function buildSummaryPrompt(rows: ChatMessageRow[], previous: ConversationSummary | null): string {
  const transcript = rows
    .map((r) => {
      if (r.role === 'assistant' && r.tool_calls && r.tool_calls.length > 0) {
        return `assistant: [requested tools: ${r.tool_calls.map((c) => c.name).join(', ')}]`
      }
      return `${r.role}: ${r.content ?? ''}`
    })
    .join('\n')
  const previousBlock = previous ? `Previous summary:\n${JSON.stringify(previous)}\n\n` : ''
  return (
    `${previousBlock}Conversation transcript so far:\n${transcript}\n\n` +
    'Produce an updated structured summary of this conversation between a user and the KB Sandbox Workbench Assistant, ' +
    'as a single JSON object with exactly these fields:\n' +
    '- objective: string, the user\'s overall goal in this conversation\n' +
    '- confirmedRequirements: array of strings, requirements or constraints the user has confirmed\n' +
    '- decisions: array of strings, decisions made and their rationale\n' +
    '- openQuestions: array of strings, questions still unresolved\n' +
    '- createdRecords: array of strings, projects/workstreams/artifacts created (name and kind)\n' +
    '- referencedEvidence: array of strings, Wiki articles or other evidence referenced\n' +
    '- nextAction: string, the agreed or suggested next step\n' +
    'Use an empty array or empty string for any field the transcript does not support -- do not omit fields or invent other field names. ' +
    'Carry forward anything from the previous summary that still holds.'
  )
}

// Must never block a chat turn -- mirrors embedApprovedVersion's established
// "best-effort, log and move on" pattern in src/lib/wiki/review.ts. Re-fetches
// the persisted rows itself (rather than being passed the in-memory
// ChatMessage[] history) because it needs real row ids for
// summary_through_message_id, which the in-memory chat messages don't carry.
export async function maybeRefreshSummary(ctx: WorkbenchCallerContext, conversationId: string, wasTruncated: boolean): Promise<void> {
  try {
    const { data: conversation, error } = await ctx.supabase
      .from('conversations')
      .select('summary_json, summary_through_message_id')
      .eq('id', conversationId)
      .single()
    if (error || !conversation) return

    const rows = await listMessages(ctx.supabase, conversationId)
    const turnsSince = countTurnsSince(rows, conversation.summary_through_message_id)
    if (turnsSince < REFRESH_TURN_THRESHOLD && !wasTruncated) return
    if (rows.length === 0) return

    const provider = await getActiveStructuredOutputProvider(ctx.supabase, { requestedBy: ctx.user.id })
    const { data, model } = await provider.generateStructured({
      system: 'You maintain a running summary of a Workbench Assistant conversation so it can continue past its context window.',
      prompt: buildSummaryPrompt(rows, conversation.summary_json),
      schema: ConversationSummarySchema,
      maxOutputTokens: 1024,
    })

    const lastMessage = rows[rows.length - 1]
    await ctx.supabase
      .from('conversations')
      .update({
        summary_json: data,
        summary_through_message_id: lastMessage.id,
        summary_updated_at: new Date().toISOString(),
        summary_provider: provider.name,
        summary_model: model,
        summary_version: SUMMARY_VERSION,
      })
      .eq('id', conversationId)
  } catch (err) {
    console.error(`Conversation summary refresh failed for ${conversationId}:`, err)
  }
}
