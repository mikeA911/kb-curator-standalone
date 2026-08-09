'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EvalDatasetStatus } from '@/types/database'
import { activateDatasetAction, archiveDatasetAction } from '@/app/actions/eval'

export function DatasetActions({ datasetId, status }: { datasetId: string; status: EvalDatasetStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === 'draft' && (
          <button
            disabled={isPending}
            onClick={() => run(() => activateDatasetAction(datasetId))}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Activate
          </button>
        )}
        {status !== 'archived' && (
          <button
            disabled={isPending}
            onClick={() => {
              if (!confirm('Archive this dataset?')) return
              run(() => archiveDatasetAction(datasetId))
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Archive
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
