'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { publishMethodAction } from '@/app/actions/methods'
import type { Method } from '@/types/database'

// Builder Ontology, Part C: staff review queue for draft Methods -- same
// approve-only shape as capability_evaluations' own staff decision, but a
// Method has no explicit "reject" state (its own status column is just
// draft/published, see the migration's own comment) -- a curator/admin who
// doesn't want to publish one simply leaves it as a draft.
export function MethodsReview({ methods }: { methods: Method[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function publish(methodId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await publishMethodAction(methodId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to publish')
      }
    })
  }

  if (methods.length === 0) {
    return <p className="text-sm text-zinc-500">No draft methods pending review.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {methods.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 bg-white p-3 text-sm">
            <div>
              <Link href={`/methods/${m.id}`} className="font-medium underline">
                {m.name}
              </Link>
              {m.description && <div className="text-xs text-zinc-500">{m.description}</div>}
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => publish(m.id)}
              className="shrink-0 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Publish
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
