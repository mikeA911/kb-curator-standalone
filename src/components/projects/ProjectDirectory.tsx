import Link from 'next/link'
import type { DirectoryProjectRow } from '@/lib/projects/directory'
import { RequestToJoinButton } from './RequestToJoinButton'

const TYPE_LABELS: Record<string, string> = {
  learning: 'Learning',
  experiment: 'AI Experiment',
  consulting: 'Client / Consulting',
  transformation: 'Internal Transformation',
  knowledge: 'Knowledge',
}

// Read-only "Projects at X" section (OR-036) -- rendered only on the one
// Project flagged is_organization_home, per the dev request's own scope
// ("Add a read-only Projects at Sandz section to the Organization Home
// Project," not a separate global route). Row action mirrors
// OrganizationPortfolio.tsx exactly: an admin always gets "Open workspace"
// (they already have an RLS bypass into any Project's content regardless of
// membership, so hiding the link here would add no real safety), a member
// gets it too, and everyone else gets RequestToJoinButton.
export function ProjectDirectory({
  projects,
  viewerIsAdmin,
}: {
  projects: DirectoryProjectRow[]
  viewerIsAdmin: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Projects at Sandz</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-zinc-500">No other Projects are open for discovery yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-white p-3 text-sm">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-zinc-500">
                  {TYPE_LABELS[p.projectType] ?? p.projectType}
                  {p.ownerEmail && ` · Owner: ${p.ownerEmail}`}
                </div>
                {p.objective && <p className="mt-1 text-xs text-zinc-600">{p.objective}</p>}
              </div>
              <div className="shrink-0">
                {p.viewerIsMember || viewerIsAdmin ? (
                  <Link href={`/projects/${p.id}`} className="text-sm underline">
                    Open workspace
                  </Link>
                ) : (
                  <RequestToJoinButton projectId={p.id} alreadyRequested={p.viewerHasPendingJoinRequest} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
