'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertCapabilityEvidenceAction, decideCapabilityEvaluationAction } from '@/app/actions/builder-integrations'
import {
  CAPABILITY_TEMPLATE_ORDER,
  CAPABILITY_TEMPLATE_LABELS,
  CAPABILITY_EVALUATION_STATUS_LABELS,
  CAPABILITY_EVALUATION_STATUS_STYLES,
} from './certification'
import type { CapabilityEvaluation } from '@/types/database'

const DECISIONS: { value: 'pass' | 'conditional_pass' | 'fail' | 'not_applicable'; label: string }[] = [
  { value: 'pass', label: 'Pass' },
  { value: 'conditional_pass', label: 'Conditional Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'not_applicable', label: 'Not Applicable' },
]

// Builder Capability Promotion: six fixed templates, always shown (whether
// or not a capability_evaluations row exists yet). A builder (or staff)
// writes one combined evidence note per template; only staff record the
// terminal decision -- enforced for real by RLS
// (capability_evaluations_decide_staff / _update_owner_evidence's own WITH
// CHECK), not just this component hiding the buttons.
export function CapabilityEvaluations({
  integrationId,
  versionId,
  evaluations,
  canEditEvidence,
  isStaff,
}: {
  integrationId: string
  versionId: string
  evaluations: CapabilityEvaluation[]
  canEditEvidence: boolean
  isStaff: boolean
}) {
  const evaluationByTemplate = new Map(evaluations.map((e) => [e.template_id, e]))

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Capability evaluation</h2>
      <div className="flex flex-col gap-3">
        {CAPABILITY_TEMPLATE_ORDER.map((templateId) => (
          <TemplateCard
            key={templateId}
            integrationId={integrationId}
            versionId={versionId}
            templateId={templateId}
            evaluation={evaluationByTemplate.get(templateId)}
            canEditEvidence={canEditEvidence}
            isStaff={isStaff}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({
  integrationId,
  versionId,
  templateId,
  evaluation,
  canEditEvidence,
  isStaff,
}: {
  integrationId: string
  versionId: string
  templateId: string
  evaluation: CapabilityEvaluation | undefined
  canEditEvidence: boolean
  isStaff: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [evidence, setEvidence] = useState(evaluation?.evidence_notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const status = evaluation?.status ?? 'draft'

  function saveEvidence() {
    setError(null)
    startTransition(async () => {
      try {
        await upsertCapabilityEvidenceAction(integrationId, versionId, templateId as never, evidence)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save evidence')
      }
    })
  }

  function decide(decision: 'pass' | 'conditional_pass' | 'fail' | 'not_applicable') {
    if (!evaluation) return
    const rationale = prompt(`Rationale for "${CAPABILITY_EVALUATION_STATUS_LABELS[decision]}"? (optional)`)
    if (rationale === null) return
    setError(null)
    startTransition(async () => {
      try {
        await decideCapabilityEvaluationAction(integrationId, evaluation.id, decision, rationale || undefined)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record decision')
      }
    })
  }

  return (
    <div className="rounded border border-zinc-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{CAPABILITY_TEMPLATE_LABELS[templateId] ?? templateId}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CAPABILITY_EVALUATION_STATUS_STYLES[status]}`}>
          {CAPABILITY_EVALUATION_STATUS_LABELS[status]}
        </span>
      </div>

      {canEditEvidence && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            rows={3}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Evidence notes -- reference the checks this template covers, with links where relevant."
            className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            disabled={isPending || !evidence.trim()}
            onClick={saveEvidence}
            className="self-start rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save evidence'}
          </button>
        </div>
      )}
      {!canEditEvidence && evaluation?.evidence_notes && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{evaluation.evidence_notes}</p>}

      {evaluation?.rationale && <p className="mt-2 rounded bg-zinc-50 p-2 text-xs text-zinc-600">{evaluation.rationale}</p>}

      {isStaff && evaluation && (
        <div className="mt-2 flex flex-wrap gap-2">
          {DECISIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={isPending || status === d.value}
              onClick={() => decide(d.value)}
              className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-500 disabled:cursor-default disabled:opacity-50"
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
      {isStaff && !evaluation && <p className="mt-2 text-xs text-zinc-400">No evidence submitted yet -- nothing to decide.</p>}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
