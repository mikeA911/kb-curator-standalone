import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/types/database'
import { createProjectNote } from '@/lib/projects/notes'

// Workstream Presentation & Review -- notifications reuse the existing
// in-app note system (project_notes / "Notes for You" on the dashboard),
// the established mechanism elsewhere in this app (e.g.
// resource_access_requests in access-requests.ts). There is no email/push
// infrastructure in this codebase at all. createProjectNote inserts one row
// per call, and listNotesForUser only matches notes addressed directly to
// a user (recipient_type='user') -- it does not fan out a broadcast-typed
// note -- so "notify everyone" here means looping once per recipient.

interface NotifyAuthor {
  id: string
  role: UserRole
}

async function resolveWorkstream(
  supabase: SupabaseClient<Database>,
  workstreamId: string
): Promise<{ projectId: string; name: string } | null> {
  const { data, error } = await supabase.from('project_workstreams').select('project_id, name').eq('id', workstreamId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { projectId: data.project_id, name: data.name }
}

// Best-effort/non-fatal per recipient -- a notification failure should
// never block the status transition that already succeeded, same
// convention as transitionPresentationStatus's own history-log try/catch.
// Skips the acting user -- they already know they just did this.
async function notifyRecipients(
  supabase: SupabaseClient<Database>,
  author: NotifyAuthor,
  presentationId: string,
  projectId: string,
  recipientUserIds: string[],
  subject: string,
  body: string
): Promise<void> {
  for (const recipientUserId of recipientUserIds) {
    if (recipientUserId === author.id) continue
    try {
      await createProjectNote(supabase, author, {
        projectId,
        recipientType: 'user',
        recipientUserId,
        subject,
        body,
        contextType: 'presentation',
        contextId: presentationId,
      })
    } catch (err) {
      console.error(`Failed to notify ${recipientUserId} about presentation ${presentationId}:`, err)
    }
  }
}

export async function notifyReviewOpened(
  supabase: SupabaseClient<Database>,
  author: NotifyAuthor,
  input: { presentationId: string; workstreamId: string; reviewDeadline: string | null }
): Promise<void> {
  const workstream = await resolveWorkstream(supabase, input.workstreamId)
  if (!workstream) return
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', workstream.projectId)
    .eq('status', 'active')
  const deadlineText = input.reviewDeadline ? ` Comments are due by ${new Date(input.reviewDeadline).toLocaleDateString()}.` : ''
  await notifyRecipients(
    supabase,
    author,
    input.presentationId,
    workstream.projectId,
    (members ?? []).map((m) => m.user_id),
    'Presentation open for review',
    `${workstream.name}'s presentation is open for review.${deadlineText} Add your comments from the presentation page.`
  )
}

export async function notifySubmittedForCuratorReview(
  supabase: SupabaseClient<Database>,
  author: NotifyAuthor,
  input: { presentationId: string; workstreamId: string }
): Promise<void> {
  const workstream = await resolveWorkstream(supabase, input.workstreamId)
  if (!workstream) return
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', workstream.projectId)
    .eq('status', 'active')
    .in('role', ['owner', 'curator'])
  await notifyRecipients(
    supabase,
    author,
    input.presentationId,
    workstream.projectId,
    (members ?? []).map((m) => m.user_id),
    'Presentation ready for approval',
    `${workstream.name}'s presentation has been submitted for curator review. Approve it from the presentation page.`
  )
}

export async function notifyApproved(
  supabase: SupabaseClient<Database>,
  author: NotifyAuthor,
  input: { presentationId: string; workstreamId: string; createdBy: string | null }
): Promise<void> {
  if (!input.createdBy) return
  const workstream = await resolveWorkstream(supabase, input.workstreamId)
  if (!workstream) return
  await notifyRecipients(
    supabase,
    author,
    input.presentationId,
    workstream.projectId,
    [input.createdBy],
    'Presentation approved',
    `Your presentation for ${workstream.name} has been approved.`
  )
}
