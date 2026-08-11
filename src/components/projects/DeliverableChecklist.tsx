'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleDeliverableAction } from '@/app/actions/workstreams'
import type { WorkstreamDeliverable } from '@/types/database'

export function DeliverableChecklist({
  workstreamId,
  deliverables,
  canEdit,
}: {
  workstreamId: string
  deliverables: WorkstreamDeliverable[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle(index: number) {
    if (!canEdit || isPending) return
    startTransition(async () => {
      await toggleDeliverableAction(workstreamId, index)
      router.refresh()
    })
  }

  if (deliverables.length === 0) {
    return <p className="text-sm text-zinc-500">No deliverables defined.</p>
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {deliverables.map((d, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={d.completed}
            disabled={!canEdit || isPending}
            onChange={() => handleToggle(i)}
            className="h-4 w-4"
          />
          <span className={d.completed ? 'text-zinc-500 line-through' : 'text-zinc-700'}>{d.label}</span>
        </li>
      ))}
    </ul>
  )
}
