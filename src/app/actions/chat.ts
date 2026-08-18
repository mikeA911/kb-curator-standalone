'use server'

import { requireUser } from '@/lib/auth'
import { runAssistantTurn } from '@/lib/chat/loop'

export async function sendChatMessageAction(conversationId: string | null, message: string) {
  const ctx = await requireUser()
  return runAssistantTurn(ctx, conversationId, message)
}
