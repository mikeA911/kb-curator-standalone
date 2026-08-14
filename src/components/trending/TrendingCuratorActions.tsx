'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  markUnderReviewAction,
  archiveTrendingItemAction,
  promoteTrendingToWikiAction,
} from '@/app/actions/trending'
import type { WikiCategory, WikiCategoryId } from '@/types/database'

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface ExistingArticleOption {
  id: string
  title: string
}

export function TrendingCuratorActions({
  trendingItemId,
  status,
  title,
  description,
  categories,
  existingArticles,
}: {
  trendingItemId: string
  status: string
  title: string
  description: string
  categories: WikiCategory[]
  existingArticles: ExistingArticleOption[]
}) {
  const router = useRouter()
  const [showPromote, setShowPromote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runSimple(action: () => Promise<unknown>) {
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

  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Curator</h2>
      <div className="flex flex-wrap gap-2">
        {status !== 'under_review' && (
          <button
            disabled={isPending}
            onClick={() => runSimple(() => markUnderReviewAction(trendingItemId))}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Mark Under Review
          </button>
        )}
        <button
          disabled={isPending}
          onClick={() => setShowPromote((s) => !s)}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {showPromote ? 'Cancel' : 'Promote to Wiki'}
        </button>
        <button
          disabled={isPending}
          onClick={() => {
            if (!confirm('Archive this Trending item?')) return
            runSimple(() => archiveTrendingItemAction(trendingItemId))
          }}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
        >
          Archive
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {showPromote && (
        <PromoteForm
          trendingItemId={trendingItemId}
          title={title}
          description={description}
          categories={categories}
          existingArticles={existingArticles}
          onDone={() => {
            setShowPromote(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function PromoteForm({
  trendingItemId,
  title,
  description,
  categories,
  existingArticles,
  onDone,
}: {
  trendingItemId: string
  title: string
  description: string
  categories: WikiCategory[]
  existingArticles: ExistingArticleOption[]
  onDone: () => void
}) {
  const [mode, setMode] = useState<'new' | 'update'>('new')
  const [articleTitle, setArticleTitle] = useState(title)
  const [slug, setSlug] = useState(slugify(title))
  const [category, setCategory] = useState<WikiCategoryId>(categories[0]?.id ?? 'foundations')
  const [existingArticleId, setExistingArticleId] = useState(existingArticles[0]?.id ?? '')
  const [shortDescription, setShortDescription] = useState(description.slice(0, 160))
  const [quickHelp, setQuickHelp] = useState(description)
  const [content, setContent] = useState(description)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (mode === 'new') {
          await promoteTrendingToWikiAction(trendingItemId, {
            mode: 'new',
            title: articleTitle,
            slug: slug || slugify(articleTitle),
            category,
            shortDescription,
            quickHelp,
            content,
            implementationNotes: '',
            limitations: '',
          })
        } else {
          if (!existingArticleId) {
            setError('Choose an existing article')
            return
          }
          await promoteTrendingToWikiAction(trendingItemId, {
            mode: 'update',
            articleId: existingArticleId,
            quickHelp,
            content,
            implementationNotes: '',
            limitations: '',
          })
        }
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to promote')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('new')}
          className={`rounded-full px-3 py-1 ${mode === 'new' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
        >
          New Wiki article
        </button>
        <button
          type="button"
          disabled={existingArticles.length === 0}
          onClick={() => setMode('update')}
          className={`rounded-full px-3 py-1 disabled:opacity-40 ${mode === 'update' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
        >
          Update existing article
        </button>
      </div>

      {mode === 'new' ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Title</span>
            <input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Slug</span>
            <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="rounded border border-zinc-300 px-3 py-2 font-mono" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as WikiCategoryId)} className="rounded border border-zinc-300 px-3 py-2">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Short description</span>
            <input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Existing article</span>
          <select value={existingArticleId} onChange={(e) => setExistingArticleId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2">
            {existingArticles.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Quick help</span>
        <textarea rows={2} value={quickHelp} onChange={(e) => setQuickHelp(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Content</span>
        <textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-zinc-500">
        This creates a new draft version and submits it for review &mdash; the currently approved Wiki content (if any) stays live
        until an admin approves this draft, same as any other Wiki edit.
      </p>
      <button disabled={isPending} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {isPending ? 'Submitting…' : 'Create draft & submit for review'}
      </button>
    </form>
  )
}
