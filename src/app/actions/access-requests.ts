'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { requestResourceAccess, decideResourceAccessRequest } from '@/lib/projects/access-requests'

export async function requestSourceAccessAction(projectId: string, resourceId: string) {
  const ctx = await requireUser()
  const result = await requestResourceAccess(ctx, { projectId, resourceType: 'knowledge_source', resourceId })
  revalidatePath(`/projects/${projectId}`)
  return result
}

export async function decideResourceAccessRequestAction(projectId: string, requestId: string, decision: 'approved' | 'denied', reason?: string) {
  const ctx = await requireUser()
  await decideResourceAccessRequest(ctx, { requestId, decision, reason })
  revalidatePath(`/projects/${projectId}/notes`)
  revalidatePath(`/projects/${projectId}`)
}
