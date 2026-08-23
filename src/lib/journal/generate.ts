import 'server-only'
import { z } from 'zod'
import type { AIProvider } from '@/lib/ai/provider'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { listMessages, toDisplayMessages } from '@/lib/chat/conversations'

// Defensive limits (docs/dev-request-private-work-journal.md: "Apply
// defensive limits to source count, source size..."). MVP scope is a fixed
// 30-day range, so these are unlikely to bind in practice -- they exist so a
// pathologically heavy user gets an explicit truncation note rather than an
// unbounded prompt.
const MAX_CONVERSATIONS = 100
const MAX_EVIDENCE_CHARS = 60000

export interface JournalSourceConversation {
  id: string
  title: string
  date: string
}

export interface JournalSource {
  conversations: JournalSourceConversation[]
  evidence: string
  truncated: boolean
}

// User-scoped by construction (ctx.user.id + RLS both apply) -- there is no
// path here that can return another user's conversations.
export async function gatherJournalSource(ctx: WorkbenchCallerContext, sinceDate: Date): Promise<JournalSource> {
  const { data, error } = await ctx.supabase
    .from('conversations')
    .select('*')
    .eq('user_id', ctx.user.id)
    .gte('last_message_at', sinceDate.toISOString())
    .order('last_message_at', { ascending: true })
    .limit(MAX_CONVERSATIONS)
  if (error) throw error
  const rows = data ?? []

  const conversations: JournalSourceConversation[] = []
  let evidence = ''
  let truncated = rows.length >= MAX_CONVERSATIONS

  for (const conv of rows) {
    const messages = await listMessages(ctx.supabase, conv.id)
    const display = await toDisplayMessages(messages, new Map(), ctx)
    if (display.length === 0) continue

    const date = conv.last_message_at ?? conv.created_at
    const transcript = display.map((m) => `${m.role}: ${m.content}`).join('\n')
    const block = `[Conversation: ${conv.title ?? 'Untitled conversation'} -- ${date}]\n${transcript}\n\n`

    if (evidence.length + block.length > MAX_EVIDENCE_CHARS) {
      truncated = true
      break
    }
    evidence += block
    conversations.push({ id: conv.id, title: conv.title ?? 'Untitled conversation', date })
  }

  return { conversations, evidence, truncated }
}

// The doc's own suggested document structure, trimmed to what an MVP single
// generateStructured call can reliably produce. Title, the covered date
// range, and the Source Appendix (see docx.ts) are computed from real
// records, never model output -- only these fields are AI-generated.
export const JournalContentSchema = z.object({
  narrative: z.string(),
  projectsAndThemes: z.array(z.string()),
  decisionsAndMilestones: z.array(z.string()),
  lessonsAndChangedAssumptions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  itemsToRevisit: z.array(z.string()),
})
export type JournalContent = z.infer<typeof JournalContentSchema>

const EMPTY_CONTENT: JournalContent = {
  narrative: '',
  projectsAndThemes: [],
  decisionsAndMilestones: [],
  lessonsAndChangedAssumptions: [],
  openQuestions: [],
  itemsToRevisit: [],
}

// This provider (src/lib/ai/openai-compatible-provider.ts) only requests
// generic `json_object` mode -- the zod schema is never sent to the model,
// so every field name must be spelled out in the prompt or the model
// invents its own. Same fix as the bug caught live in src/lib/chat/summary.ts.
export async function generateJournalContent(provider: AIProvider, source: JournalSource, rangeLabel: string): Promise<JournalContent> {
  if (source.conversations.length === 0) {
    return { ...EMPTY_CONTENT, narrative: `No Assistant conversations were found for ${rangeLabel}.` }
  }

  const { data } = await provider.generateStructured({
    system:
      "You write a private, reflective personal work journal from a user's own saved Workbench Assistant conversations. " +
      'Write only from the evidence provided -- do not invent achievements, decisions, or emotions the evidence does not support. ' +
      'This is for the user\'s own reflection, not a performance report.',
    prompt:
      `Covered period: ${rangeLabel}\n\nConversations, chronological:\n${source.evidence}\n\n` +
      'Produce a journal as a single JSON object with exactly these fields:\n' +
      '- narrative: string, a reflective narrative of what the user worked on during this period\n' +
      '- projectsAndThemes: array of strings, projects and recurring themes explored\n' +
      '- decisionsAndMilestones: array of strings, decisions made and milestones reached\n' +
      '- lessonsAndChangedAssumptions: array of strings, things learned or assumptions that changed\n' +
      '- openQuestions: array of strings, unfinished threads and open questions\n' +
      '- itemsToRevisit: array of strings, things the user may want to revisit later\n' +
      'Use an empty array or empty string for any field the evidence does not support -- do not omit fields or invent other field names.',
    schema: JournalContentSchema,
    maxOutputTokens: 4096,
  })

  return data
}
