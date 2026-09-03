'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProjectValidationError } from '@/lib/projects/errors'
import { createProjectNote } from '@/lib/projects/notes'
import type { ProjectNoteRecipientType } from '@/types/database'

// Organization Portfolio's "Request membership" (a curator viewing a
// project they're not on, per project_notes_insert_curator_or_admin,
// 20260901120001_project_notes_request_membership.sql -- admins never hit
// this path since they already get a direct "Open workspace" link there).
// Addressed to the project owner when one exists, otherwise any curator/
// admin, matching recipient_type's existing options -- createProjectNote
// itself does the actual RLS-backed insert, no separate service function
// needed for a single fixed-shape note.
export async function requestProjectMembershipAction(projectId: string) {
  const { profile, supabase } = await requireUser()
  if (profile.role !== 'curator' && profile.role !== 'admin') {
    throw new ProjectValidationError('Only curators and admins can request membership from the Organization Portfolio')
  }

  // Admin client, not the caller's session client -- projects_select_members
  // RLS scopes SELECT to members/admin, and the whole point of this action
  // is a non-member curator, who could never read this row through their own
  // client. Same narrow "safe metadata via admin client" pattern as
  // getOrganizationPortfolio (src/lib/projects/portfolio.ts) -- owner_id
  // only, nothing content-shaped.
  const { data: project, error: projectError } = await createAdminClient().from('projects').select('owner_id').eq('id', projectId).single()
  if (projectError || !project) throw projectError ?? new ProjectValidationError('Project not found')

  // Idempotency guard, not just the UI's already-sent state -- project_notes_select_own
  // (author_id = auth.uid()) makes this readable through the caller's own
  // client even though they're not a project member. Without this, a
  // second tab, a race with the revalidated page, or a direct call could
  // still fire a duplicate note (and duplicate notification) to the owner.
  const { data: existingRequest, error: existingRequestError } = await supabase
    .from('project_notes')
    .select('id')
    .eq('project_id', projectId)
    .eq('author_id', profile.id)
    .eq('subject', 'Membership request')
    .eq('status', 'open')
    .maybeSingle()
  if (existingRequestError) throw existingRequestError
  if (existingRequest) return

  await createProjectNote(supabase, profile, {
    projectId,
    recipientType: project.owner_id ? 'user' : 'curator',
    recipientUserId: project.owner_id,
    subject: 'Membership request',
    body: `${profile.email ?? 'A staff member'} has requested to join this project. Add them from Members if approved.`,
  })

  revalidatePath('/projects/portfolio')
}

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
  const { noteId } = await createProjectNote(supabase, profile, input)

  revalidatePath(`/projects/${input.projectId}/notes`)
  return { noteId }
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
