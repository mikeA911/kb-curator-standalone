'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cloneWorkstreamAction } from '@/app/actions/workstreams'

// Builder Ontology, Part B: duplicates this Workstream's own subtree within
// the same project (sharing its project_objects, no run history copied), so
// two options can be compared side by side. Owner/curator/admin only --
// same bar canEdit already gates this button behind on the Workstream page.
export function CloneWorkstreamButton({ workstreamId }: { workstreamId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClone() {
    if (!window.confirm('Clone this workstream (and any nested workstreams under it) for comparison?')) return
    setError(null)
    startTransition(async () => {
      try {
        const { projectId, workstreamId: cloneId } = await cloneWorkstreamAction(workstreamId)
        router.push(`/projects/${projectId}/workstreams/${cloneId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clone workstream')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={isPending} onClick={handleClone} className="text-sm underline disabled:opacity-50">
        {isPending ? 'Cloning…' : 'Clone this workstream'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
