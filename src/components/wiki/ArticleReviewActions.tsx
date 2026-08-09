'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiArticleStatus } from '@/types/database'
import { submitArticleForReviewAction, approveArticleAction, rejectArticleAction, archiveArticleAction } from '@/app/actions/wiki'

export function ArticleReviewActions({
  articleId,
  versionId,
  status,
  isAdmin,
}: {
  articleId: string
  versionId: string
  status: WikiArticleStatus
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  const actions: React.ReactNode[] = []

  if (status === 'draft') {
    actions.push(
      <button
        key="submit"
        disabled={isPending}
        onClick={() => run(() => submitArticleForReviewAction(articleId))}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Submit for review
      </button>
    )
  }

  if (status === 'review' && isAdmin) {
    actions.push(
      <button
        key="approve"
        disabled={isPending}
        onClick={() => run(() => approveArticleAction(articleId, versionId))}
        className="rounded bg-green-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Approve
      </button>,
      <button
        key="reject"
        disabled={isPending}
        onClick={() => run(() => rejectArticleAction(articleId))}
        className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Return to draft
      </button>
    )
  }

  if (status !== 'archived' && isAdmin) {
    actions.push(
      <button
        key="archive"
        disabled={isPending}
        onClick={() => {
          if (!confirm('Archive this article?')) return
          run(() => archiveArticleAction(articleId))
        }}
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Archive
      </button>
    )
  }

  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-white p-4">
      {actions}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
