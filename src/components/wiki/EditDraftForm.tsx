'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiVersion } from '@/types/database'
import { editDraftAction } from '@/app/actions/wiki'

export function EditDraftForm({
  articleId,
  slug,
  initialVersion,
}: {
  articleId: string
  slug: string
  initialVersion: WikiVersion | null
}) {
  const router = useRouter()
  const [quickHelp, setQuickHelp] = useState(initialVersion?.quick_help ?? '')
  const [content, setContent] = useState(initialVersion?.content ?? '')
  const [implementationNotes, setImplementationNotes] = useState(initialVersion?.implementation_notes ?? '')
  const [limitations, setLimitations] = useState(initialVersion?.limitations ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await editDraftAction(articleId, { quickHelp, content, implementationNotes, limitations })
      router.push(`/wiki/${slug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Quick help</span>
        <textarea required rows={2} value={quickHelp} onChange={(e) => setQuickHelp(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Content</span>
        <textarea required rows={16} value={content} onChange={(e) => setContent(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Implementation notes</span>
        <textarea rows={3} value={implementationNotes} onChange={(e) => setImplementationNotes(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Limitations</span>
        <textarea rows={3} value={limitations} onChange={(e) => setLimitations(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Saving…' : 'Save as new draft version'}
      </button>
    </form>
  )
}
