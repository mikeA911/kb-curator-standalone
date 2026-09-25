'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createMethodFromWorkstreamAction } from '@/app/actions/methods'

// Builder Ontology, Part C: promotes this Workstream into a draft Method --
// distinct from WorkstreamPromotionForm (which submits the Workstream
// itself for a new customer-facing Project). A Method is reusable process
// reference, reviewed by staff before other builders can see it.
export function PromoteToMethodForm({ projectId, workstreamId, defaultGuardrail }: { projectId: string; workstreamId: string; defaultGuardrail: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [guardrails, setGuardrails] = useState(defaultGuardrail ?? '')

  if (submitted) {
    return <p className="text-sm text-emerald-700">Saved as a draft Method -- the operator will review it before it&apos;s visible to other builders.</p>
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await createMethodFromWorkstreamAction(projectId, workstreamId, {
          name: name.trim(),
          description: description.trim() || undefined,
          guardrails: guardrails.trim() || undefined,
        })
        setSubmitted(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to promote to a method')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Promote to Method</h2>
      <p className="text-xs text-zinc-500">
        Turn this workstream into a reusable Method other builders can browse and instantiate, once the operator publishes it.
      </p>
      <input
        type="text"
        placeholder="Method name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <textarea
        placeholder="Guardrails (optional -- pre-filled from this workstream's own guardrail)"
        value={guardrails}
        onChange={(e) => setGuardrails(e.target.value)}
        rows={2}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save as draft Method'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
