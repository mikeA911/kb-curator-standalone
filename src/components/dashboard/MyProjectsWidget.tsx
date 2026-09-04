import Link from 'next/link'
import type { DashboardProjectOption } from '@/lib/projects/queries'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  curator: 'Curator',
  consultant: 'Consultant',
  viewer: 'Viewer',
}

// Admin/curator's equivalent of EmberHome's project picker + recent
// conversations (2026-09-04) -- landing on stat cards with no project
// shortcuts meant searching /projects every time. `projects` is already
// sorted by the caller (most-recently-worked-on first, per
// lastWorkedProjectId, then alphabetical) so this component stays a plain
// list, no client-side sorting logic to duplicate.
export function MyProjectsWidget({
  projects,
  lastWorkedProjectId,
}: {
  projects: DashboardProjectOption[]
  lastWorkedProjectId: string | null
}) {
  if (projects.length === 0) return null

  const lastWorked = lastWorkedProjectId ? projects.find((p) => p.id === lastWorkedProjectId) : undefined

  return (
    <div className="flex flex-col gap-3">
      {lastWorked && (
        <Link
          href={`/projects/${lastWorked.id}`}
          className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <div className="text-xs uppercase tracking-wide text-zinc-500">Continue where you left off</div>
          <div className="mt-1 font-medium">{lastWorked.name}</div>
        </Link>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Your projects</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="rounded border border-zinc-200 bg-white p-3 text-sm hover:border-zinc-400">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {ROLE_LABELS[p.role] ?? p.role}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
