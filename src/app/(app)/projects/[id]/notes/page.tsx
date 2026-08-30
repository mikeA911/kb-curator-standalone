import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listProjectNotes } from '@/lib/projects/notes'
import { ProjectNoteForm } from '@/components/projects/ProjectNoteForm'
import type { ProjectNoteStatus } from '@/types/database'

function recipientLabel(note: { recipient_type: string; recipientUser: { email: string | null } | null }) {
  switch (note.recipient_type) {
    case 'user':
      return note.recipientUser?.email ?? 'a member'
    case 'curator':
      return 'curators'
    case 'admin':
      return 'admins'
    default:
      return 'the whole team'
  }
}

export default async function ProjectNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: ProjectNoteStatus; contextType?: string; contextId?: string; to?: string }>
}) {
  const { id } = await params
  const { status = 'open', contextType, contextId, to } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  if (!project) notFound()

  // Only active members are valid note recipients (project_notes_insert_member's
  // RLS already enforces this at insert time via is_project_member) -- excluding
  // inactive members here keeps the picker from offering a choice that would
  // just fail on submit.
  const { data: memberRows } = await supabase.from('project_members').select('user_id').eq('project_id', id).eq('status', 'active')
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', (memberRows ?? []).map((m) => m.user_id))
  const members = (profiles ?? [])
    .filter((p) => p.email)
    .map((p) => ({ userId: p.id, email: p.email as string }))

  const notes = await listProjectNotes(supabase, id, { status })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm underline">
          &larr; {project.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Notes</h1>
      </div>

      <ProjectNoteForm projectId={id} members={members} prefillContextType={contextType} prefillContextId={contextId} prefillRecipientUserId={to} />

      <div className="flex gap-2 text-sm">
        <Link
          href={`/projects/${id}/notes?status=open`}
          className={`rounded-full px-3 py-1 ${status === 'open' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
        >
          Open
        </Link>
        <Link
          href={`/projects/${id}/notes?status=resolved`}
          className={`rounded-full px-3 py-1 ${status === 'resolved' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
        >
          Resolved
        </Link>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-zinc-500">No {status} notes.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <Link href={`/projects/${id}/notes/${note.id}`} className="block rounded border border-zinc-200 bg-white p-3 hover:border-zinc-400">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{note.subject}</span>
                  <span className="text-xs text-zinc-400">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {note.author?.email ?? 'Unknown'} &rarr; {recipientLabel(note)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
