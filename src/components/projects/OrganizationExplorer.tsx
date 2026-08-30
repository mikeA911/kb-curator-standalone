import Link from 'next/link'
import type { OrganizationExplorer as OrganizationExplorerData, ExplorerKnowledgeBase, ExplorerConnectedProject } from '@/lib/projects/explorer'

// Plain server component -- every node is either a real existing page
// (`/projects/[id]`, `/sources/[id]`) or static text. No client interactivity
// needed. Knowledge base nodes are deliberately not links -- there is no
// internal KB detail page in this app to send them to.
function SourceList({ sources, truncated }: { sources: { id: string; title: string }[]; truncated: boolean }) {
  if (sources.length === 0) return <p className="text-xs text-zinc-400">No accessible sources.</p>
  return (
    <ul className="flex flex-col gap-0.5">
      {sources.map((s) => (
        <li key={s.id}>
          <Link href={`/sources/${s.id}`} className="text-xs text-zinc-600 underline">
            {s.title}
          </Link>
        </li>
      ))}
      {truncated && <li className="text-xs text-zinc-400">…and more</li>}
    </ul>
  )
}

function KnowledgeBaseBranch({ kb }: { kb: ExplorerKnowledgeBase }) {
  return (
    <div className="flex flex-col gap-1 border-l border-zinc-200 pl-3">
      <p className="text-sm font-medium text-zinc-800">{kb.name}</p>
      <SourceList sources={kb.sources} truncated={kb.sourcesTruncated} />
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
        nothing here can be moved, attached, or changed.
      </p>
      <div className="flex flex-col gap-4">
        {explorer.knowledgeBases.map((kb) => (
          <div key={kb.id} className="flex flex-col gap-1.5">
            <KnowledgeBaseBranch kb={kb} />
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
