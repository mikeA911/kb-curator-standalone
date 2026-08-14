'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { replyToProjectNoteAction, resolveProjectNoteAction } from '@/app/actions/project-notes'
import type { ProjectNoteReplyWithAuthor } from '@/lib/projects/notes'

export function ProjectNoteThread({
  noteId,
  status,
  canResolve,
  replies,
}: {
  noteId: string
  status: 'open' | 'resolved'
  canResolve: boolean
  replies: ProjectNoteReplyWithAuthor[]
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await replyToProjectNoteAction(noteId, body)
        setBody('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reply')
      }
    })
  }

  function handleResolve() {
    setError(null)
    startTransition(async () => {
      try {
        await resolveProjectNoteAction(noteId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {replies.map((r) => (
          <li key={r.id} className="rounded border border-zinc-100 bg-zinc-50 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-zinc-800">{r.author?.email ?? 'Unknown'}</span>
              <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-zinc-700">{r.body}</p>
          </li>
        ))}
        {replies.length === 0 && <p className="text-sm text-zinc-500">No replies yet.</p>}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {status === 'open' && (
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleReply} className="flex flex-1 flex-col gap-2">
            <textarea
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Reply…"
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            <button disabled={isPending || !body.trim()} className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {isPending ? 'Posting…' : 'Reply'}
            </button>
          </form>
          {canResolve && (
            <button
              disabled={isPending}
              onClick={handleResolve}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-green-700 disabled:opacity-50"
            >
              Mark resolved
            </button>
          )}
        </div>
      )}
    </div>
  )
}
