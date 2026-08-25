'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import * as evidenceAccess from '@/lib/projects/evidence-access'
import type { AccessGroupInput, ClassifyResourceInput } from '@/lib/projects/evidence-access'

export async function createAccessGroupAction(projectId: string, input: AccessGroupInput) {
  const ctx = await requireUser()
  await evidenceAccess.createAccessGroup(ctx, projectId, input)
  revalidatePath(`/projects/${projectId}/access`)
}

export async function grantGroupMembershipAction(projectId: string, projectAccessGroupId: string, projectMemberId: string) {
  const ctx = await requireUser()
  await evidenceAccess.grantGroupMembership(ctx, projectId, projectAccessGroupId, projectMemberId)
  revalidatePath(`/projects/${projectId}/access`)
}

export async function revokeGroupMembershipAction(projectId: string, groupMemberId: string, reason: string) {
  const ctx = await requireUser()
  await evidenceAccess.revokeGroupMembership(ctx, projectId, groupMemberId, reason)
  revalidatePath(`/projects/${projectId}/access`)
}

export async function classifyResourceAction(projectId: string, input: ClassifyResourceInput) {
  const ctx = await requireUser()
  await evidenceAccess.classifyResource(ctx, projectId, input)
  revalidatePath(`/projects/${projectId}/access`)
  revalidatePath(`/projects/${projectId}`)
}

export async function revokeResourceAccessAction(projectId: string, grantId: string, reason: string) {
  const ctx = await requireUser()
  await evidenceAccess.revokeResourceAccess(ctx, projectId, grantId, reason)
  revalidatePath(`/projects/${projectId}/access`)
}
