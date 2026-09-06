'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createWorkingNoteAction, archiveWorkingKnowledgeItemAction } from '@/app/actions/working-knowledge'
import type { WorkingKnowledgeItemType, WorkingKnowledgeVisibility } from '@/types/database'

export interface WorkingKnowledgeRow {
  id: string
  title: string
  type: WorkingKnowledgeItemType
  visibility: WorkingKnowledgeVisibility
  updatedAt: string
  ownerEmail?: string | null
}

const VISIBILITY_LABEL: Record<WorkingKnowledgeVisibility, string> = {
  private: 'Private',
  shared_selected: 'Shared with selected members',
  shared_project: 'Shared with the project',
}

// Working Knowledge & Research Notebooks Stage 1+2
// (docs/dev-request-project-scoped-working-knowledge-and-research-notebooks.md).
// Visible to any active Project member -- same "member-visible, curator-
// visible-elsewhere" split as SubmitSourceForm.tsx (this is closer to that
// than to SourceSubmissionsReview.tsx, since there's no curator decision
// here at all -- sharing/archiving stays entirely with the notebook's own
// owner). Always marked "Working -- not company-approved"; never an
// approved-evidence surface.
export function WorkingKnowledgePanel({
  projectId,
  mine,
  shared,
}: {
  projectId: string
  mine: WorkingKnowledgeRow[]
  shared: WorkingKnowledgeRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showNewNote, setShowNewNote] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  function handleCreateNote(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createWorkingNoteAction({ projectId, title: title.trim(), content: content.trim() })
        setTitle('')
        setContent('')
        setShowNewNote(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save note')
      }
    })
  }

  function archive(itemId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await archiveWorkingKnowledgeItemAction(projectId, itemId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive')
      }
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Working Knowledge</h2>
      <p className="text-xs text-zinc-500">
        Your own research notebooks and working notes for this project -- always <span className="font-medium text-amber-700">working, not company-approved</span>{' '}
        until a curator reviews and approves a submission built from one.
      </p>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Yours</h3>
        {mine.length === 0 ? (
          <p className="text-sm text-zinc-500">No Working Knowledge yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 bg-white p-2 text-sm">
                <div>
                  <Link href={`/projects/${projectId}/working-knowledge/${item.id}`} className="font-medium underline">
                    {item.title}
                  </Link>
                  <div className="text-xs text-zinc-500">
                    {item.type === 'research_notebook' ? 'Research notebook' : 'Working note'} · {VISIBILITY_LABEL[item.visibility]} · updated{' '}
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => archive(item.id)}
                  className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Archive
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {shared.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Shared with you</h3>
          <ul className="flex flex-col gap-2">
            {shared.map((item) => (
              <li key={item.id} className="rounded border border-zinc-200 bg-white p-2 text-sm">
                <Link href={`/projects/${projectId}/working-knowledge/${item.id}`} className="font-medium underline">
                  {item.title}
                </Link>
                <div className="text-xs text-zinc-500">
                  {item.type === 'research_notebook' ? 'Research notebook' : 'Working note'} · shared by {item.ownerEmail ?? 'a project member'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showNewNote ? (
        <form onSubmit={handleCreateNote} className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to keep track of?"
            required
            rows={4}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <button disabled={isPending} className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              Save note
            </button>
            <button type="button" onClick={() => setShowNewNote(false)} className="text-xs text-zinc-400 underline hover:text-zinc-600">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewNote(true)}
          className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          + Add a working note
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
