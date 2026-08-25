import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { isPlatformOwner, listFeedbackBoard, listMyFeedbackReports } from '@/lib/feedback/queries'
import type { FeedbackStatus, FeedbackType } from '@/types/database'

// Owner Roadmap and Ember Feedback Board, Phase 1. Owners (platform_owners,
// independent of profiles.role) see the full triage board; everyone else
// sees only their own submissions -- both at the same route, same "render
// differently by authorization" shape as other pages in this app, rather
// than a separate hidden URL (the dev request explicitly warns against
// relying on hidden navigation as an access control).

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug',
  improvement: 'Improvement',
  feature_request: 'Feature request',
  usability: 'Usability',
  documentation: 'Documentation',
}

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'bg-zinc-100 text-zinc-700',
  triaged: 'bg-blue-100 text-blue-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  deferred: 'bg-amber-100 text-amber-800',
  declined: 'bg-zinc-200 text-zinc-500',
  in_progress: 'bg-indigo-100 text-indigo-800',
  ready_to_verify: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
}

const STATUS_OPTIONS: FeedbackStatus[] = ['new', 'triaged', 'accepted', 'deferred', 'declined', 'in_progress', 'ready_to_verify', 'resolved']
const TYPE_OPTIONS: FeedbackType[] = ['bug', 'improvement', 'feature_request', 'usability', 'documentation']

function pillClass(active: boolean) {
  return `rounded-full px-3 py-1 ${active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`
}

function filterUrl(current: { type?: string; status?: string }, changes: { type?: string; status?: string }) {
  const merged = { ...current, ...changes }
  const params = new URLSearchParams()
  if (merged.type) params.set('type', merged.type)
  if (merged.status) params.set('status', merged.status)
  const qs = params.toString()
  return `/feedback${qs ? `?${qs}` : ''}`
}

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const { type, status } = await searchParams
  const ctx = await requireUser()
  const isOwner = await isPlatformOwner(ctx)

  if (!isOwner) {
    const reports = await listMyFeedbackReports(ctx)
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">My feedback</h1>
        <p className="text-sm text-zinc-500">
          Use the Feedback button inside Ember (bottom-right chat) to report a problem, suggest an improvement, or request a
          feature. Your submissions and their status appear below.
        </p>
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-500">No submissions yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div>
                  <span className="text-xs text-zinc-400">FB-{r.report_number} · {TYPE_LABELS[r.type]}</span>
                  <p className="font-medium">{r.title}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const reports = await listFeedbackBoard(ctx, { type: type as FeedbackType | undefined, status: status as FeedbackStatus | undefined })
  const filters = { type, status }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Feedback board</h1>
        <Link href="/roadmap" className="text-sm underline">
          Owner roadmap register →
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Type</span>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={filterUrl(filters, { type: undefined })} className={pillClass(!type)}>
            All
          </Link>
          {TYPE_OPTIONS.map((t) => (
            <Link key={t} href={filterUrl(filters, { type: t })} className={pillClass(type === t)}>
              {TYPE_LABELS[t]}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Status</span>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={filterUrl(filters, { status: undefined })} className={pillClass(!status)}>
            All
          </Link>
          {STATUS_OPTIONS.map((s) => (
            <Link key={s} href={filterUrl(filters, { status: s })} className={pillClass(status === s)}>
              {s.replace(/_/g, ' ')}
            </Link>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-zinc-500">No reports match this filter.</p>
      ) : (
        <div className="rounded border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Report</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/feedback/${r.id}`} className="underline">
                      FB-{r.report_number} {r.title}
                    </Link>
                    {r.classification === 'confidential_security' && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">confidential</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{TYPE_LABELS[r.type]}</td>
                  <td className="px-4 py-3">{r.severity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
