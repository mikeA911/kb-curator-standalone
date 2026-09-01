'use client'

import { useState, useTransition } from 'react'
import type { WorkstreamArtifactStatus } from '@/types/database'
import { reviewArtifactAction } from '@/app/actions/workstreams'

// OL-010: "successfully attached" must not imply an artifact satisfies its
// acceptance criteria. Status is always visible (text label, not just
// color), and validationNotes/reviewer notes render inline so a reader
// never has to guess why something needs another pass.
const STATUS_LABELS: Record<WorkstreamArtifactStatus, string> = {
  draft: 'Draft (no automated check yet)',
  validation_failed: 'Validation failed',
  ready_for_review: 'Ready for review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_STYLES: Record<WorkstreamArtifactStatus, string> = {
  draft: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  validation_failed: 'border-red-300 bg-red-100 text-red-800',
  ready_for_review: 'border-amber-300 bg-amber-100 text-amber-800',
  approved: 'border-green-300 bg-green-100 text-green-800',
  rejected: 'border-red-300 bg-red-100 text-red-800',
}

export function ArtifactStatusBadge({ status }: { status: WorkstreamArtifactStatus }) {
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
}

export function ArtifactReviewActions({
  artifactId,
  projectId,
  workstreamId,
  status,
  canReview,
}: {
  artifactId: string
  projectId: string
  workstreamId: string
  status: WorkstreamArtifactStatus
  canReview: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  function run(decision: 'approved' | 'rejected') {
    setError(null)
    startTransition(async () => {
      try {
        await reviewArtifactAction(artifactId, decision, projectId, workstreamId, notes.trim() || undefined)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  if (!canReview || status === 'approved' || status === 'rejected') return null

  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-zinc-100 pt-2">
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Review notes (optional)"
        className="rounded border border-zinc-300 px-2 py-1 text-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run('approved')}
          className="rounded border border-green-300 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-50 disabled:cursor-default disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run('rejected')}
          className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:cursor-default disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
