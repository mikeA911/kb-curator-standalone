'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { runAssistantTurn, type ModelSelection } from '@/lib/chat/loop'
import * as feedback from '@/lib/feedback/queries'
import type { FeedbackBoardFilter, FeedbackReportTriageInput } from '@/lib/feedback/queries'
import type { FeedbackType } from '@/types/database'

// Owner Roadmap and Ember Feedback Board, Phase 1. conversationId is null
// only for the very first message of a feedback conversation -- the client
// passes back the id runAssistantTurn returns for every message after
// that, same convention as sendChatMessageAction.
export async function sendFeedbackMessageAction(
  conversationId: string | null,
  message: string,
  category: FeedbackType,
  currentPage: string,
  modelSelection?: ModelSelection
) {
  const ctx = await requireUser()
  return runAssistantTurn(ctx, conversationId, message, modelSelection, null, { category, currentPage })
}

export async function listMyFeedbackReportsAction() {
  const ctx = await requireUser()
  return feedback.listMyFeedbackReports(ctx)
}

export async function listFeedbackBoardAction(filter: FeedbackBoardFilter = {}) {
  const ctx = await requireUser()
  return feedback.listFeedbackBoard(ctx, filter)
}

export async function getFeedbackReportAction(id: string) {
  const ctx = await requireUser()
  return feedback.getFeedbackReport(ctx, id)
}

export async function getFeedbackReportStatusHistoryAction(id: string) {
  const ctx = await requireUser()
  return feedback.getFeedbackReportStatusHistory(ctx, id)
}

export async function updateFeedbackReportAction(id: string, input: FeedbackReportTriageInput) {
  const ctx = await requireUser()
  await feedback.updateFeedbackReport(ctx, id, input)
  revalidatePath('/feedback')
  revalidatePath(`/feedback/${id}`)
}
