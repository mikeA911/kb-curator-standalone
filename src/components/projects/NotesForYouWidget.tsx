import Link from 'next/link'

export interface NoteForYouRow {
  id: string
  projectId: string
  projectName: string
  subject: string
  authorEmail: string | null
  createdAt: string
}

// Mirrors UnpublishedWikiWidget's shape/placement on the Workbench --
// deliberately narrow to notes authored by or directly addressed to the
// viewer (see listNotesForUser), not everything a curator could see.
export function NotesForYouWidget({ notes }: { notes: NoteForYouRow[] }) {
  return (
    <div className="rounded border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="font-medium">Notes for you</h2>
      </div>
      {notes.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">No open notes right now.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {notes.slice(0, 5).map((note) => (
            <li key={note.id} className="px-4 py-3">
              <Link href={`/projects/${note.projectId}/notes/${note.id}`} className="font-medium hover:underline">
                {note.subject}
              </Link>
              <p className="mt-0.5 text-xs text-zinc-500">
                {note.projectName} · {note.authorEmail ?? 'Unknown'} · {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
