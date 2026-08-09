'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EvalResult, FailureClassification } from '@/types/database'
import { submitHumanReviewAction } from '@/app/actions/eval'

const FAILURE_OPTIONS: FailureClassification[] = [
  'knowledge_failure',
  'retrieval_failure',
  'reasoning_failure',
  'workflow_failure',
  'tool_failure',
  'behavior_failure',
  'rule_failure',
  'unknown',
]

function scoreOrNull(v: string): number | null {
  if (v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export function HumanReviewForm({ result, runId }: { result: EvalResult; runId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [accepted, setAccepted] = useState(result.human_accepted ?? true)
  const [generationScore, setGenerationScore] = useState(result.human_generation_score?.toString() ?? '')
  const [groundingScore, setGroundingScore] = useState(result.human_grounding_score?.toString() ?? '')
  const [outcomeScore, setOutcomeScore] = useState(result.human_outcome_score?.toString() ?? '')
  const [failureClassification, setFailureClassification] = useState<FailureClassification | ''>(
    result.human_failure_classification ?? ''
  )
  const [notes, setNotes] = useState(result.human_notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await submitHumanReviewAction(result.id, runId, {
        accepted,
        generationScore: scoreOrNull(generationScore),
        groundingScore: scoreOrNull(groundingScore),
        outcomeScore: scoreOrNull(outcomeScore),
        failureClassification: failureClassification || null,
        notes,
      })
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Human review</h2>
      {result.human_reviewed_at && (
        <p className="mb-3 text-xs text-zinc-500">Last reviewed {new Date(result.human_reviewed_at).toLocaleString()}</p>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          Answer accepted
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Generation</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={generationScore}
              onChange={(e) => setGenerationScore(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Grounding</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={groundingScore}
              onChange={(e) => setGroundingScore(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Outcome</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={outcomeScore}
              onChange={(e) => setOutcomeScore(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Failure classification</span>
          <select
            value={failureClassification}
            onChange={(e) => setFailureClassification(e.target.value as FailureClassification | '')}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {FAILURE_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>

        <button disabled={isPending} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save review'}
        </button>
      </div>
    </form>
  )
}
