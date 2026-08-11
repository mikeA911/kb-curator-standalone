'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { activateGraphVersionAction } from '@/app/actions/graphs'

export function ActivateVersionButton({ graphId, versionId }: { graphId: string; versionId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleActivate() {
    if (!confirm('Activate this version? New graph runs will use it immediately.')) return
    setError(null)
    startTransition(async () => {
      try {
        await activateGraphVersionAction(graphId, versionId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to activate version')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button disabled={isPending} onClick={handleActivate} className="text-xs underline disabled:opacity-50">
        Activate
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
