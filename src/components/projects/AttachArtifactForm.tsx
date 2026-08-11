'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { attachArtifactAction } from '@/app/actions/workstreams'
import type { ArtifactType } from '@/types/database'

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  capability_inventory: 'Capability inventory',
  openapi_spec: 'OpenAPI spec',
  mcp_server: 'MCP server',
  test_results: 'Test results',
  findings: 'Findings',
  other: 'Other',
}

export function AttachArtifactForm({ workstreamId }: { workstreamId: string }) {
  const router = useRouter()
  const [artifactType, setArtifactType] = useState<ArtifactType>('findings')
  const [title, setTitle] = useState('')
  const [externalTool, setExternalTool] = useState('')
  const [content, setContent] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim() && !externalUrl.trim()) {
      setError('Provide either content or a link')
      return
    }
    setSubmitting(true)
    try {
      await attachArtifactAction({
        workstreamId,
        artifactType,
        title,
        externalTool: externalTool || undefined,
        content: content || undefined,
        externalUrl: externalUrl || undefined,
        notes: notes || undefined,
      })
      setTitle('')
      setContent('')
      setExternalUrl('')
      setNotes('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach artifact')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Type</span>
          <select value={artifactType} onChange={(e) => setArtifactType(e.target.value as ArtifactType)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            {Object.entries(ARTIFACT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">External tool</span>
          <input value={externalTool} onChange={(e) => setExternalTool(e.target.value)} placeholder="e.g. Claude Code" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Title</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Onboarding capability inventory" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Content</span>
        <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Findings, a spec excerpt, or any inline text…" className="rounded border border-zinc-300 px-3 py-2 font-mono text-sm" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Link</span>
        <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="Link to the PR/branch/repo where the real artifact lives" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Attaching…' : 'Attach Artifact'}
      </button>
    </form>
  )
}
