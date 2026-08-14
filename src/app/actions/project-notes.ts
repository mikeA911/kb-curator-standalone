'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, AuthError } from '@/lib/auth'
import { ProjectValidationError } from '@/lib/projects/errors'
import type { ProjectNoteRecipientType } from '@/types/database'

export async function createProjectNoteAction(input: {
  projectId: string
  recipientType: ProjectNoteRecipientType
  recipientUserId?: string | null
  subject: string
  body: string
  contextType?: string | null
  contextId?: string | null
}) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to send a note')
  if (!input.subject.trim()) throw new ProjectValidationError('Subject is required')
  if (!input.body.trim()) throw new ProjectValidationError('Note body is required')
  if (input.recipientType === 'user' && !input.recipientUserId) {
    throw new ProjectValidationError('Choose who this note is addressed to')
  }

  const { data, error } = await supabase
    .from('project_notes')
    .insert({
      project_id: input.projectId,
      author_id: profile.id,
      recipient_type: input.recipientType,
      recipient_user_id: input.recipientType === 'user' ? input.recipientUserId : null,
      subject: input.subject.trim(),
      body: input.body.trim(),
      context_type: input.contextType || null,
      context_id: input.contextId || null,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new ProjectValidationError('Failed to send note')

  revalidatePath(`/projects/${input.projectId}/notes`)
  return { noteId: data.id }
}

export async function replyToProjectNoteAction(noteId: string, body: string) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to reply')
  if (!body.trim()) throw new ProjectValidationError('Reply cannot be empty')

  const { data: note, error: noteError } = await supabase.from('project_notes').select('project_id').eq('id', noteId).single()
  if (noteError || !note) throw noteError ?? new ProjectValidationError('Note not found')

  const { error } = await supabase.from('project_note_replies').insert({
    note_id: noteId,
    author_id: profile.id,
    body: body.trim(),
  })
  if (error) throw error

  revalidatePath(`/projects/${note.project_id}/notes/${noteId}`)
}

// Resolve is the only mutation on a note (project_notes_resolve: author, the
// addressed recipient, a curator, or an admin -- doc section 14, literally).
// An UPDATE blocked by RLS matches zero rows rather than erroring, same
// caveat as toggleDeliverableAction (src/app/actions/workstreams.ts).
export async function resolveProjectNoteAction(noteId: string) {
  const { profile, supabase } = await requireUser()

  const { data: note, error: noteError } = await supabase.from('project_notes').select('project_id').eq('id', noteId).single()
  if (noteError || !note) throw noteError ?? new ProjectValidationError('Note not found')

  const { data, error } = await supabase
    .from('project_notes')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: profile.id })
    .eq('id', noteId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new ProjectValidationError('You do not have permission to resolve this note')
  }

  revalidatePath(`/projects/${note.project_id}/notes`)
  revalidatePath(`/projects/${note.project_id}/notes/${noteId}`)
}
