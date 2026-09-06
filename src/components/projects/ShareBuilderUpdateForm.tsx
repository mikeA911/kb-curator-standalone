'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { shareBuilderUpdateAction, withdrawBuilderUpdateAction } from '@/app/actions/builder-progress-updates'
import type { BuilderProgressConfidence } from '@/types/database'

export interface ExistingBuilderUpdate {
  currentStage: string
  opportunityLabel: string | null
  progress: string
  nextStep: string
  helpRequested: string | null
  confidence: BuilderProgressConfidence
}

const CONFIDENCE_OPTIONS: { value: BuilderProgressConfidence; label: string }[] = [
  { value: 'on_track', label: 'On track' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'blocked', label: 'Blocked' },
]

// Builder Operations: a Builder explicitly drafts, reviews and submits this
// -- never sent automatically from a private conversation or Working
// Knowledge notebook. Visible only to this workstream's own Project owner.
export function ShareBuilderUpdateForm({
  projectId,
  workstreamId,
  existing,
  defaultStage,
}: {
  projectId: string
  workstreamId: string
  existing: ExistingBuilderUpdate | null
  defaultStage: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState(existing?.currentStage ?? defaultStage)
  const [opportunityLabel, setOpportunityLabel] = useState(existing?.opportunityLabel ?? '')
  const [progress, setProgress] = useState(existing?.progress ?? '')
  const [nextStep, setNextStep] = useState(existing?.nextStep ?? '')
  const [helpRequested, setHelpRequested] = useState(existing?.helpRequested ?? '')
  const [confidence, setConfidence] = useState<BuilderProgressConfidence>(existing?.confidence ?? 'on_track')

  function share() {
    setError(null)
    startTransition(async () => {
      try {
        await shareBuilderUpdateAction(projectId, workstreamId, {
          currentStage,
          opportunityLabel: opportunityLabel || null,
          progress,
          nextStep,
          helpRequested: helpRequested || null,
          confidence,
        })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to share update')
      }
    })
  }

  function withdraw() {
    setError(null)
    startTransition(async () => {
      try {
        await withdrawBuilderUpdateAction(projectId, workstreamId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to withdraw update')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Share Builder update</h2>
      <p className="text-xs text-zinc-500">
        A short, explicit update the operator can see -- current stage, progress, next step and (if needed) a help
        request. Use a customer alias or a general capability label, never a sensitive customer detail.
      </p>

      <input
        value={currentStage}
        onChange={(e) => setCurrentStage(e.target.value)}
        placeholder="Current stage (e.g. Specifying)"
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <input
        value={opportunityLabel}
        onChange={(e) => setOpportunityLabel(e.target.value)}
        placeholder="Opportunity label (alias or general capability -- optional)"
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <textarea
        rows={2}
        value={progress}
        onChange={(e) => setProgress(e.target.value)}
        placeholder="Progress so far"
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <textarea
        rows={2}
        value={nextStep}
        onChange={(e) => setNextStep(e.target.value)}
        placeholder="Next step"
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <input
        value={helpRequested}
        onChange={(e) => setHelpRequested(e.target.value)}
        placeholder="Help requested (optional)"
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <select
        value={confidence}
        onChange={(e) => setConfidence(e.target.value as BuilderProgressConfidence)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      >
        {CONFIDENCE_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !currentStage.trim() || !progress.trim() || !nextStep.trim()}
          onClick={share}
          className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Saving…' : existing ? 'Replace update' : 'Share update'}
        </button>
        {existing && (
          <button type="button" disabled={isPending} onClick={withdraw} className="text-xs text-zinc-500 underline disabled:opacity-50">
            Withdraw
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
