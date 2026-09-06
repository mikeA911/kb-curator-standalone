'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { shareWorkingKnowledgeItemAction, revokeWorkingKnowledgeShareAction } from '@/app/actions/working-knowledge'

export interface ShareableMember {
  userId: string
  email: string | null
}

export interface ActiveShareRow {
  id: string
  recipientUserId: string
  recipientEmail: string | null
}

// Owner-only (the caller of updateWorkingKnowledgeItem() etc. -- gated by
// the page itself, not re-checked here). No multi-select member picker
// existed anywhere in this codebase before this feature -- this combines
// MemberDirectory.tsx's active-member list/row shape with a per-row Share
// button, plus a Revoke button per already-active share.
export function WorkingKnowledgeShareManager({
  projectId,
  itemId,
  candidates,
  shares,
}: {
  projectId: string
  itemId: string
  candidates: ShareableMember[]
  shares: ActiveShareRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const sharedUserIds = new Set(shares.map((s) => s.recipientUserId))
  const shareableCandidates = candidates.filter((c) => !sharedUserIds.has(c.userId))

  function share(recipientUserId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await shareWorkingKnowledgeItemAction(projectId, itemId, recipientUserId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to share')
      }
    })
  }

  function revoke(shareId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await revokeWorkingKnowledgeShareAction(projectId, itemId, shareId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revoke')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sharing</h3>

      {shares.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {shares.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 px-2 py-1.5 text-sm">
              <span>{s.recipientEmail ?? s.recipientUserId}</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => revoke(s.id)}
                className="shrink-0 text-xs text-red-700 underline disabled:opacity-50"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {shareableCandidates.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {shareableCandidates.map((c) => (
            <li key={c.userId} className="flex items-center justify-between gap-2 rounded border border-zinc-200 px-2 py-1.5 text-sm">
              <span>{c.email ?? c.userId}</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => share(c.userId)}
                className="shrink-0 rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Share
              </button>
            </li>
          ))}
        </ul>
      )}

      {shares.length === 0 && shareableCandidates.length === 0 && (
        <p className="text-sm text-zinc-500">No other active project members to share with.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
