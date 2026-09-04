'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestProjectJoinAction } from '@/app/actions/join-requests'

// Same idempotent shape as RequestSourceAccessButton.tsx: alreadyRequested
// seeds `sent` from the server so a reload can't fire a duplicate request.
export function RequestToJoinButton({ projectId, alreadyRequested }: { projectId: string; alreadyRequested: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(alreadyRequested)
  const [error, setError] = useState<string | null>(null)

  if (sent) {
    return <span className="text-sm text-zinc-400">Request pending</span>
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            try {
              await requestProjectJoinAction(projectId)
              setSent(true)
              router.refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Request failed')
            }
          })
        }
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Requesting…' : 'Request to join'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
