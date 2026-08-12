'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkRelatedArticleBySlugAction, unlinkRelatedArticleAction } from '@/app/actions/wiki'
import type { WikiArticleStatus } from '@/types/database'

export interface LinkableArticle {
  id: string
  slug: string
  title: string
  status: WikiArticleStatus
}

// Type-to-filter picker over the candidate list (already excludes this
// article and archived ones -- see listArticlesForLinking) instead of typing
// a slug from memory. Selecting a suggestion fills the box with its title
// but tracks the real slug separately, so what actually gets submitted is
// unambiguous even though the box displays a human-readable label.
export function RelatedArticlesManager({
  articleId,
  articles,
  excludeSlugs = [],
}: {
  articleId: string
  articles: LinkableArticle[]
  excludeSlugs?: string[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const candidates = useMemo(() => {
    const excluded = new Set(excludeSlugs)
    return articles.filter((a) => !excluded.has(a.slug))
  }, [articles, excludeSlugs])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates.slice(0, 8)
    const starts = candidates.filter((a) => a.title.toLowerCase().startsWith(q) || a.slug.toLowerCase().startsWith(q))
    const contains = candidates.filter(
      (a) => !starts.includes(a) && (a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q))
    )
    return [...starts, ...contains].slice(0, 8)
  }, [candidates, query])

  function selectArticle(a: LinkableArticle) {
    setQuery(a.title)
    setSelectedSlug(a.slug)
    setOpen(false)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const slugToLink = selectedSlug ?? query.trim()
    if (!slugToLink) return
    startTransition(async () => {
      try {
        await linkRelatedArticleBySlugAction(articleId, slugToLink)
        setQuery('')
        setSelectedSlug(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link article')
      }
    })
  }

  return (
    <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-1 border-t border-zinc-100 pt-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            placeholder="Search articles by title or slug…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedSlug(null)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-64 rounded border border-zinc-300 px-2 py-1"
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-64 overflow-auto rounded border border-zinc-200 bg-white shadow-sm">
              {matches.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onMouseDown={() => selectArticle(a)}
                    className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-zinc-50"
                  >
                    <span>{a.title}</span>
                    {a.status !== 'approved' && <span className="shrink-0 text-zinc-400">{a.status}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button disabled={isPending || (!selectedSlug && !query.trim())} className="rounded bg-zinc-900 px-2 py-1 font-medium text-white disabled:opacity-50">
          Link
        </button>
      </div>
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
