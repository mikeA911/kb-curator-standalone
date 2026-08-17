'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { activateAssessmentVersionAction, retireAssessmentVersionAction } from '@/app/actions/assessments'
import type { SystemAssessmentVersionStatus } from '@/types/database'

export function AssessmentVersionActions({
  projectId,
  assessmentId,
  versionId,
  status,
}: {
  projectId: string
  assessmentId: string
  versionId: string
  status: SystemAssessmentVersionStatus
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      {status === 'draft' && (
        <button
          disabled={isPending}
          onClick={() => run(() => activateAssessmentVersionAction(assessmentId, versionId))}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Activate this version
        </button>
      )}
      {status === 'active' && (
        <button
          disabled={isPending}
          onClick={() => {
            if (!confirm('Retire this version? It will stop accepting new responses.')) return
            run(() => retireAssessmentVersionAction(versionId, projectId))
          }}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
        >
          Retire this version
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
