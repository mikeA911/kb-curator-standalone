import 'server-only'
import { AuthError } from '@/lib/auth'
import type { ApprovalType, BusinessFunction } from '@/types/database'
import type { WorkbenchCallerContext } from './context'

// Project Approval Authorities and Governance, Stage 1 (docs/dev-request-
// project-approval-authorities.md): policy + authority-assignment planning
// only -- no project_approval_requests/decisions yet, those are Stage 2.
// Every function here uses the caller's own RLS-scoped client, same
// convention as the rest of this module (project_approval_policies_manage_owner
// / project_authority_assignments_manage_owner -- RLS is the real gate).

export interface ApprovalPolicyInput {
  approvalType: ApprovalType
  requirementStatus: 'required' | 'optional' | 'not_applicable'
  minimumApprovals?: number
  approvalMode?: 'any_authorized' | 'all_assigned'
  allowSelfApproval?: boolean
  monetaryTrigger?: number | null
  discountTriggerPercent?: number | null
  visibilityScope?: 'internal' | 'customer_visible'
  requiredBeforeRelease?: boolean
  notes?: string | null
}

// One project may have at most one policy row per approval_type (DB unique
// constraint) -- upsert on that pair rather than insert-only, so re-running
// the wizard step or editing from the Governance page never creates a
// duplicate/conflicting row for the same approval type.
export async function upsertApprovalPolicy(ctx: WorkbenchCallerContext, projectId: string, input: ApprovalPolicyInput) {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to manage project governance')

  const { error } = await ctx.supabase
    .from('project_approval_policies')
    .upsert(
      {
        project_id: projectId,
        approval_type: input.approvalType,
        requirement_status: input.requirementStatus,
        sequence: null,
        minimum_approvals: input.minimumApprovals ?? 1,
        approval_mode: input.approvalMode ?? 'any_authorized',
        allow_self_approval: input.allowSelfApproval ?? false,
        monetary_trigger: input.monetaryTrigger ?? null,
        discount_trigger_percent: input.discountTriggerPercent ?? null,
        visibility_scope: input.visibilityScope ?? 'internal',
        required_before_release: input.requiredBeforeRelease ?? false,
        notes: input.notes ?? null,
        created_by: ctx.user.id,
      },
      { onConflict: 'project_id,approval_type' }
    )
  if (error) throw error
}

export async function deleteApprovalPolicy(ctx: WorkbenchCallerContext, policyId: string) {
  const { error } = await ctx.supabase.from('project_approval_policies').delete().eq('id', policyId)
  if (error) throw error
}

export interface AuthorityAssignmentInput {
  userId: string
  approvalType: ApprovalType
  businessFunction?: BusinessFunction | null
  monetaryLimit?: number | null
  discountLimitPercent?: number | null
  conditions?: string | null
  expiresAt?: string | null
  allowSelfApproval?: boolean
}

export async function grantAuthorityAssignment(ctx: WorkbenchCallerContext, projectId: string, input: AuthorityAssignmentInput) {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to manage project governance')

  const { error } = await ctx.supabase.from('project_authority_assignments').insert({
    project_id: projectId,
    user_id: input.userId,
    business_function: input.businessFunction ?? null,
    approval_type: input.approvalType,
    monetary_limit: input.monetaryLimit ?? null,
    discount_limit_percent: input.discountLimitPercent ?? null,
    conditions: input.conditions ?? null,
    effective_from: new Date().toISOString(),
    expires_at: input.expiresAt ?? null,
    status: 'active',
    allow_self_approval: input.allowSelfApproval ?? false,
    granted_by: ctx.user.id,
    granted_at: new Date().toISOString(),
    revoked_by: null,
    revoked_at: null,
    revocation_reason: null,
  })
  if (error) throw error
}

// Revoking preserves the row (status flips to 'revoked' with who/when/why)
// rather than deleting it -- the dev request requires historical decisions
// to remain intelligible even after an authority is revoked, which needs
// the row to still exist once Stage 2 adds decisions that reference it.
export async function revokeAuthorityAssignment(ctx: WorkbenchCallerContext, assignmentId: string, reason: string) {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to manage project governance')

  const { error } = await ctx.supabase
    .from('project_authority_assignments')
    .update({ status: 'revoked', revoked_by: ctx.user.id, revoked_at: new Date().toISOString(), revocation_reason: reason })
    .eq('id', assignmentId)
  if (error) throw error
}

export async function listProjectGovernance(ctx: WorkbenchCallerContext, projectId: string) {
  const [{ data: policies, error: policyError }, { data: assignments, error: assignmentError }] = await Promise.all([
    ctx.supabase.from('project_approval_policies').select('*').eq('project_id', projectId).order('approval_type'),
    ctx.supabase
      .from('project_authority_assignments')
      .select('*')
      .eq('project_id', projectId)
      .order('approval_type')
      .order('granted_at', { ascending: false }),
  ])
  if (policyError) throw policyError
  if (assignmentError) throw assignmentError
  return { policies: policies ?? [], assignments: assignments ?? [] }
}
