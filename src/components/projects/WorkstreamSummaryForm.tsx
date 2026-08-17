'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateWorkstreamSummaryAction } from '@/app/actions/workstreams'
import { Markdown } from '@/components/shared/Markdown'

// Outcome summary, distinct from Goal (what we set out to do) -- shown at
// the top of the workstream page once populated. View mode renders as
// Markdown; curator+ can toggle into an editable textarea.
export function WorkstreamSummaryForm({
  workstreamId,
  summary,
  canEdit,
}: {
  workstreamId: string
  summary: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(summary ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateWorkstreamSummaryAction(workstreamId, value)
        setEditing(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save summary')
      }
    })
  }

  if (!editing) {
    if (!summary) {
      return canEdit ? (
        <button onClick={() => setEditing(true)} className="self-start text-sm text-blue-700 underline">
          + Add a summary
        </button>
      ) : null
    }
    return (
      <div className="rounded border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
          {canEdit && (
            <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-blue-700 underline">
              Edit
            </button>
          )}
        </div>
        <div className="mt-2">
          <Markdown text={summary} />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
      <textarea
        rows={8}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What did this workstream find? Markdown supported."
        className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button disabled={isPending} className="self-start rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save summary'}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(summary ?? '')
            setEditing(false)
            setError(null)
          }}
          className="text-sm text-zinc-500 underline"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
