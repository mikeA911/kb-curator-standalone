'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cloneProjectAction } from '@/app/actions/projects'

// Builder Ontology, Part B: duplicates this Project's own project_objects/
// project_workstreams trees into a brand-new Project (no run history
// copied), so two options can be compared side by side. Owner/curator/admin
// only -- same bar canManage/canCurateWorkstreams already gate this button
// behind on the Project page.
export function CloneProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClone() {
    if (!window.confirm('Clone this project? Domain objects and workstreams are copied; run history is not.')) return
    setError(null)
    startTransition(async () => {
      try {
        const { projectId: cloneId } = await cloneProjectAction(projectId)
        router.push(`/projects/${cloneId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clone project')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={isPending} onClick={handleClone} className="text-sm underline disabled:opacity-50">
        {isPending ? 'Cloning…' : 'Clone this project'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
