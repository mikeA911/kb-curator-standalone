import Link from 'next/link'
import type { OrganizationExplorer as OrganizationExplorerData, ExplorerSource, ExplorerKnowledgeBase, ExplorerConnectedProject } from '@/lib/projects/explorer'
import { RequestSourceAccessButton } from './RequestSourceAccessButton'

// Plain server component -- every node is either a real existing page
// (`/projects/[id]`, `/sources/[id]`) or static text, except a locked
// source's "Request access" button (client). Knowledge base nodes are
// deliberately not links -- there is no internal KB detail page in this app
// to send them to. `projectId` is only used by locked sources -- always
// unset (locked is always false) for a connected-project branch, since
// getOrganizationExplorer only computes lock state for the root project's
// own KBs (src/lib/projects/explorer.ts).
function SourceList({ sources, truncated, projectId }: { sources: ExplorerSource[]; truncated: boolean; projectId?: string }) {
  if (sources.length === 0) return <p className="text-xs text-zinc-400">No accessible sources.</p>
  return (
    <ul className="flex flex-col gap-0.5">
      {sources.map((s) =>
        s.locked ? (
          <li key={s.id} className="flex items-center gap-1.5">
            <span aria-hidden className="text-xs text-zinc-400">
              🔒
            </span>
            <span className="text-xs text-zinc-500">{s.title}</span>
            {projectId && <RequestSourceAccessButton projectId={projectId} resourceId={s.id} alreadyRequested={s.alreadyRequested} />}
          </li>
        ) : (
          <li key={s.id}>
            <Link href={`/sources/${s.id}`} className="text-xs text-zinc-600 underline">
              {s.title}
            </Link>
          </li>
        )
      )}
      {truncated && <li className="text-xs text-zinc-400">…and more</li>}
    </ul>
  )
}

function KnowledgeBaseBranch({ kb, projectId }: { kb: ExplorerKnowledgeBase; projectId?: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-zinc-200 pl-3">
      <p className="text-sm font-medium text-zinc-800">{kb.name}</p>
      <SourceList sources={kb.sources} truncated={kb.sourcesTruncated} projectId={projectId} />
    </div>
  )
}

function ConnectedProjectBranch({ project }: { project: ExplorerConnectedProject }) {
  return (
    <div className="flex flex-col gap-1.5 border-l border-zinc-200 pl-3">
      <Link href={`/projects/${project.id}`} className="text-sm font-medium text-zinc-800 underline">
        {project.name}
      </Link>
      {project.additionalKnowledgeBases.map((kb) => (
        <div key={kb.id} className="ml-2">
          <KnowledgeBaseBranch kb={kb} />
        </div>
      ))}
    </div>
  )
}

export function OrganizationExplorer({ explorer }: { explorer: OrganizationExplorerData }) {
  if (explorer.knowledgeBases.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Organization Explorer</h2>
      <p className="text-xs text-zinc-500">
        A read-only view of how this project connects to others through shared knowledge bases. Names and links only --
        nothing here can be moved, attached, or changed. A locked source belongs to this project but is restricted --
        request access to open it.
      </p>
      <div className="flex flex-col gap-4">
        {explorer.knowledgeBases.map((kb) => (
          <div key={kb.id} className="flex flex-col gap-1.5">
            <KnowledgeBaseBranch kb={kb} projectId={explorer.rootProjectId} />
            {kb.connectedProjects.length > 0 && (
              <div className="ml-3 flex flex-col gap-2">
                {kb.connectedProjects.map((project) => (
                  <ConnectedProjectBranch key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
