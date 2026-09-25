import type { BuilderOperationsRow } from '@/lib/workbench/builder-progress-updates'
import { BuilderMeteringActions } from './BuilderMeteringActions'

const CONFIDENCE_LABELS: Record<string, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  blocked: 'Blocked',
}
const CONFIDENCE_STYLES: Record<string, string> = {
  on_track: 'bg-green-100 text-green-800',
  at_risk: 'bg-amber-100 text-amber-800',
  blocked: 'bg-red-100 text-red-800',
}

// Builder Operations: read-only -- this isn't a decision queue, just the
// operator's consent-based visibility into account state, activity and
// whatever a Builder has explicitly shared. Deliberately shows nothing
// about credits/allowance or milestone-evidence-status (no metering/
// milestone infrastructure exists yet) rather than fabricated data, and
// never reads a private Working Knowledge notebook or Ember conversation.
export function BuilderOperationsReview({ rows }: { rows: BuilderOperationsRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No Builder accounts yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.builderId} className="rounded border border-zinc-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{row.builderEmail ?? row.builderId}</span>
            <div className="flex items-center gap-2">
              {row.latestUpdate?.helpRequested && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Help requested</span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-600'}`}>
                {row.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {row.activeWorkstreamCount} active workstream{row.activeWorkstreamCount === 1 ? '' : 's'}
            {row.lastActivityAt ? ` · last activity ${new Date(row.lastActivityAt).toLocaleDateString()}` : ''}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            ${row.spend.spentThisPeriodUsd.toFixed(2)} spent this period of ${(row.spend.allowanceUsd + row.spend.creditsUsd).toFixed(2)} available
            {' '}(${row.spend.remainingUsd.toFixed(2)} remaining
            {row.spend.remainingUsd <= 0 && row.spend.stopAtAllowance ? ' -- blocked' : ''})
          </p>
          {row.latestUpdate && (
            <div className="mt-2 rounded bg-zinc-50 p-2">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                <span>{row.latestUpdate.workstreamName}</span>
                <span className="text-zinc-400">·</span>
                <span>{row.latestUpdate.currentStage}</span>
                {row.latestUpdate.opportunityLabel && (
                  <>
                    <span className="text-zinc-400">·</span>
                    <span>{row.latestUpdate.opportunityLabel}</span>
                  </>
                )}
                <span className={`ml-auto rounded-full px-2 py-0.5 ${CONFIDENCE_STYLES[row.latestUpdate.confidence]}`}>
                  {CONFIDENCE_LABELS[row.latestUpdate.confidence]}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">{row.latestUpdate.progress}</p>
              <p className="mt-1 text-xs text-zinc-500">Next: {row.latestUpdate.nextStep}</p>
              {row.latestUpdate.helpRequested && <p className="mt-1 text-xs text-red-700">Help: {row.latestUpdate.helpRequested}</p>}
            </div>
          )}
          <BuilderMeteringActions
            builderId={row.builderId}
            currentAllowanceUsd={row.spend.allowanceUsd}
            currentWarningThresholdPct={row.spend.warningThresholdPct}
            currentStopAtAllowance={row.spend.stopAtAllowance}
          />
        </li>
      ))}
    </ul>
  )
}
