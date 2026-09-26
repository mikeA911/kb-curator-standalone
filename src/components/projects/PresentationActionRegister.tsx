'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePresentationActionAction } from '@/app/actions/presentations'
import type { PresentationAction, PresentationActionStatus } from '@/types/database'

const TYPE_LABELS: Record<PresentationAction['type'], string> = {
  action: 'Action',
  evaluation: 'Evaluation',
  security: 'Security',
  requirement: 'Requirement',
}

// Workstream Presentation & Review, Part A -- structured register of work
// generated from review comments (doc §9). status/evidence are the only
// two fields anyone but a curator can touch, and only for an action they
// own (presentation_actions_update_owner_or_curator) -- same "builder
// updates their own thing" bar as DeliverableChecklist's own toggle.
export function PresentationActionRegister({
  projectId,
  workstreamId,
  actions,
  canEditAny,
}: {
  projectId: string
  workstreamId: string
  actions: PresentationAction[]
  canEditAny: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleStatusChange(actionId: string, status: PresentationActionStatus) {
    setPendingId(actionId)
    startTransition(async () => {
      await updatePresentationActionAction(projectId, workstreamId, actionId, { status })
      router.refresh()
      setPendingId(null)
    })
  }

  if (actions.length === 0) {
    return <p className="text-sm text-zinc-500">No actions yet -- run &quot;Process feedback&quot; on a review comment to generate some.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {actions.map((a) => (
        <li key={a.id} className="flex flex-col gap-1 rounded border border-zinc-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{TYPE_LABELS[a.type]}</span>
            <select
              value={a.status}
              disabled={!canEditAny || (isPending && pendingId === a.id)}
              onChange={(e) => handleStatusChange(a.id, e.target.value as PresentationActionStatus)}
              className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs"
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <p className="text-zinc-800">{a.action_text}</p>
          {a.evidence && <p className="text-xs text-zinc-500">Evidence: {a.evidence}</p>}
        </li>
      ))}
    </ul>
  )
}
