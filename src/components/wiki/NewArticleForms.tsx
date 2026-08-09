'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiCategory, WikiCategoryId } from '@/types/database'
import { createManualArticleAction, createAIAssistedDraftAction } from '@/app/actions/wiki'

interface ApprovedChunk {
  id: string
  chunk_text: string
  source_page: number | null
  document_id: string
  document: { original_filename: string; doc_type: string } | null
}

export function NewArticleForms({
  categories,
  approvedChunks,
}: {
  categories: WikiCategory[]
  approvedChunks: ApprovedChunk[]
}) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => setMode('manual')}
          className={`rounded-full px-3 py-1 ${mode === 'manual' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
        >
          Manual article
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`rounded-full px-3 py-1 ${mode === 'ai' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
        >
          AI-assisted draft
        </button>
      </div>

      {mode === 'manual' ? (
        <ManualForm categories={categories} />
      ) : (
        <AIAssistedForm categories={categories} approvedChunks={approvedChunks} />
      )}
    </div>
  )
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function ManualForm({ categories }: { categories: WikiCategory[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [category, setCategory] = useState<WikiCategoryId>(categories[0]?.id ?? 'foundations')
  const [shortDescription, setShortDescription] = useState('')
  const [quickHelp, setQuickHelp] = useState('')
  const [content, setContent] = useState('')
  const [implementationNotes, setImplementationNotes] = useState('')
  const [limitations, setLimitations] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await createManualArticleAction({
        title,
        slug: slug || slugify(title),
        category,
        shortDescription,
        quickHelp,
        content,
        implementationNotes,
        limitations,
        knowledgeBaseId: null,
      })
      router.push(`/wiki/${result.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create article')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title">
        <input required value={title} onChange={(e) => handleTitleChange(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </Field>
      <Field label="Slug (URL — /wiki/…)">
        <input
          required
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value))
            setSlugEdited(true)
          }}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono"
        />
      </Field>
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value as WikiCategoryId)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Short description">
        <input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </Field>
      <Field label="Quick help (shown in contextual help tooltips)">
        <textarea required rows={2} value={quickHelp} onChange={(e) => setQuickHelp(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </Field>
      <Field label="Content (markdown — What it is / Why it matters / How it works / …)">
        <textarea required rows={12} value={content} onChange={(e) => setContent(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono" />
      </Field>
      <Field label="Implementation notes (optional)">
        <textarea rows={3} value={implementationNotes} onChange={(e) => setImplementationNotes(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </Field>
      <Field label="Limitations (optional)">
        <textarea rows={3} value={limitations} onChange={(e) => setLimitations(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Creating…' : 'Create draft'}
      </button>
    </form>
  )
}

function AIAssistedForm({ categories, approvedChunks }: { categories: WikiCategory[]; approvedChunks: ApprovedChunk[] }) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState<WikiCategoryId>(categories[0]?.id ?? 'foundations')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (selected.size === 0) {
      setError('Select at least one approved chunk as source evidence')
      return
    }
    setSubmitting(true)
    try {
      const result = await createAIAssistedDraftAction({ topic, category, chunkIds: [...selected] })
      router.push(`/wiki/${result.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Topic">
        <input required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Hybrid Retrieval" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </Field>
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value as WikiCategoryId)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label={`Source chunks (${selected.size} selected — only approved chunks are eligible)`}>
        <div className="max-h-72 overflow-y-auto rounded border border-zinc-300">
          {approvedChunks.length === 0 && <p className="p-3 text-sm text-zinc-500">No approved chunks yet.</p>}
          {approvedChunks.map((chunk) => (
            <label key={chunk.id} className="flex cursor-pointer items-start gap-2 border-b border-zinc-100 p-2 text-sm last:border-0 hover:bg-zinc-50">
              <input type="checkbox" checked={selected.has(chunk.id)} onChange={() => toggle(chunk.id)} className="mt-1" />
              <span>
                <span className="block text-xs text-zinc-500">
                  {chunk.document?.original_filename ?? 'Unknown document'}
                  {chunk.source_page ? ` · page ${chunk.source_page}` : ''}
                </span>
                <span className="line-clamp-2 text-zinc-700">{chunk.chunk_text}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Generating draft…' : 'Generate draft'}
      </button>
      <p className="text-xs text-zinc-500">
        The AI proposes a draft from the selected evidence. It always lands as a draft — nothing is published automatically.
      </p>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}
