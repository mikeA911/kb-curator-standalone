'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveWorkstreamPromotionAction, rejectWorkstreamPromotionAction } from '@/app/actions/workstream-promotions'
import type { PendingWorkstreamPromotionRow } from '@/lib/workbench/workstream-promotions'

// Review queue for workstream promotions -- same approve/reject shape as
// SourceSubmissionsReview.tsx. Reused in two places: scoped to one Project
// on that Project's own page (projectId passed -- the primary path for an
// ordinary team's own curator, e.g. an HR Manager, who may have no /admin
// access at all), and platform-wide on the /admin "Workstream Promotions"
// tab (projectId omitted).
export function WorkstreamPromotionsReview({ promotions, projectId }: { promotions: PendingWorkstreamPromotionRow[]; projectId?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function approve(promotionId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await approveWorkstreamPromotionAction(promotionId, projectId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  function reject(promotionId: string) {
    const reason = prompt('Reason for rejecting this promotion? (optional)')
    if (reason === null) return
    setError(null)
    startTransition(async () => {
      try {
        await rejectWorkstreamPromotionAction(promotionId, reason || undefined, projectId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  if (promotions.length === 0) {
    return <p className="text-sm text-zinc-500">No pending workstream promotions.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {promotions.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 bg-white p-3 text-sm">
            <div>
              <div className="font-medium">{p.workstreamName}</div>
              <div className="text-xs text-zinc-500">
                {p.projectName} · submitted by {p.submitterEmail ?? 'unknown'} · {p.approvedArtifactCount} approved artifact
                {p.approvedArtifactCount === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => approve(p.id)}
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => reject(p.id)}
                className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
