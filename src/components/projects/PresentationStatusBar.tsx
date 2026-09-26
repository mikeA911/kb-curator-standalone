'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  openPresentationReviewAction,
  closePresentationReviewAction,
  startBuilderRevisionAction,
  submitForCuratorReviewAction,
  reopenPresentationReviewAction,
  approvePresentationAction,
  scheduleReviewOpenAction,
  cancelScheduledReviewOpenAction,
} from '@/app/actions/presentations'
import type { PresentationStatus } from '@/types/database'

const STATUS_LABELS: Record<PresentationStatus, string> = {
  draft: 'Draft',
  review_open: 'Review open',
  review_closed: 'Review closed',
  builder_revision: 'Builder revision',
  curator_review: 'Curator review',
  approved: 'Approved',
}

// Workstream Presentation & Review, Part A -- the review-period state
// machine (doc §11): Draft -> Review Open -> Review Closed -> (Builder
// Revision, optional) -> Curator Review -> Approved, with a curator able to
// reopen from Curator Review back to Review Open for another pass. Every
// transition is curator+ only; approving your own presentation is blocked
// server-side (approvePresentation), not hidden here, since the creator
// might not be the only curator viewing this page.
export function PresentationStatusBar({
  projectId,
  workstreamId,
  presentationId,
  status,
  canCurate,
  scheduledOpenAt,
}: {
  projectId: string
  workstreamId: string
  presentationId: string
  status: PresentationStatus
  canCurate: boolean
  scheduledOpenAt: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [deadline, setDeadline] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update review status')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Review status</span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{STATUS_LABELS[status]}</span>
      </div>

      {canCurate && (
        <div className="flex flex-wrap items-center gap-2">
          {status === 'draft' && scheduledOpenAt && (
            <>
              <span className="text-xs text-zinc-600">Scheduled to open {new Date(scheduledOpenAt).toLocaleString()}</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => cancelScheduledReviewOpenAction(projectId, workstreamId, presentationId))}
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50"
              >
                Cancel schedule
              </button>
            </>
          )}
          {status === 'draft' && (
            <>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                aria-label="Comment deadline (optional)"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() => openPresentationReviewAction(projectId, workstreamId, presentationId, deadline ? new Date(deadline).toISOString() : null))
                }
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Open now
              </button>
            </>
          )}
          {status === 'draft' && !scheduledOpenAt && (
            <>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                aria-label="Schedule review to open at"
              />
              <button
                type="button"
                disabled={isPending || !scheduleAt}
                onClick={() =>
                  run(() =>
                    scheduleReviewOpenAction(
                      projectId,
                      workstreamId,
                      presentationId,
                      new Date(scheduleAt).toISOString(),
                      deadline ? new Date(deadline).toISOString() : null
                    )
                  )
                }
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50"
              >
                Schedule for later
              </button>
            </>
          )}
          {status === 'review_open' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => closePresentationReviewAction(projectId, workstreamId, presentationId))}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Close review
            </button>
          )}
          {status === 'review_closed' && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => startBuilderRevisionAction(projectId, workstreamId, presentationId))}
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50"
              >
                Start builder revision
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => submitForCuratorReviewAction(projectId, workstreamId, presentationId))}
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Submit for curator review
              </button>
            </>
          )}
          {status === 'builder_revision' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => submitForCuratorReviewAction(projectId, workstreamId, presentationId))}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Submit for curator review
            </button>
          )}
          {status === 'curator_review' && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => approvePresentationAction(projectId, workstreamId, presentationId))}
                className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                title="Blocked if you created this presentation -- another curator or admin must approve it"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => reopenPresentationReviewAction(projectId, workstreamId, presentationId))}
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50"
              >
                Reopen review
              </button>
            </>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
