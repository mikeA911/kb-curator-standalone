'use server'

import { requireUser } from '@/lib/auth'
import { runAssistantTurn, type ModelSelection } from '@/lib/chat/loop'
import { getLatestActivityLabel, listRecentConversations, listMessages, toDisplayMessages } from '@/lib/chat/conversations'
import { listChatCapableModels, listProviders, listModels } from '@/lib/ai'

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

// An empty result is the first-use signal ChatPanel checks for.
export async function listRecentConversationsAction() {
  const ctx = await requireUser()
  return listRecentConversations(ctx.supabase, ctx.user.id)
}

// RLS scopes listMessages to the caller's own conversation -- a
// mismatched/foreign conversationId just returns an empty array, which
// ChatPanel treats as "gracefully show nothing," not an error.
export async function getConversationMessagesAction(conversationId: string) {
  const ctx = await requireUser()
  const [rows, providers, models] = await Promise.all([
    listMessages(ctx.supabase, conversationId),
    listProviders(ctx.supabase),
    listModels(ctx.supabase),
  ])
  const providerNameById = new Map(providers.map((p) => [p.id, p]))
  const displayNameByKey = new Map(
    models.map((m) => {
      const provider = providerNameById.get(m.provider_id)
      return [
        `${provider?.name}::${m.model_id}`,
        { providerDisplayName: provider?.display_name ?? provider?.name ?? 'Unknown provider', modelDisplayName: m.display_name },
      ] as const
    })
  )
  return toDisplayMessages(rows, displayNameByKey)
}
