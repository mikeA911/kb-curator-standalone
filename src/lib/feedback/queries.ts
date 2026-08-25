import 'server-only'
import { AuthError } from '@/lib/auth'
import type { FeedbackReport, FeedbackReportStatusHistoryEntry, FeedbackStatus, FeedbackType } from '@/types/database'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// Owner Roadmap and Ember Feedback Board, Phase 1. Every function here uses
// the caller's own RLS-scoped client -- feedback_reports_select_own_or_owner/
// feedback_reports_update_owner/feedback_report_status_history_owner (RLS)
// are the real gate, not this module.

export async function isPlatformOwner(ctx: WorkbenchCallerContext): Promise<boolean> {
  const { data } = await ctx.supabase.from('platform_owners').select('user_id').eq('user_id', ctx.user.id).maybeSingle()
  return !!data
}

export async function listMyFeedbackReports(ctx: WorkbenchCallerContext): Promise<FeedbackReport[]> {
  const { data, error } = await ctx.supabase
    .from('feedback_reports')
    .select('*')
    .eq('reporter_id', ctx.user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export interface FeedbackBoardFilter {
  type?: FeedbackType
  status?: FeedbackStatus
}

// Owner-only in practice (RLS: feedback_reports_select_own_or_owner returns
// every report only when is_platform_owner(auth.uid())) -- a non-owner
// calling this simply gets back their own report(s), if any, never an
// error, since RLS silently narrows rather than denying the query itself.
export async function listFeedbackBoard(ctx: WorkbenchCallerContext, filter: FeedbackBoardFilter = {}): Promise<FeedbackReport[]> {
  let query = ctx.supabase.from('feedback_reports').select('*').order('created_at', { ascending: false })
  if (filter.type) query = query.eq('type', filter.type)
  if (filter.status) query = query.eq('status', filter.status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getFeedbackReport(ctx: WorkbenchCallerContext, id: string): Promise<FeedbackReport | null> {
  const { data, error } = await ctx.supabase.from('feedback_reports').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getFeedbackReportStatusHistory(ctx: WorkbenchCallerContext, feedbackReportId: string): Promise<FeedbackReportStatusHistoryEntry[]> {
  const { data, error } = await ctx.supabase
    .from('feedback_report_status_history')
    .select('*')
    .eq('feedback_report_id', feedbackReportId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export interface FeedbackReportTriageInput {
  status?: FeedbackStatus
  statusChangeReason?: string
  severity?: FeedbackReport['severity']
  classification?: FeedbackReport['classification']
  ownerDecision?: string | null
  ownerDecisionRationale?: string | null
  affectedVersion?: string | null
  fixedVersion?: string | null
  deployedVersion?: string | null
  assigneeId?: string | null
  roadmapRef?: string | null
  duplicateOf?: string | null
}

// RLS (feedback_reports_update_owner) already restricts this to a platform
// owner -- requireOwner-style check here is just a friendlier error before
// hitting an opaque RLS-denial from the database.
export async function updateFeedbackReport(ctx: WorkbenchCallerContext, id: string, input: FeedbackReportTriageInput): Promise<void> {
  if (!(await isPlatformOwner(ctx))) throw new AuthError('Only an authorized owner may triage feedback reports')

  if (input.status) {
    const { data: current } = await ctx.supabase.from('feedback_reports').select('status').eq('id', id).single()
    if (current && current.status !== input.status) {
      const { error: historyError } = await ctx.supabase.from('feedback_report_status_history').insert({
        feedback_report_id: id,
        from_status: current.status,
        to_status: input.status,
        changed_by: ctx.user.id,
        reason: input.statusChangeReason ?? null,
      })
      if (historyError) throw historyError
    }
  }

  const { error } = await ctx.supabase
    .from('feedback_reports')
    .update({
      ...(input.status ? { status: input.status } : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.classification ? { classification: input.classification } : {}),
      ...(input.ownerDecision !== undefined ? { owner_decision: input.ownerDecision } : {}),
      ...(input.ownerDecisionRationale !== undefined ? { owner_decision_rationale: input.ownerDecisionRationale } : {}),
      ...(input.affectedVersion !== undefined ? { affected_version: input.affectedVersion } : {}),
      ...(input.fixedVersion !== undefined ? { fixed_version: input.fixedVersion } : {}),
      ...(input.deployedVersion !== undefined ? { deployed_version: input.deployedVersion } : {}),
      ...(input.assigneeId !== undefined ? { assignee_id: input.assigneeId } : {}),
      ...(input.roadmapRef !== undefined ? { roadmap_ref: input.roadmapRef } : {}),
      ...(input.duplicateOf !== undefined ? { duplicate_of: input.duplicateOf } : {}),
    })
    .eq('id', id)
  if (error) throw error
}
