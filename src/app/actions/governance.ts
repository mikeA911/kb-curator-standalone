'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import * as workbench from '@/lib/workbench/governance'
import type { ApprovalPolicyInput, AuthorityAssignmentInput } from '@/lib/workbench/governance'

export async function upsertApprovalPolicyAction(projectId: string, input: ApprovalPolicyInput) {
  const ctx = await requireUser()
  await workbench.upsertApprovalPolicy(ctx, projectId, input)
  revalidatePath(`/projects/${projectId}/governance`)
  revalidatePath(`/projects/${projectId}`)
}

export async function deleteApprovalPolicyAction(policyId: string, projectId: string) {
  const ctx = await requireUser()
  await workbench.deleteApprovalPolicy(ctx, policyId)
  revalidatePath(`/projects/${projectId}/governance`)
  revalidatePath(`/projects/${projectId}`)
}

export async function grantAuthorityAssignmentAction(projectId: string, input: AuthorityAssignmentInput) {
  const ctx = await requireUser()
  await workbench.grantAuthorityAssignment(ctx, projectId, input)
  revalidatePath(`/projects/${projectId}/governance`)
  revalidatePath(`/projects/${projectId}`)
}

export async function revokeAuthorityAssignmentAction(assignmentId: string, projectId: string, reason: string) {
  const ctx = await requireUser()
  await workbench.revokeAuthorityAssignment(ctx, assignmentId, reason)
  revalidatePath(`/projects/${projectId}/governance`)
  revalidatePath(`/projects/${projectId}`)
}
