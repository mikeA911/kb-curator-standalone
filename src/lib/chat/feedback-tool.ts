import 'server-only'
import { z } from 'zod'
import type { ToolSpec } from '@/lib/ai'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type { FeedbackType } from '@/types/database'
import { version as APP_VERSION } from '../../../package.json'

// Owner Roadmap and Ember Feedback Board, Phase 1. Not registered in
// src/lib/mcp/tools.ts's general registry -- intercepted directly in
// loop.ts before reaching callTool, same "defined here, its behavior
// depends on context callTool()'s generic dispatch doesn't carry" pattern
// as SEARCH_PROJECT_KNOWLEDGE_TOOL/PRESENT_RESPONSE_TOOL. Only offered when
// runAssistantTurn has a feedbackContext (never a normal chat conversation).

export const SUBMIT_FEEDBACK_REPORT_TOOL_NAME = 'submit_feedback_report'

const InputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  expectedResult: z.string().max(2000).optional(),
  actualResult: z.string().max(2000).optional(),
  impact: z.string().max(1000).optional(),
  reproductionSteps: z.string().max(2000).optional(),
})

export const SUBMIT_FEEDBACK_REPORT_TOOL: ToolSpec = {
  name: SUBMIT_FEEDBACK_REPORT_TOOL_NAME,
  description:
    'File the drafted feedback report. Call this exactly once, after you have enough information to be useful (at minimum a clear title and description) -- not before, and not more than once per conversation.',
  parameters: z.toJSONSchema(InputSchema),
}

export interface FeedbackSubmissionContext {
  category: FeedbackType
  currentPage: string
  conversationId: string
}

export async function runSubmitFeedbackReport(
  ctx: WorkbenchCallerContext,
  submissionContext: FeedbackSubmissionContext,
  rawInput: unknown
): Promise<{ reportNumber: number; status: string }> {
  const input = InputSchema.parse(rawInput)

  const { data, error } = await ctx.supabase
    .from('feedback_reports')
    .insert({
      reporter_id: ctx.user.id,
      source_conversation_id: submissionContext.conversationId,
      type: submissionContext.category,
      title: input.title,
      description: input.description,
      expected_result: input.expectedResult ?? null,
      actual_result: input.actualResult ?? null,
      impact: input.impact ?? null,
      reproduction_steps: input.reproductionSteps ?? null,
      current_page: submissionContext.currentPage,
      application_version: APP_VERSION,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    })
    .select('report_number, status')
    .single()
  if (error || !data) throw error ?? new Error('Failed to submit feedback report')

  return { reportNumber: data.report_number, status: data.status }
}
