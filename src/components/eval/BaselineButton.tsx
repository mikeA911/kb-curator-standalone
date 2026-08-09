'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markBaselineAction } from '@/app/actions/eval'

export function BaselineButton({ runId, datasetId }: { runId: string; datasetId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markBaselineAction(runId, datasetId)
          router.refresh()
        })
      }
      className="shrink-0 rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
    >
      Mark as baseline
    </button>
  )
}
