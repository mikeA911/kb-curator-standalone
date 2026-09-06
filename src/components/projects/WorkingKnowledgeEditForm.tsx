'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateWorkingKnowledgeItemAction } from '@/app/actions/working-knowledge'
import { Markdown } from '@/components/shared/Markdown'

// Owner-only edit, same view/edit toggle shape as ProjectGoalForm.tsx.
// Read-only for anyone else (a recipient of a share) -- "Project-shared
// notebooks may initially be owner-editable and read-only to recipients"
// per the dev request.
export function WorkingKnowledgeEditForm({
  projectId,
  itemId,
  objective,
  content,
  canEdit,
}: {
  projectId: string
  itemId: string
  objective: string | null
  content: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [objectiveValue, setObjectiveValue] = useState(objective ?? '')
  const [contentValue, setContentValue] = useState(content)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateWorkingKnowledgeItemAction(projectId, itemId, { objective: objectiveValue, content: contentValue })
        setEditing(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  if (!editing) {
    return (
      <div className="rounded border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          {objective && <p className="text-sm italic text-zinc-500">{objective}</p>}
          {canEdit && (
            <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-blue-700 underline">
              Edit
            </button>
          )}
        </div>
        <div className="mt-2">
          <Markdown text={content} />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <input
        value={objectiveValue}
        onChange={(e) => setObjectiveValue(e.target.value)}
        placeholder="Objective (optional)"
        className="rounded border border-zinc-300 px-2 py-1 text-sm italic"
      />
      <textarea
        rows={12}
        value={contentValue}
        onChange={(e) => setContentValue(e.target.value)}
        className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button disabled={isPending} className="self-start rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => {
            setObjectiveValue(objective ?? '')
            setContentValue(content)
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
