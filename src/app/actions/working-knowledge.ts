'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import {
  createWorkingKnowledgeItem,
  updateWorkingKnowledgeItem,
  archiveWorkingKnowledgeItem,
  shareWorkingKnowledgeItem,
  revokeWorkingKnowledgeShare,
} from '@/lib/projects/working-knowledge'

// Thin Server Action wrappers, same shape as source-submissions.ts --
// requireUser() resolves the caller, the real validation/authorization
// lives in src/lib/projects/working-knowledge.ts (reused by Ember's
// save_working_knowledge tool too).

export async function createWorkingNoteAction(input: { projectId: string; title: string; content: string }) {
  const ctx = await requireUser()
  const result = await createWorkingKnowledgeItem(ctx.supabase, { id: ctx.user.id, role: ctx.profile.role }, {
    projectId: input.projectId,
    type: 'working_note',
    title: input.title,
    content: input.content,
  })
  revalidatePath(`/projects/${input.projectId}`)
  return result
}

export async function updateWorkingKnowledgeItemAction(
  projectId: string,
  itemId: string,
  updates: { title?: string; objective?: string | null; content?: string }
) {
  const ctx = await requireUser()
  await updateWorkingKnowledgeItem(ctx, itemId, updates)
  revalidatePath(`/projects/${projectId}/working-knowledge/${itemId}`)
}

export async function archiveWorkingKnowledgeItemAction(projectId: string, itemId: string) {
  const ctx = await requireUser()
  await archiveWorkingKnowledgeItem(ctx, itemId)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/working-knowledge/${itemId}`)
}

export async function shareWorkingKnowledgeItemAction(projectId: string, itemId: string, recipientUserId: string) {
  const ctx = await requireUser()
  await shareWorkingKnowledgeItem(ctx, itemId, recipientUserId)
  revalidatePath(`/projects/${projectId}/working-knowledge/${itemId}`)
}

export async function revokeWorkingKnowledgeShareAction(projectId: string, itemId: string, shareId: string) {
  const ctx = await requireUser()
  await revokeWorkingKnowledgeShare(ctx, shareId)
  revalidatePath(`/projects/${projectId}/working-knowledge/${itemId}`)
}
