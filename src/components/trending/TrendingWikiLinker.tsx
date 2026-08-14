'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkTrendingToWikiAction } from '@/app/actions/trending'
import type { WikiArticleStatus } from '@/types/database'

export interface LinkableWikiArticle {
  id: string
  slug: string
  title: string
  status: WikiArticleStatus
}

// Same type-to-filter picker as RelatedArticlesManager
// (src/components/wiki/RelatedArticlesManager.tsx), sourced from
// listWikiArticlesForLinking instead -- linking FROM a Trending item, so
// there's no "exclude self" id, just already-linked articles to exclude.
export function TrendingWikiLinker({
  trendingItemId,
  articles,
  excludeSlugs = [],
}: {
  trendingItemId: string
  articles: LinkableWikiArticle[]
  excludeSlugs?: string[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
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

  function selectArticle(a: LinkableWikiArticle) {
    setQuery(a.title)
    setSelectedId(a.id)
    setOpen(false)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedId) return
    startTransition(async () => {
      try {
        await linkTrendingToWikiAction(trendingItemId, selectedId)
        setQuery('')
        setSelectedId(null)
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
            placeholder="Search Wiki articles by title or slug…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedId(null)
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
        <button disabled={isPending || !selectedId} className="rounded bg-zinc-900 px-2 py-1 font-medium text-white disabled:opacity-50">
          Link
        </button>
      </div>
      {error && <span className="text-red-600">{error}</span>}
    </form>
  )
}
