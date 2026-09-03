'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitFileSourceAction, submitArtifactSourceAction } from '@/app/actions/source-submissions'

export interface SubmittableArtifact {
  id: string
  title: string
}

// Visible to any active project member -- submitting a candidate source
// (file or an already-approved workstream artifact) for the project's
// curator/owner to decide on. Real URL-fetching is explicitly out of scope
// for this pass (see the 2026-09-03 plan) -- the URL field here is only a
// citation attached to a file, same as curators already have via
// DocumentUploader.tsx's sourceUrl field.
export function SubmitSourceForm({
  projectId,
  knowledgeBases,
  artifacts,
}: {
  projectId: string
  knowledgeBases: { id: string; name: string }[]
  artifacts: SubmittableArtifact[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [kind, setKind] = useState<'file' | 'artifact'>('file')
  const [knowledgeBaseId, setKnowledgeBaseId] = useState(knowledgeBases[0]?.id ?? '')
  const [artifactId, setArtifactId] = useState(artifacts[0]?.id ?? '')

  if (knowledgeBases.length === 0) {
    return <p className="text-sm text-zinc-500">Attach a project knowledge base above before submitting a source.</p>
  }

  function handleFileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('projectId', projectId)
    formData.set('knowledgeBaseId', knowledgeBaseId)
    startTransition(async () => {
      try {
        await submitFileSourceAction(formData)
        setSubmitted(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed')
      }
    })
  }

  function handleArtifactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!artifactId) return
    setError(null)
    startTransition(async () => {
      try {
        await submitArtifactSourceAction({ projectId, knowledgeBaseId, workstreamArtifactId: artifactId })
        setSubmitted(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed')
      }
    })
  }

  if (submitted) {
    return (
      <p className="text-sm text-emerald-700">
        Submitted -- this project&apos;s curator or owner will review it.{' '}
        <button type="button" onClick={() => setSubmitted(false)} className="underline">
          Submit another
        </button>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Submit a source</h3>
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input type="radio" checked={kind === 'file'} onChange={() => setKind('file')} /> File
          </label>
          {artifacts.length > 0 && (
            <label className="flex items-center gap-1">
              <input type="radio" checked={kind === 'artifact'} onChange={() => setKind('artifact')} /> Workstream artifact
            </label>
          )}
        </div>
      </div>

      <select value={knowledgeBaseId} onChange={(e) => setKnowledgeBaseId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
        {knowledgeBases.map((kb) => (
          <option key={kb.id} value={kb.id}>
            {kb.name}
          </option>
        ))}
      </select>

      {kind === 'file' ? (
        <form onSubmit={handleFileSubmit} className="flex flex-col gap-2">
          <input type="file" name="file" required accept=".pdf,.docx,.txt" className="text-sm" />
          <input name="sourceUrl" type="url" placeholder="Source URL (optional citation)" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
          <button disabled={isPending} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {isPending ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleArtifactSubmit} className="flex flex-col gap-2">
          <select value={artifactId} onChange={(e) => setArtifactId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            {artifacts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <button disabled={isPending || !artifactId} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {isPending ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
