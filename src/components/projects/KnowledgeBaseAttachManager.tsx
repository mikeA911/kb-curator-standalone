'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { attachKnowledgeBaseAction, detachKnowledgeBaseAction } from '@/app/actions/projects'

// OR-036: a bare <select> of names couldn't show what each KB is for, so a
// curator had no way to decide whether they actually needed it -- switched
// to a list of cards (name + description) each with its own Attach button, a
// native <option> can't render a description. listAttachableKnowledgeBases
// (src/lib/knowledge-bases.ts) already excludes any project_private/
// selected_projects KB, so everything offered here is safe for any project
// to attach.
export function KnowledgeBaseAttachManager({
  projectId,
  availableKnowledgeBases,
}: {
  projectId: string
  availableKnowledgeBases: { id: string; name: string; description: string | null }[]
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function attach(id: string) {
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      try {
        await attachKnowledgeBaseAction(projectId, id)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to attach knowledge base')
      } finally {
        setPendingId(null)
      }
    })
  }

  if (availableKnowledgeBases.length === 0) {
    return <p className="text-xs text-zinc-500">No unattached knowledge bases available to attach.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Attach a knowledge base</h3>
      <ul className="flex flex-col gap-1.5">
        {availableKnowledgeBases.map((kb) => (
          <li key={kb.id} className="flex items-start justify-between gap-3 rounded border border-zinc-200 bg-white p-2 text-xs">
            <div>
              <div className="font-medium">{kb.name}</div>
              {kb.description && <p className="mt-0.5 text-zinc-500">{kb.description}</p>}
            </div>
            <button
              disabled={isPending}
              onClick={() => attach(kb.id)}
              className="shrink-0 rounded bg-zinc-900 px-2 py-1 font-medium text-white disabled:opacity-50"
            >
              {isPending && pendingId === kb.id ? 'Attaching…' : 'Attach'}
            </button>
          </li>
        ))}
      </ul>
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
