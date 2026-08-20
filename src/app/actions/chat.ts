'use server'

import { requireUser } from '@/lib/auth'
import { runAssistantTurn, type ModelSelection } from '@/lib/chat/loop'
import { getLatestActivityLabel } from '@/lib/chat/conversations'
import { listChatCapableModels } from '@/lib/ai'

export async function sendChatMessageAction(conversationId: string | null, message: string, modelSelection?: ModelSelection) {
  const ctx = await requireUser()
  return runAssistantTurn(ctx, conversationId, message, modelSelection)
}

export async function listChatModelsAction() {
  const ctx = await requireUser()
  return listChatCapableModels(ctx.supabase)
}

// RLS (chat_messages_owner) already scopes this to the caller's own
// conversation -- a mismatched/foreign conversationId just returns null,
// no separate ownership check needed here.
export async function getChatActivityAction(conversationId: string) {
  const ctx = await requireUser()
  return getLatestActivityLabel(ctx.supabase, conversationId)
}
