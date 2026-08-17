import Link from 'next/link'
import type { AssessmentSummary } from '@/lib/projects/assessments'

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
}

// Collapsed/summary-oriented per the design note -- the full question set
// lives on the dedicated assessment page, not dumped onto the workstream
// page. "Participants" here are literally the response rows for the active
// version, keyed by their free-text participant_label.
export function SystemUnderstandingCard({
  projectId,
  summaries,
  canCreate,
}: {
  projectId: string
  summaries: AssessmentSummary[]
  canCreate: boolean
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">System Understanding</h2>
        {canCreate && (
          <Link href={`/projects/${projectId}/assessments/new`} className="text-sm underline">
            New Assessment
          </Link>
        )}
      </div>

      {summaries.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No assessment yet. A System Understanding Assessment tests whether a participant actually understood the
          system after analyzing it -- separate from the engineering artifacts below.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {summaries.map(({ assessment, activeVersion, questionCount, responses }) => (
            <div key={assessment.id} className="rounded border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{assessment.name}</h3>
                  {activeVersion ? (
                    <p className="text-xs text-zinc-500">
                      Version {activeVersion.version_number} · {questionCount} question{questionCount === 1 ? '' : 's'}
                      {activeVersion.status !== 'active' && <span className="ml-1 text-amber-700">({activeVersion.status})</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">No active version yet.</p>
                  )}
                </div>
                {activeVersion && (
                  <Link href={`/projects/${projectId}/assessments/${assessment.id}`} className="shrink-0 text-sm text-blue-700 underline">
                    View Assessment
                  </Link>
                )}
              </div>
              {assessment.description && <p className="mt-2 text-sm text-zinc-600">{assessment.description}</p>}

              {activeVersion && (
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {responses.length === 0 && <li className="text-zinc-500">No responses submitted yet.</li>}
                  {responses.map((r) => (
                    <li key={r.participantLabel} className="flex items-center justify-between gap-2">
                      <span>{r.participantLabel}</span>
                      <span className={r.status === 'completed' ? 'text-green-700' : 'text-zinc-500'}>
                        {STATUS_LABEL[r.status] ?? r.status}
                        {r.status === 'in_progress' && ` (${r.answeredCount}/${questionCount})`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {activeVersion?.status === 'active' && (
                <Link
                  href={`/projects/${projectId}/assessments/${assessment.id}/respond`}
                  className="mt-3 inline-block text-sm text-blue-700 underline"
                >
                  Submit a response
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
