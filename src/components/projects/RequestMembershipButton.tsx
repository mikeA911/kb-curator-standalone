'use client'

import { useState, useTransition } from 'react'
import { requestProjectMembershipAction } from '@/app/actions/project-notes'

// alreadyRequested seeds `sent` from the server (an existing open
// "Membership request" note authored by this viewer for this project, see
// getOrganizationPortfolio) -- without it, reloading the page would reset
// the button and let the viewer fire off a duplicate note (and duplicate
// notification to the project owner) on every visit.
export function RequestMembershipButton({ projectId, alreadyRequested }: { projectId: string; alreadyRequested: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(alreadyRequested)
  const [error, setError] = useState<string | null>(null)

  if (sent) {
    return <span className="text-xs text-zinc-500">Request sent</span>
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            try {
              await requestProjectMembershipAction(projectId)
              setSent(true)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Request failed')
            }
          })
        }
        className="text-sm text-blue-700 underline disabled:cursor-default disabled:text-zinc-400"
      >
        {isPending ? 'Requesting...' : 'Request membership'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
