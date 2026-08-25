'use client'

import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RoadmapItem, RoadmapStatus } from '@/types/database'
import { updateRoadmapItemAction } from '@/app/actions/roadmap'

// Owner Roadmap register, in-app. Same mutate-then-router.refresh() pattern
// as GovernanceManager.tsx/AccessEvidenceManager.tsx/FeedbackReportManager.tsx.

const STATUS_OPTIONS: RoadmapStatus[] = [
  'captured',
  'assessing',
  'proposed',
  'approved',
  'in_progress',
  'validate',
  'done',
  'deferred',
  'declined',
  'superseded',
]

const STATUS_STYLES: Record<RoadmapStatus, string> = {
  captured: 'bg-zinc-100 text-zinc-700',
  assessing: 'bg-zinc-100 text-zinc-700',
  proposed: 'bg-blue-100 text-blue-800',
  approved: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  validate: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
  deferred: 'bg-amber-100 text-amber-800',
  declined: 'bg-zinc-200 text-zinc-500',
  superseded: 'bg-zinc-200 text-zinc-500',
}

export function RoadmapManager({ items }: { items: RoadmapItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [decisionDraft, setDecisionDraft] = useState('')

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  function openItem(item: RoadmapItem) {
    setOpenId(openId === item.id ? null : item.id)
    setDecisionDraft(item.decision_next_action ?? '')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Owner roadmap register</h1>
        <a href="/roadmap/export" className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400">
          Download CSV
        </a>
      </div>
      <p className="text-sm text-zinc-500">
        The tabular register from the owner-confidential Markdown roadmap, made editable and exportable in-app. Longer prose
        detail sections for individual items still live in that file.
      </p>

      <div className="rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-4 py-2 font-medium">Request/change</th>
              <th className="px-4 py-2 font-medium">Priority</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr className="border-b border-zinc-100 last:border-0 align-top">
                  <td className="px-4 py-3 font-medium">{item.item_ref}</td>
                  <td className="px-4 py-3">
                    {item.title}
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {item.item_type} · {item.public_milestone} · {item.pilot_position}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{item.priority}</td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      disabled={isPending}
                      onChange={(e) => run(() => updateRoadmapItemAction(item.id, { status: e.target.value as RoadmapStatus }))}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openItem(item)} className="text-xs underline">
                      {openId === item.id ? 'Close' : 'Details'}
                    </button>
                  </td>
                </tr>
                {openId === item.id && (
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <td colSpan={5} className="px-4 py-3">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-xs font-medium text-zinc-500">Decision / next action</span>
                        <textarea
                          value={decisionDraft}
                          onChange={(e) => setDecisionDraft(e.target.value)}
                          rows={3}
                          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          run(async () => {
                            await updateRoadmapItemAction(item.id, { decisionNextAction: decisionDraft || null })
                            setOpenId(null)
                          })
                        }
                        className="mt-2 rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
