import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listArtifacts } from '@/lib/projects/workstreams'
import type { ProjectWorkstream } from '@/types/database'
import { DeliverableChecklist } from '@/components/projects/DeliverableChecklist'
import { AttachArtifactForm } from '@/components/projects/AttachArtifactForm'

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  capability_inventory: 'Capability inventory',
  openapi_spec: 'OpenAPI spec',
  mcp_server: 'MCP server',
  test_results: 'Test results',
  findings: 'Findings',
  other: 'Other',
}

export default async function WorkstreamDetailPage({ params }: { params: Promise<{ id: string; workstreamId: string }> }) {
  const { id, workstreamId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  const { data: workstreamRow } = await supabase.from('project_workstreams').select('*').eq('id', workstreamId).eq('project_id', id).single()
  const workstream = workstreamRow as ProjectWorkstream | null
  if (!project || !workstream) notFound()

  const artifacts = await listArtifacts(supabase, workstreamId)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let canEdit = false // curator+ -- define scope, mark deliverables done
  let canAttach = false // consultant+ -- attach evidence
  if (user) {
    const [{ data: viewerProfile }, { data: viewerMembership }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('project_members').select('role').eq('project_id', id).eq('user_id', user.id).maybeSingle(),
    ])
    const isAdmin = viewerProfile?.role === 'admin'
    canEdit = isAdmin || viewerMembership?.role === 'owner' || viewerMembership?.role === 'curator'
    canAttach = isAdmin || canEdit || viewerMembership?.role === 'consultant'
  }

  const completedCount = workstream.deliverables.filter((d) => d.completed).length

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/projects/${id}`} className="text-sm underline">
          &larr; {project.name}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-semibold">{workstream.name}</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{workstream.status}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {completedCount}/{workstream.deliverables.length} deliverables complete
        </p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Repository scope</h2>
          {workstream.repository_scope.length > 0 ? (
            <pre className="whitespace-pre-wrap rounded border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-700">
              {workstream.repository_scope.join('\n')}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">Not specified.</p>
          )}

          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Goal</h2>
          <p className="text-sm text-zinc-700">{workstream.goal || 'Not specified.'}</p>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Guardrail</h2>
          <p className="text-sm text-zinc-700">{workstream.guardrail || 'Not specified.'}</p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Deliverables</h2>
          <DeliverableChecklist workstreamId={workstream.id} deliverables={workstream.deliverables} canEdit={canEdit} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Artifacts</h2>
        <p className="text-xs text-zinc-500">
          Evidence attached by a consultant after working externally (e.g. with Claude Code against a cloned
          modernization workbench). The real generated files live in that external repo/PR — this is a link plus a
          summary, not a file store.
        </p>

        <div className="flex flex-col gap-3">
          {artifacts.map((a) => (
            <div key={a.id} className="rounded border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{a.title}</h3>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {ARTIFACT_TYPE_LABELS[a.artifact_type] ?? a.artifact_type}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {a.external_tool && <>via {a.external_tool} · </>}
                {new Date(a.created_at).toLocaleString()}
              </p>
              {a.content && <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-zinc-700">{a.content}</pre>}
              {a.external_url && (
                <a href={a.external_url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-blue-700 underline">
                  {a.external_url}
                </a>
              )}
              {a.notes && <p className="mt-2 text-sm text-zinc-600">{a.notes}</p>}
            </div>
          ))}
          {artifacts.length === 0 && <p className="text-sm text-zinc-500">No artifacts attached yet.</p>}
        </div>

        {canAttach && <AttachArtifactForm workstreamId={workstream.id} />}
      </section>
    </div>
  )
}
