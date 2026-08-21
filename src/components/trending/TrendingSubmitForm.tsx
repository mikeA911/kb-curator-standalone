'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitTrendingItemAction } from '@/app/actions/trending'

export function TrendingSubmitForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter()
  const [sourceUrl, setSourceUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!sourceUrl.trim() || !title.trim() || !description.trim()) {
      setError('URL, title, and why it matters are all required')
      return
    }
    startTransition(async () => {
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
          confirmDuplicate,
        })
        if (result.status === 'duplicate') {
          setError(`This looks like a duplicate of "${result.existingTitle}". Submit again to add it anyway.`)
          setConfirmDuplicate(true)
          return
        }
        router.push(`/trending/${result.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">URL *</span>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => {
            setSourceUrl(e.target.value)
            // A changed URL needs a fresh duplicate check, not the earlier confirmation.
            setConfirmDuplicate(false)
          }}
          placeholder="https://…"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Title *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Why does this matter? *</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Source / publisher</span>
        <input
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="e.g. ACL, arXiv, a company blog"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      {projects.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Project (optional)</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            <option value="">None &mdash; visible to all Workbench users</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Tags (comma-separated, optional)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="RAG, Evaluation, Retrieval"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button disabled={isPending} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {isPending ? 'Submitting…' : confirmDuplicate ? 'Submit anyway' : 'Submit to Trending'}
      </button>
    </form>
  )
}
