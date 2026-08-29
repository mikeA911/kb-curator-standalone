'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectStatus } from '@/types/database'
import {
  startWorkingOnProjectAction,
  submitProjectForApprovalAction,
  sendProjectBackToWorkingAction,
  approveProjectAction,
} from '@/app/actions/projects'

// Initial Draft -> Working on it -> For Approval -> Approved, per Mike,
// 2026-08-28 -- a real status pipeline, not the free-text field this
// section used to hold (moved to the Notes section instead). draft/active/
// review/completed are the underlying stored values (see
// supabase/migrations/20260828100001_project_status_pipeline.sql);
// everything below is display-only relabeling.
const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Initial Draft',
  active: 'Working on it',
  review: 'For Approval',
  completed: 'Approved',
  archived: 'Archived',
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  active: 'bg-amber-100 text-amber-800',
  review: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-zinc-200 text-zinc-500',
}

interface StatusHistoryEntry {
  fromStatus: ProjectStatus | null
  toStatus: ProjectStatus
  createdAt: string
  actorEmail: string | null
}

export function ProjectStatusSection({
  projectId,
  status,
  canApprove,
  showStatus,
  history,
}: {
  projectId: string
  status: ProjectStatus
  canApprove: boolean
  showStatus: boolean
  history: StatusHistoryEntry[]
}) {
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
        setError(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  if (!showStatus) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
        {canApprove && status === 'draft' && (
          <button
            disabled={isPending}
            onClick={() => run(() => startWorkingOnProjectAction(projectId))}
            className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 disabled:opacity-50"
          >
            {isPending ? 'Updating…' : 'Start working'}
          </button>
        )}
        {canApprove && status === 'active' && (
          <button
            disabled={isPending}
            onClick={() => run(() => submitProjectForApprovalAction(projectId))}
            className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 disabled:opacity-50"
          >
            {isPending ? 'Updating…' : 'Submit for approval'}
          </button>
        )}
        {canApprove && status === 'review' && (
          <button
            disabled={isPending}
            onClick={() => run(() => sendProjectBackToWorkingAction(projectId))}
            className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 disabled:opacity-50"
          >
            {isPending ? 'Updating…' : 'Send back to working'}
          </button>
        )}
        {canApprove && status !== 'completed' && status !== 'archived' && (
          <button
            disabled={isPending}
            onClick={() => {
              if (!confirm('Mark this project approved?')) return
              run(() => approveProjectAction(projectId))
            }}
            className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 disabled:opacity-50"
          >
            {isPending ? 'Approving…' : 'Approve'}
          </button>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {history.length > 0 && (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer select-none">Status history ({history.length})</summary>
          <ul className="mt-1 flex flex-col gap-1 pl-1">
            {history.map((h, i) => (
              <li key={i}>
                {new Date(h.createdAt).toLocaleString()} &mdash; {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : 'Created as '}
                {STATUS_LABELS[h.toStatus]}
                {h.actorEmail && ` (${h.actorEmail})`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
