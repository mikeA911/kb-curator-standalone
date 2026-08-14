'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { commentOnTrendingItemAction } from '@/app/actions/trending'
import type { TrendingCommentWithAuthor } from '@/lib/trending/queries'

export function TrendingComments({ trendingItemId, comments }: { trendingItemId: string; comments: TrendingCommentWithAuthor[] }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await commentOnTrendingItemAction(trendingItemId, body)
        setBody('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to comment')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded border border-zinc-100 bg-zinc-50 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-zinc-800">{c.author?.email ?? 'Unknown'}</span>
              <span className="text-xs text-zinc-400">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-zinc-700">{c.body}</p>
          </li>
        ))}
        {comments.length === 0 && <p className="text-sm text-zinc-500">No comments yet.</p>}
      </ul>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={isPending || !body.trim()} className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {isPending ? 'Posting…' : 'Comment'}
        </button>
      </form>
    </div>
  )
}
