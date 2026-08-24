'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { attachKnowledgeBaseAction, detachKnowledgeBaseAction } from '@/app/actions/projects'

export function KnowledgeBaseAttachManager({
  projectId,
  availableKnowledgeBases,
}: {
  projectId: string
  availableKnowledgeBases: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function attach() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      try {
        await attachKnowledgeBaseAction(projectId, selected)
        setSelected('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to attach knowledge base')
      }
    })
  }

  if (availableKnowledgeBases.length === 0) {
    return <p className="text-xs text-zinc-500">No unattached knowledge bases available to attach.</p>
  }

  return (
    <div className="flex items-center gap-2">
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded border border-zinc-300 px-2 py-1 text-xs">
        <option value="">Attach a knowledge base…</option>
        {availableKnowledgeBases.map((kb) => (
          <option key={kb.id} value={kb.id}>
            {kb.name}
          </option>
        ))}
      </select>
      <button disabled={isPending || !selected} onClick={attach} className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50">
        Attach
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

export function KnowledgeBaseDetachButton({ projectId, knowledgeBaseId }: { projectId: string; knowledgeBaseId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await detachKnowledgeBaseAction(projectId, knowledgeBaseId)
          router.refresh()
        })
      }
      disabled={isPending}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Detach
    </button>
  )
}
