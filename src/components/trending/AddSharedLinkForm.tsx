'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { submitTrendingItemAction } from '@/app/actions/trending'

// Compact, dashboard-embeddable variant of TrendingSubmitForm.tsx -- same
// fields, but self-contained (owns its own open/closed toggle) and stays on
// the dashboard rather than navigating to /trending/[id] on success, per
// the doc's "avoid forcing users through the full Trending page merely to
// contribute a link."
export function AddSharedLinkForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<{ existingItemId: string; existingTitle: string } | null>(null)
  const [success, setSuccess] = useState<{ id: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  function reset() {
    setSourceUrl('')
    setTitle('')
    setDescription('')
    setSourceName('')
    setProjectId('')
    setTags('')
    setError(null)
    setDuplicate(null)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!sourceUrl.trim() || !title.trim() || !description.trim()) {
      setError('URL, title, and why others should read this are all required')
      return
    }
    setIsPending(true)
    try {
      const result = await submitTrendingItemAction({
        title: title.trim(),
        sourceUrl: sourceUrl.trim(),
        sourceName: sourceName.trim() || null,
        description: description.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        projectId: projectId || null,
        confirmDuplicate: !!duplicate,
      })
      if (result.status === 'duplicate') {
        setDuplicate({ existingItemId: result.existingItemId, existingTitle: result.existingTitle })
        return
      }
      setSuccess({ id: result.id })
      // The new entry belongs in the dashboard card's list -- re-fetch the
      // server-rendered data rather than hand-maintaining a client copy.
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add link')
    } finally {
      setIsPending(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        + Add a link
      </button>
    )
  }

  if (success) {
    return (
      <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        <p>
          Link added.{' '}
          <Link href={`/trending/${success.id}`} className="underline">
            View it in Trending
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="mt-2 text-xs text-green-700 underline"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 bg-zinc-50 p-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-700">URL *</span>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => {
            setSourceUrl(e.target.value)
            setDuplicate(null)
          }}
          placeholder="https://…"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-700">Title *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-700">Why should others read this? *</span>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-700">Source / publisher</span>
        <input
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="e.g. ACL, arXiv, a company blog"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </label>
      {projects.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-700">Project (optional)</span>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value)
              setDuplicate(null)
            }}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">None &mdash; visible to all Workbench users</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-700">Tags (comma-separated, optional)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="RAG, Evaluation, Retrieval"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </label>

      {duplicate && (
        <p className="text-xs text-amber-700">
          This looks like a duplicate of{' '}
          <Link href={`/trending/${duplicate.existingItemId}`} className="underline">
            &ldquo;{duplicate.existingTitle}&rdquo;
          </Link>
          . Submit again to add it anyway.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button disabled={isPending} className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {isPending ? 'Adding…' : duplicate ? 'Submit anyway' : 'Add link'}
        </button>
        <button
          type="button"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
