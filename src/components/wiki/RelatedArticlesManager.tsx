'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkRelatedArticleBySlugAction, unlinkRelatedArticleAction } from '@/app/actions/wiki'

export function RelatedArticlesManager({ articleId }: { articleId: string }) {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await linkRelatedArticleBySlugAction(articleId, slug.trim())
        setSlug('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link article')
      }
    })
  }

  return (
    <form onSubmit={handleAdd} className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 text-xs">
      <input
        placeholder="related article slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1"
      />
      <button disabled={isPending || !slug} className="rounded bg-zinc-900 px-2 py-1 font-medium text-white disabled:opacity-50">
        Link
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </form>
  )
}

export function RelatedArticleRemoveButton({ relationId }: { relationId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => {
        await unlinkRelatedArticleAction(relationId)
        router.refresh()
      })}
      disabled={isPending}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Remove
    </button>
  )
}
