'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { requestProjectJoin, decideProjectJoinRequest } from '@/lib/projects/join-requests'
import type { ProjectJoinRequestStatus } from '@/types/database'

export async function requestProjectJoinAction(projectId: string, reason?: string) {
  const ctx = await requireUser()
  const result = await requestProjectJoin(ctx, { projectId, reason })
  revalidatePath(`/projects/${projectId}`)
  return result
}

export async function decideProjectJoinRequestAction(
  projectId: string,
  requestId: string,
  decision: Extract<ProjectJoinRequestStatus, 'approved' | 'declined'>,
  reason?: string
) {
  const ctx = await requireUser()
  await decideProjectJoinRequest(ctx, { requestId, decision, reason })
  revalidatePath(`/projects/${projectId}`)
}
