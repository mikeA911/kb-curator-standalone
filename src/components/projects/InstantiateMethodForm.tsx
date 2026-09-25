'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { instantiateMethodAsWorkstreamAction } from '@/app/actions/methods'

// Builder Ontology, Part C: Method -> new Workstream in one of the caller's
// own owner/curator Projects. `projects` is pre-filtered to only those the
// caller can actually curate (instantiateMethodAsWorkstream's own bar), so
// every option here is guaranteed to succeed.
export function InstantiateMethodForm({ methodId, projects }: { methodId: string; projects: { id: string; name: string }[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [name, setName] = useState('')

  if (projects.length === 0) {
    return <p className="text-sm text-zinc-500">You need an owner or curator role on a project to instantiate this method.</p>
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError('Workstream name is required')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const result = await instantiateMethodAsWorkstreamAction({ methodId, projectId, name: name.trim() })
        router.push(`/projects/${result.projectId}/workstreams/${result.workstreamId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to instantiate method')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Instantiate this Method</h2>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-zinc-300 px-2 py-1 text-sm">
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="New workstream name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Instantiate'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
