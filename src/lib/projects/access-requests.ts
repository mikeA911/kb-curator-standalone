import 'server-only'
import { AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProjectValidationError } from '@/lib/projects/errors'
import { createProjectNote } from '@/lib/projects/notes'
import { grantResourceAccessToMember } from '@/lib/projects/evidence-access'
import type { EvidenceResourceType, ProjectNoteRecipientType, ResourceAccessRequestStatus } from '@/types/database'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// Locked sources for restricted project members, with a request/approve/
// reject flow -- the counterpart to Project Evidence Access Controls
// (src/lib/projects/evidence-access.ts) for the member on the wrong side of
// a restriction. The notification itself reuses project_notes; the request/
// decision record lives in resource_access_requests
// (20260901130001_resource_access_requests.sql).

export async function requestResourceAccess(
  ctx: WorkbenchCallerContext,
  input: { projectId: string; resourceType: EvidenceResourceType; resourceId: string }
): Promise<{ requestId: string; alreadyRequested: boolean }> {
  const { profile, supabase, user } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to request access')

  // Idempotency guard, same shape as requestProjectMembershipAction
  // (src/app/actions/project-notes.ts) -- allowed through the caller's own
  // client by resource_access_requests_select_own_or_manager's
  // "requester_id = auth.uid()" arm, no can_manage_project needed here.
  const { data: existing, error: existingError } = await supabase
    .from('resource_access_requests')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('resource_type', input.resourceType)
    .eq('resource_id', input.resourceId)
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return { requestId: existing.id, alreadyRequested: true }

  // Admin client -- resource_access_policies/projects.owner_id resolution
  // needs to work for a requester who, by definition, has no
  // can_manage_project access to read resource_access_policies themselves.
  // Same fallback order as requestProjectMembershipAction: a named steward,
  // else the Project owner, else any curator/admin.
  const admin = createAdminClient()
  const [{ data: policy }, { data: project }] = await Promise.all([
    admin
      .from('resource_access_policies')
      .select('access_steward_user_id')
      .eq('resource_type', input.resourceType)
      .eq('resource_id', input.resourceId)
      .maybeSingle(),
    admin.from('projects').select('owner_id').eq('id', input.projectId).single(),
  ])

  let recipientType: ProjectNoteRecipientType = 'curator'
  let recipientUserId: string | null = null
  if (policy?.access_steward_user_id) {
    recipientType = 'user'
    recipientUserId = policy.access_steward_user_id
  } else if (project?.owner_id) {
    recipientType = 'user'
    recipientUserId = project.owner_id
  }

  const { data: request, error: requestError } = await supabase
    .from('resource_access_requests')
    .insert({ project_id: input.projectId, resource_type: input.resourceType, resource_id: input.resourceId, requester_id: user.id })
    .select('id')
    .single()
  if (requestError || !request) throw requestError ?? new ProjectValidationError('Failed to create access request')

  const { noteId } = await createProjectNote(supabase, profile, {
    projectId: input.projectId,
    recipientType,
    recipientUserId,
    subject: 'Source access request',
    body: `${profile.email ?? 'A project member'} has requested access to a restricted ${input.resourceType.replace('_', ' ')}. Approve or reject from this note.`,
    contextType: 'resource_access_request',
    contextId: request.id,
  })

  // resource_access_requests_update_manager is can_manage_project-only, so
  // the requester's own client can't attach note_id to their own row --
  // admin client for this one bookkeeping write, not a decision.
  const { error: updateError } = await admin.from('resource_access_requests').update({ note_id: noteId }).eq('id', request.id)
  if (updateError) throw updateError

  return { requestId: request.id, alreadyRequested: false }
}

export async function decideResourceAccessRequest(
  ctx: WorkbenchCallerContext,
  input: { requestId: string; decision: Extract<ResourceAccessRequestStatus, 'approved' | 'denied'>; reason?: string }
): Promise<void> {
  const { profile, supabase, user } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to decide an access request')

  const { data: request, error: requestError } = await supabase.from('resource_access_requests').select('*').eq('id', input.requestId).single()
  if (requestError || !request) throw requestError ?? new ProjectValidationError('Request not found')
  // A stale double-click on an already-decided request is a no-op, not an
  // error -- the buttons only render for a pending request, but two staff
  // members (or two tabs) can race to decide the same one.
  if (request.status !== 'pending') return

  if (input.decision === 'approved') {
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', request.project_id)
      .eq('user_id', request.requester_id)
      .eq('status', 'active')
      .maybeSingle()
    if (memberError) throw memberError

    if (member) {
      const { data: policy, error: policyError } = await supabase
        .from('resource_access_policies')
        .select('id')
        .eq('resource_type', request.resource_type)
        .eq('resource_id', request.resource_id)
        .maybeSingle()
      if (policyError) throw policyError

      // No policy row means the resource has since been reclassified back to
      // project_general -- already open to everyone, nothing left to grant.
      if (policy) {
        await grantResourceAccessToMember(ctx, {
          projectId: request.project_id,
          resourceAccessPolicyId: policy.id,
          projectMemberId: member.id,
          resourceType: request.resource_type,
          resourceId: request.resource_id,
        })
      }
    }
    // else: the requester is no longer an active project member -- record
    // the approval decision below without a grant to attach it to.
  }

  const { data: updated, error: updateError } = await supabase
    .from('resource_access_requests')
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

  // Resolve the original decision note -- same resolve semantics as
  // resolveProjectNoteAction (src/app/actions/project-notes.ts).
  if (request.note_id) {
    await supabase
      .from('project_notes')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', request.note_id)
  }

  const approved = input.decision === 'approved'
  const { noteId: outcomeNoteId } = await createProjectNote(supabase, profile, {
    projectId: request.project_id,
    recipientType: 'user',
    recipientUserId: request.requester_id,
    subject: approved ? 'Access request approved' : 'Access request denied',
    body: approved
      ? `${profile.email ?? 'A project manager'} approved your access request.`
      : `${profile.email ?? 'A project manager'} denied your access request.${input.reason?.trim() ? ` Reason: ${input.reason.trim()}` : ''}`,
    contextType: 'resource_access_request',
    contextId: request.id,
  })

  await supabase.from('resource_access_requests').update({ outcome_note_id: outcomeNoteId }).eq('id', request.id)
}
