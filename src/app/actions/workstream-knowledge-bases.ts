'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { attachWorkstreamKnowledgeBase, detachWorkstreamKnowledgeBase } from '@/lib/workbench/workstream-knowledge-bases'

export async function attachWorkstreamKnowledgeBaseAction(projectId: string, workstreamId: string, knowledgeBaseId: string, purpose?: string) {
  const ctx = await requireUser()
  await attachWorkstreamKnowledgeBase(ctx, workstreamId, knowledgeBaseId, purpose)
  revalidatePath(`/projects/${projectId}/workstreams/${workstreamId}`)
}

export async function detachWorkstreamKnowledgeBaseAction(projectId: string, workstreamId: string, knowledgeBaseId: string) {
  const ctx = await requireUser()
  await detachWorkstreamKnowledgeBase(ctx, workstreamId, knowledgeBaseId)
  revalidatePath(`/projects/${projectId}/workstreams/${workstreamId}`)
}
