'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { publishMethodAction } from '@/app/actions/methods'

// Same action as MethodsReview's own publish button, offered inline on the
// Method's own detail page for a curator/admin who lands there directly
// (e.g. via a link) rather than through the /admin review queue.
export function PublishMethodButton({ methodId }: { methodId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function publish() {
    setError(null)
    startTransition(async () => {
      try {
        await publishMethodAction(methodId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to publish')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={isPending} onClick={publish} className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
        {isPending ? 'Publishing…' : 'Publish this Method'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
