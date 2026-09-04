import 'server-only'
import { AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProjectValidationError } from '@/lib/projects/errors'
import { createProjectNote } from '@/lib/projects/notes'
import type { ProjectJoinRequestStatus } from '@/types/database'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// A non-member requesting to join a Project (OR-036) -- the counterpart to
// resource_access_requests (src/lib/projects/access-requests.ts) for
// membership itself rather than access to one restricted resource. Structured
// line-for-line on that file's request/decide split, with one deliberate
// difference: the requester here is, by definition, not yet a project
// member, so project_notes_insert_member/_curator_or_admin (which
// createProjectNote's normal call site relies on) don't cover them --
// notification/outcome notes are written via the admin client instead of
// the caller's own client, the same "one narrow privileged bookkeeping
// write" pattern access-requests.ts already uses for attaching note_id.

export async function requestProjectJoin(
  ctx: WorkbenchCallerContext,
  input: { projectId: string; reason?: string }
): Promise<{ requestId: string; alreadyRequested: boolean }> {
  const { profile, supabase, user } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to request to join a project')

  // Idempotency guard -- readable through the caller's own client via
  // project_join_requests_select_own_or_manager's "requester_id = auth.uid()"
  // arm even before they're a member.
  const { data: existing, error: existingError } = await supabase
    .from('project_join_requests')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return { requestId: existing.id, alreadyRequested: true }

  const { data: existingMembership, error: membershipError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (membershipError) throw membershipError
  if (existingMembership) throw new ProjectValidationError('You are already a member of this project')

  // Admin client -- discoverability/owner resolution needs to work for a
  // requester who, by definition, has no RLS path to read the projects row
  // yet if they aren't already visible to it some other way.
  const admin = createAdminClient()
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('owner_id, discoverability, name')
    .eq('id', input.projectId)
    .maybeSingle()
  if (projectError) throw projectError
  if (!project || project.discoverability !== 'platform') {
    throw new ProjectValidationError('This project is not open to join requests')
  }

  const { data: request, error: requestError } = await supabase
    .from('project_join_requests')
    .insert({ project_id: input.projectId, requester_id: user.id })
    .select('id')
    .single()
  if (requestError || !request) throw requestError ?? new ProjectValidationError('Failed to create join request')

  const { noteId } = await createProjectNote(admin, profile, {
    projectId: input.projectId,
    recipientType: project.owner_id ? 'user' : 'curator',
    recipientUserId: project.owner_id,
    subject: 'Join request',
    body: `${profile.email ?? 'A user'} has requested to join ${project.name}.${input.reason?.trim() ? ` Reason: ${input.reason.trim()}` : ''} Approve or decline from this note.`,
    contextType: 'project_join_request',
    contextId: request.id,
  })

  const { error: updateError } = await admin.from('project_join_requests').update({ note_id: noteId }).eq('id', request.id)
  if (updateError) throw updateError

  return { requestId: request.id, alreadyRequested: false }
}

export async function decideProjectJoinRequest(
  ctx: WorkbenchCallerContext,
  input: { requestId: string; decision: Extract<ProjectJoinRequestStatus, 'approved' | 'declined'>; reason?: string }
): Promise<void> {
  const { profile, supabase, user } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to decide a join request')

  const { data: request, error: requestError } = await supabase.from('project_join_requests').select('*').eq('id', input.requestId).single()
  if (requestError || !request) throw requestError ?? new ProjectValidationError('Request not found')
  // A stale double-click on an already-decided request is a no-op, not an
  // error -- the buttons only render for a pending request, but two staff
  // members (or two tabs) can race to decide the same one.
  if (request.status !== 'pending') return

  if (input.decision === 'approved') {
    // Approval always grants the lowest ordinary Project role ('viewer') --
    // never platform authority, and never a higher Project role, which
    // stays a separate explicit assignment by an authorized person.
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({ project_id: request.project_id, user_id: request.requester_id, role: 'viewer', status: 'active' })
    // A unique-constraint race (the requester was independently added as a
    // member between request and decision) is not a failure -- just skip
    // re-inserting, same "no-op on stale state" spirit as the pending guard
    // above.
    if (memberError && memberError.code !== '23505') throw memberError
  }

  const { data: updated, error: updateError } = await supabase
    .from('project_join_requests')
    .update({
      status: input.decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      decision_reason: input.reason?.trim() || null,
    })
    .eq('id', input.requestId)
    .select('id')
  if (updateError) throw updateError
  if (!updated || updated.length === 0) {
    throw new ProjectValidationError('You do not have permission to decide this request')
  }

  // Admin client for the notes -- same reason as requestProjectJoin: the
  // requester may not be a project member yet (declined) or has only just
  // become one this same call (approved), so project_notes_insert_member
  // can't be relied on for either the resolve-original-note write or the
  // outcome note.
  const admin = createAdminClient()
  if (request.note_id) {
    await admin.from('project_notes').update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id }).eq('id', request.note_id)
  }

  const approved = input.decision === 'approved'
  const { noteId: outcomeNoteId } = await createProjectNote(admin, profile, {
    projectId: request.project_id,
    recipientType: 'user',
    recipientUserId: request.requester_id,
    subject: approved ? 'Join request approved' : 'Join request declined',
    body: approved
      ? `${profile.email ?? 'A project manager'} approved your request to join this project.`
      : `${profile.email ?? 'A project manager'} declined your request to join this project.${input.reason?.trim() ? ` Reason: ${input.reason.trim()}` : ''}`,
    contextType: 'project_join_request',
    contextId: request.id,
  })

  await admin.from('project_join_requests').update({ outcome_note_id: outcomeNoteId }).eq('id', request.id)
}
