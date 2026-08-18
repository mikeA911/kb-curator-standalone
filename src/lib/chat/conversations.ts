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
    })
    .select()
    .single()
  if (error || !data) throw error ?? new Error('Failed to save chat message')
  return data
}
