import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Conversation, ChatMessageRow, ChatMessageRole } from '@/types/database'

export async function createConversation(supabase: SupabaseClient<Database>, userId: string, title?: string): Promise<Conversation> {
  const { data, error } = await supabase.from('conversations').insert({ user_id: userId, title: title ?? null }).select().single()
  if (error || !data) throw error ?? new Error('Failed to create conversation')
  return data
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
