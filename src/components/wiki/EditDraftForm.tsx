'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiVersion } from '@/types/database'
import { editDraftAction } from '@/app/actions/wiki'

function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

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
  const [applicableRoles, setApplicableRoles] = useState((initialVersion?.applicable_roles ?? []).join(', '))
  const [relatedRoutes, setRelatedRoutes] = useState((initialVersion?.related_routes ?? []).join(', '))
  const [applicableVersion, setApplicableVersion] = useState(initialVersion?.applicable_version ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await editDraftAction(articleId, {
        quickHelp,
        content,
        implementationNotes,
        limitations,
        applicableRoles: splitCommaList(applicableRoles),
        relatedRoutes: splitCommaList(relatedRoutes),
        applicableVersion: applicableVersion.trim() || null,
      })
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
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Applicable roles (comma-separated)</span>
        <input value={applicableRoles} onChange={(e) => setApplicableRoles(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Related routes (comma-separated)</span>
        <input value={relatedRoutes} onChange={(e) => setRelatedRoutes(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Applicable version / deployment reference</span>
        <input value={applicableVersion} onChange={(e) => setApplicableVersion(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Saving…' : 'Save as new draft version'}
      </button>
    </form>
  )
}
