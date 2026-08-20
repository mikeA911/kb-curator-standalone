import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Conversation, ChatMessageRow, ChatMessageRole } from '@/types/database'

export async function createConversation(supabase: SupabaseClient<Database>, userId: string, title?: string): Promise<Conversation> {
  const { data, error } = await supabase.from('conversations').insert({ user_id: userId, title: title ?? null }).select().single()
  if (error || !data) throw error ?? new Error('Failed to create conversation')
  return data
}

// An empty result IS the first-use signal the onboarding UI checks for --
// no separate "is this a new user" boolean needed.
export async function listRecentConversations(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 10
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  providerDisplayName?: string
  modelDisplayName?: string
  toolsUsed?: string[]
}

// Turns persisted rows back into the same shape ChatPanel renders live.
// Pure/synchronous: display-name resolution is passed in as a lookup rather
// than queried here, so this stays trivially unit-testable. A provider/model
// no longer in the lookup (renamed or removed since) falls back to the raw
// identifier stored on the row -- provenance is never silently dropped.
export function toDisplayMessages(
  rows: ChatMessageRow[],
  displayNameByKey: Map<string, { providerDisplayName: string; modelDisplayName: string }>
): DisplayMessage[] {
  const out: DisplayMessage[] = []
  let pendingTools = new Set<string>()

  for (const row of rows) {
    if (row.role === 'user') {
      out.push({ role: 'user', content: row.content ?? '' })
      continue
    }
    if (row.role === 'tool') continue

    // An assistant row carrying tool_calls is an intermediate step, never
    // the final reply (runAssistantTurn only stops the loop once a reply
    // has no tool calls) -- fold its tool names into the next real reply.
    if (row.tool_calls && row.tool_calls.length > 0) {
      for (const call of row.tool_calls) pendingTools.add(call.name)
      continue
    }

    const key = row.provider && row.model ? `${row.provider}::${row.model}` : null
    const names = key ? displayNameByKey.get(key) : undefined
    out.push({
      role: 'assistant',
      content: row.content ?? '',
      providerDisplayName: names?.providerDisplayName ?? row.provider ?? undefined,
      modelDisplayName: names?.modelDisplayName ?? row.model ?? undefined,
      toolsUsed: pendingTools.size > 0 ? [...pendingTools] : undefined,
    })
    pendingTools = new Set()
  }

  return out
}

export async function listMessages(supabase: SupabaseClient<Database>, conversationId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function appendMessage(
  supabase: SupabaseClient<Database>,
  input: {
    conversationId: string
    userId: string
    role: ChatMessageRole
    content: string | null
    toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[] | null
    toolCallId?: string | null
    toolName?: string | null
    provider?: string | null
    model?: string | null
  }
): Promise<ChatMessageRow> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
      tool_calls: input.toolCalls ?? null,
      tool_call_id: input.toolCallId ?? null,
      tool_name: input.toolName ?? null,
      provider: input.provider ?? null,
      model: input.model ?? null,
    })
    .select()
    .single()
  if (error || !data) throw error ?? new Error('Failed to save chat message')
  return data
}

// M6E: a real (not simulated) activity indicator for the Assistant UI --
// reads whatever the tool-calling loop has most recently persisted for this
// conversation and maps it to a short human-readable phrase. Genuinely
// reflects progress since appendMessage writes happen synchronously as the
// loop advances; this is a poll target, not a push -- streaming stays
// explicitly out of scope (design note §17).
const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  search_wiki: 'Searching the Workbench Handbook & Wiki…',
  list_project_notes: 'Checking project notes…',
  create_project: 'Setting up the project…',
  approve_project: 'Approving the project…',
  create_workstream: 'Creating the workstream…',
  attach_workstream_artifact: 'Attaching the artifact…',
}

export async function getLatestActivityLabel(supabase: SupabaseClient<Database>, conversationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, tool_calls, tool_name')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  if (data.role === 'assistant' && data.tool_calls && data.tool_calls.length > 0) {
    return TOOL_ACTIVITY_LABELS[data.tool_calls[0].name] ?? null
  }
  if (data.role === 'tool' && data.tool_name) {
    return TOOL_ACTIVITY_LABELS[data.tool_name] ? 'Reviewing results…' : null
  }
  return null
}
