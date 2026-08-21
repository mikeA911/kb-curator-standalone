'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeSharedLinkAction } from '@/app/actions/trending'

// Admin-only dashboard control -- window.confirm/prompt, same lightweight
// convention already used for other admin destructive actions this session
// (ModelAssignmentsSummary, ProviderDetail); this codebase has no modal
// dialog library. The reason is optional (dismissing the prompt just omits
// it), matching the doc's "optional moderation reason".
export function RemoveSharedLinkButton({ trendingItemId, title }: { trendingItemId: string; title: string }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleRemove() {
    if (
      !window.confirm(
        `Remove "${title}" from Shared links? It will disappear from ordinary views immediately, but the original content and an audit trail are kept.`
      )
    ) {
      return
    }
    const reason = window.prompt('Optional: why is this being removed?')
    setIsPending(true)
    try {
      await removeSharedLinkAction(trendingItemId, reason || undefined)
      router.refresh()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button type="button" onClick={handleRemove} disabled={isPending} className="text-xs text-red-600 hover:underline disabled:opacity-50">
      {isPending ? 'Removing…' : 'Remove'}
    </button>
  )
}
