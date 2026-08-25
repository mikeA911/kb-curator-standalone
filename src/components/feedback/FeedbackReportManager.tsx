'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FeedbackClassification, FeedbackReport, FeedbackReportStatusHistoryEntry, FeedbackSeverity, FeedbackStatus } from '@/types/database'
import { updateFeedbackReportAction } from '@/app/actions/feedback'

// Owner Roadmap and Ember Feedback Board, Phase 1. Same mutate-then-
// router.refresh() pattern as GovernanceManager.tsx/AccessEvidenceManager.tsx.

const STATUS_OPTIONS: FeedbackStatus[] = ['new', 'triaged', 'accepted', 'deferred', 'declined', 'in_progress', 'ready_to_verify', 'resolved']
const SEVERITY_OPTIONS: FeedbackSeverity[] = ['critical', 'high', 'medium', 'low']
const CLASSIFICATION_OPTIONS: FeedbackClassification[] = ['standard', 'confidential_security']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

export function FeedbackReportManager({
  report,
  statusHistory,
  isOwner,
  reporterEmail,
  assigneeEmail,
  owners,
}: {
  report: FeedbackReport
  statusHistory: FeedbackReportStatusHistoryEntry[]
  isOwner: boolean
  reporterEmail: string
  assigneeEmail: string | null
  owners: { userId: string; email: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<FeedbackStatus>(report.status)
  const [severity, setSeverity] = useState<FeedbackSeverity | ''>(report.severity ?? '')
  const [classification, setClassification] = useState<FeedbackClassification>(report.classification)
  const [ownerDecision, setOwnerDecision] = useState(report.owner_decision ?? '')
  const [ownerDecisionRationale, setOwnerDecisionRationale] = useState(report.owner_decision_rationale ?? '')
  const [affectedVersion, setAffectedVersion] = useState(report.affected_version ?? '')
  const [fixedVersion, setFixedVersion] = useState(report.fixed_version ?? '')
  const [deployedVersion, setDeployedVersion] = useState(report.deployed_version ?? '')
  const [assigneeId, setAssigneeId] = useState(report.assignee_id ?? '')
  const [roadmapRef, setRoadmapRef] = useState(report.roadmap_ref ?? '')

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        const statusChangeReason = status !== report.status ? prompt('Reason for this status change (optional)') ?? undefined : undefined
        await updateFeedbackReportAction(report.id, {
          status,
          statusChangeReason,
          severity: severity || null,
          classification,
          ownerDecision: ownerDecision || null,
          ownerDecisionRationale: ownerDecisionRationale || null,
          affectedVersion: affectedVersion || null,
          fixedVersion: fixedVersion || null,
          deployedVersion: deployedVersion || null,
          assigneeId: assigneeId || null,
          roadmapRef: roadmapRef || null,
        })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/feedback" className="text-sm underline">
          ← Feedback
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          FB-{report.report_number} {report.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {report.type.replace(/_/g, ' ')} · reported by {reporterEmail}
          {report.current_page && <> · from {report.current_page}</>}
        </p>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-4">
        <p className="whitespace-pre-wrap text-sm text-zinc-800">{report.description}</p>
        {report.expected_result && (
          <p className="mt-3 text-sm">
            <span className="font-medium text-zinc-500">Expected: </span>
            {report.expected_result}
          </p>
        )}
        {report.actual_result && (
          <p className="mt-1 text-sm">
            <span className="font-medium text-zinc-500">Actual: </span>
            {report.actual_result}
          </p>
        )}
        {report.impact && (
          <p className="mt-1 text-sm">
            <span className="font-medium text-zinc-500">Impact: </span>
            {report.impact}
          </p>
        )}
        {report.reproduction_steps && (
          <p className="mt-1 whitespace-pre-wrap text-sm">
            <span className="font-medium text-zinc-500">Reproduction: </span>
            {report.reproduction_steps}
          </p>
        )}
      </div>

      {!isOwner ? (
        <div className="rounded border border-zinc-200 bg-white p-4 text-sm">
          <span className="font-medium text-zinc-500">Status: </span>
          {report.status.replace(/_/g, ' ')}
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Severity">
              <select value={severity} onChange={(e) => setSeverity(e.target.value as FeedbackSeverity | '')} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                <option value="">—</option>
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Classification">
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as FeedbackClassification)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {CLASSIFICATION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                <option value="">Unassigned</option>
                {owners.map((o) => (
                  <option key={o.userId} value={o.userId}>
                    {o.email}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Owner decision">
            <input value={ownerDecision} onChange={(e) => setOwnerDecision(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Decision rationale">
            <textarea
              value={ownerDecisionRationale}
              onChange={(e) => setOwnerDecisionRationale(e.target.value)}
              rows={2}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Affected version">
              <input value={affectedVersion} onChange={(e) => setAffectedVersion(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
            </Field>
            <Field label="Fixed version">
              <input value={fixedVersion} onChange={(e) => setFixedVersion(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
            </Field>
            <Field label="Deployed version">
              <input value={deployedVersion} onChange={(e) => setDeployedVersion(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
            </Field>
          </div>

          <Field label="Roadmap reference (e.g. OR-018)">
            <input value={roadmapRef} onChange={(e) => setRoadmapRef(e.target.value)} className="w-48 rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </Field>

          <div>
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {isOwner && statusHistory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Status history</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-600">
            {statusHistory.map((h) => (
              <li key={h.id}>
                {new Date(h.created_at).toLocaleString()} — {(h.from_status ?? 'new').replace(/_/g, ' ')} → {h.to_status.replace(/_/g, ' ')}
                {h.reason && <span className="text-zinc-400"> ({h.reason})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {assigneeEmail && <p className="text-sm text-zinc-500">Assigned to {assigneeEmail}</p>}
    </div>
  )
}
