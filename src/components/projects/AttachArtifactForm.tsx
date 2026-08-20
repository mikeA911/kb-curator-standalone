'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { attachArtifactAction } from '@/app/actions/workstreams'
import type { ArtifactType } from '@/types/database'

// A generic repo URL (or worse, a local path) drifts or breaks -- a PR/commit
// link is durable. Enforced server-side too (attachArtifactAction); this is
// just the fast client-side check.
function isGithubUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname === 'github.com' || u.hostname === 'www.github.com')
  } catch {
    return false
  }
}

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  capability_inventory: 'Capability Inventory',
  endpoint_inventory: 'Endpoint Inventory',
  openapi_spec: 'OpenAPI Spec',
  mcp_server: 'MCP Server',
  evidence_map: 'Evidence Map',
  test_results: 'Test Results',
  findings: 'Findings',
  design_note: 'Design Note',
  implementation_handoff: 'Implementation Handoff',
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
    if (externalUrl.trim() && !isGithubUrl(externalUrl.trim())) {
      setError('Link must be a github.com URL (ideally the PR or commit, not just the repo root)')
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
        <input
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://github.com/org/repo/pull/123 -- the PR or commit, not just the repo root"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
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
