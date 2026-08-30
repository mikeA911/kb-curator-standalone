import Link from 'next/link'
import type { PortfolioProjectRow } from '@/lib/projects/portfolio'

const TYPE_LABELS: Record<string, string> = {
  learning: 'Learning',
  experiment: 'AI Experiment',
  consulting: 'Client / Consulting',
  transformation: 'Internal Transformation',
  knowledge: 'Knowledge',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  active: 'bg-green-100 text-green-800',
  review: 'bg-amber-100 text-amber-800',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-zinc-200 text-zinc-500',
}

// Every field here is safe organization metadata -- names, counts, dates.
// No source titles, snippets, artifacts or conversations. A non-member row
// gets a plain "Membership required" label instead of a link, per the dev
// request's explicit instruction not to navigate from portfolio metadata
// into protected content.
export function OrganizationPortfolio({ rows }: { rows: PortfolioProjectRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No projects exist yet.</p>

  return (
    <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-zinc-200 text-left text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">Project</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Members</th>
            <th className="px-4 py-2 font-medium">Knowledge bases</th>
            <th className="px-4 py-2 font-medium">Attention</th>
            <th className="px-4 py-2 font-medium">Updated</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100 last:border-0 align-top">
              <td className="px-4 py-3">
                <div className="font-medium">{p.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <span>{TYPE_LABELS[p.projectType] ?? p.projectType}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[p.status] ?? 'bg-zinc-100 text-zinc-700'}`}>{p.status}</span>
                </div>
                {p.objective && <p className="mt-1 text-xs text-zinc-600">{p.objective}</p>}
              </td>
              <td className="px-4 py-3 text-zinc-600">{p.ownerEmail ?? '—'}</td>
              <td className="px-4 py-3 text-zinc-600">{p.activeMemberCount}</td>
              <td className="px-4 py-3 text-zinc-600">{p.knowledgeBaseCount}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  {p.authorityGapCount > 0 && (
                    <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {p.authorityGapCount} authority {p.authorityGapCount === 1 ? 'gap' : 'gaps'}
                    </span>
                  )}
                  {p.hasUnpublishedDraft && (
                    <span className="w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Unpublished draft</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                {p.viewerIsMember ? (
                  <Link href={`/projects/${p.id}`} className="text-sm underline">
                    Open workspace
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-400">Membership required</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
