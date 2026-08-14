'use client'

import { useState, useTransition } from 'react'
import { updateProjectNotesAction } from '@/app/actions/projects'

export function ProjectFindings({ projectId, initialNotes }: { projectId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    startTransition(async () => {
      await updateProjectNotesAction(projectId, notes)
      setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        rows={5}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Findings, reflections, recommendations…"
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button disabled={isPending} className="self-start rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save notes'}
        </button>
        {saved && !isPending && <span className="text-sm text-green-700">Saved</span>}
      </div>
    </form>
  )
}
