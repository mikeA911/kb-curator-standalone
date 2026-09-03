'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { decideResourceAccessRequestAction } from '@/app/actions/access-requests'

// Same startTransition/try-catch/router.refresh() shape as
// CertificationActions.tsx. Rendered only for a still-pending request by an
// authorized decider (see notes/[noteId]/page.tsx's canDecide) -- once
// decided, the page's own status badge takes over and this unmounts.
export function AccessRequestDecisionActions({ projectId, requestId }: { projectId: string; requestId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function decide(decision: 'approved' | 'denied', reason?: string) {
    setError(null)
    startTransition(async () => {
      try {
        await decideResourceAccessRequestAction(projectId, requestId, decision, reason)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide('approved')}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const reason = prompt('Reason for denying this request? (optional)')
            if (reason === null) return
            decide('denied', reason || undefined)
          }}
          className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
