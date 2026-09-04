'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { decideProjectJoinRequestAction } from '@/app/actions/join-requests'

export interface JoinRequestRow {
  id: string
  requesterEmail: string
  createdAt: string
}

// Visible only to the project's owner/curator/admin (canCurateWorkstreams on
// the Project page, matching can_curate_project -- see
// project_join_requests_update_manager RLS). Same startTransition/try-catch/
// router.refresh() shape as SourceSubmissionsReview.tsx.
export function JoinRequestsReview({ projectId, requests }: { projectId: string; requests: JoinRequestRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function approve(requestId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await decideProjectJoinRequestAction(projectId, requestId, 'approved')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  function decline(requestId: string) {
    const reason = prompt('Reason for declining this request? (optional)')
    if (reason === null) return
    setError(null)
    startTransition(async () => {
      try {
        await decideProjectJoinRequestAction(projectId, requestId, 'declined', reason || undefined)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  if (requests.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Pending join requests ({requests.length})</h3>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-amber-200 bg-white p-2 text-sm">
            <div>
              <div className="font-medium">{r.requesterEmail}</div>
              <div className="text-xs text-zinc-500">requested {new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => approve(r.id)}
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => decline(r.id)}
                className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
