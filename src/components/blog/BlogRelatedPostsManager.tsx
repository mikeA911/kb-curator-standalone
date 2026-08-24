'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkRelatedBlogPostAction, unlinkRelatedBlogPostAction } from '@/app/actions/blog'

export interface LinkableBlogPost {
  id: string
  slug: string
  title: string
}

// Mirrors src/components/wiki/RelatedArticlesManager.tsx's type-to-filter
// picker exactly -- candidates are already scoped to published posts (see
// listRelatedBlogPostCandidatesAction), per the dev request's "select
// related published posts while editing."
export function BlogRelatedPostsManager({
  postId,
  posts,
  excludeSlugs = [],
}: {
  postId: string
  posts: LinkableBlogPost[]
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
    return posts.filter((p) => !excluded.has(p.slug))
  }, [posts, excludeSlugs])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates.slice(0, 8)
    const starts = candidates.filter((p) => p.title.toLowerCase().startsWith(q) || p.slug.toLowerCase().startsWith(q))
    const contains = candidates.filter((p) => !starts.includes(p) && (p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)))
    return [...starts, ...contains].slice(0, 8)
  }, [candidates, query])

  function selectPost(p: LinkableBlogPost) {
    setQuery(p.title)
    setSelectedSlug(p.slug)
    setOpen(false)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const slugToLink = selectedSlug ?? query.trim()
    if (!slugToLink) return
    startTransition(async () => {
      try {
        await linkRelatedBlogPostAction(postId, slugToLink)
        setQuery('')
        setSelectedSlug(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link post')
      }
    })
  }

  return (
    <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-1 border-t border-zinc-100 pt-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            placeholder="Search published posts by title or slug…"
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
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={() => selectPost(p)}
                    className="flex w-full items-center px-2 py-1.5 text-left hover:bg-zinc-50"
                  >
                    {p.title}
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

export function BlogRelatedPostRemoveButton({ relationId, postId }: { relationId: string; postId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await unlinkRelatedBlogPostAction(relationId, postId)
          router.refresh()
        })
      }
      disabled={isPending}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Remove
    </button>
  )
}
