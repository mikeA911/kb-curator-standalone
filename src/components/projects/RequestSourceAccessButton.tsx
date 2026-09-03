'use client'

import { useState, useTransition } from 'react'
import { requestSourceAccessAction } from '@/app/actions/access-requests'

// Same idempotent shape as RequestMembershipButton.tsx: alreadyRequested
// seeds `sent` from the server (an existing open resource_access_requests
// row for this viewer+source, see getSourcesForRootKb in
// src/lib/projects/explorer.ts) so a reload can't fire a duplicate request.
export function RequestSourceAccessButton({
  projectId,
  resourceId,
  alreadyRequested,
}: {
  projectId: string
  resourceId: string
  alreadyRequested: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(alreadyRequested)
  const [error, setError] = useState<string | null>(null)

  if (sent) {
    return <span className="text-xs text-zinc-400">Request sent</span>
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            try {
              await requestSourceAccessAction(projectId, resourceId)
              setSent(true)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Request failed')
            }
          })
        }
        className="text-xs text-blue-700 underline disabled:cursor-default disabled:text-zinc-400"
      >
        {isPending ? 'Requesting…' : 'Request access'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
