import Link from 'next/link'
import type { ScheduledPresentationRow } from '@/lib/workbench/presentations'

// Workstream Presentation & Review -- makes a curator's own scheduled
// "open review automatically at a future date" visible on the dashboard,
// mirroring UnpublishedWikiWidget's table layout.
export function ScheduledPresentationsWidget({ presentations }: { presentations: ScheduledPresentationRow[] }) {
  return (
    <div className="rounded border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="font-medium">Presentations: scheduled to open</h2>
      </div>
      {presentations.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">Nothing scheduled right now.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Workstream</th>
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">Opens</th>
            </tr>
          </thead>
          <tbody>
            {presentations.map((p) => (
              <tr key={p.presentationId} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/projects/${p.projectId}/workstreams/${p.workstreamId}/presentation`} className="font-medium hover:underline">
                    {p.workstreamName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-600">{p.projectName}</td>
                <td className="px-4 py-2 text-zinc-500">{new Date(p.scheduledOpenAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
