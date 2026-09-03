'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import {
  submitFileSource,
  submitArtifactSource,
  listSourceSubmissions,
  approveSourceSubmission,
  rejectSourceSubmission,
} from '@/lib/workbench/source-submissions'

// FormData, not a plain object, since it carries a File -- same shape as
// uploadAndProcessDocument (src/app/actions/curator.ts).
export async function submitFileSourceAction(formData: FormData) {
  const ctx = await requireUser()
  const projectId = formData.get('projectId') as string | null
  const knowledgeBaseId = formData.get('knowledgeBaseId') as string | null
  const file = formData.get('file') as File | null
  const sourceUrl = (formData.get('sourceUrl') as string | null) || undefined
  if (!projectId) throw new Error('No project specified')
  if (!knowledgeBaseId) throw new Error('No knowledge base selected')
  if (!file || file.size === 0) throw new Error('No file provided')

  const result = await submitFileSource(ctx, { projectId, knowledgeBaseId, file, sourceUrl })
  revalidatePath(`/projects/${projectId}`)
  return result
}

export async function submitArtifactSourceAction(input: { projectId: string; knowledgeBaseId: string; workstreamArtifactId: string }) {
  const ctx = await requireUser()
  const result = await submitArtifactSource(ctx, input)
  revalidatePath(`/projects/${input.projectId}`)
  return result
}

export async function listSourceSubmissionsAction(projectId: string) {
  const ctx = await requireUser()
  return listSourceSubmissions(ctx, projectId)
}

export async function approveSourceSubmissionAction(projectId: string, submissionId: string) {
  const ctx = await requireUser()
  await approveSourceSubmission(ctx, submissionId)
  revalidatePath(`/projects/${projectId}`)
}

export async function rejectSourceSubmissionAction(projectId: string, submissionId: string, reason?: string) {
  const ctx = await requireUser()
  await rejectSourceSubmission(ctx, submissionId, reason)
  revalidatePath(`/projects/${projectId}`)
}
