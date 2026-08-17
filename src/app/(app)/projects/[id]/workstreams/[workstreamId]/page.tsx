import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listArtifacts } from '@/lib/projects/workstreams'
import type { ArtifactType, ProjectWorkstream } from '@/types/database'
import { DeliverableChecklist } from '@/components/projects/DeliverableChecklist'
import { AttachArtifactForm } from '@/components/projects/AttachArtifactForm'
import { WorkstreamSummaryForm } from '@/components/projects/WorkstreamSummaryForm'
import { Markdown } from '@/components/shared/Markdown'

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  capability_inventory: 'Capability Inventory',
  endpoint_inventory: 'Endpoint Inventory',
  openapi_spec: 'OpenAPI Spec',
  mcp_server: 'MCP Server',
  evidence_map: 'Evidence Map',
  test_results: 'Test Results',
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

      <WorkstreamSummaryForm workstreamId={workstream.id} summary={workstream.summary} canEdit={canEdit} />

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
          {workstream.goal ? <Markdown text={workstream.goal} /> : <p className="text-sm text-zinc-500">Not specified.</p>}

          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Guardrail</h2>
          {workstream.guardrail ? <Markdown text={workstream.guardrail} /> : <p className="text-sm text-zinc-500">Not specified.</p>}

          <Link
            href={`/projects/${id}/notes?contextType=workstream&contextId=${workstream.id}`}
            className="self-start text-sm text-blue-700 underline"
          >
            Add a note about this workstream
          </Link>
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
            <details key={a.id} id={a.id} className="group rounded border border-zinc-200 bg-white p-4 scroll-mt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <svg
                    viewBox="0 0 20 20"
                    className="h-3 w-3 shrink-0 text-zinc-400 transition-transform group-open:rotate-90"
                    fill="currentColor"
                  >
                    <path d="M6 4l8 6-8 6V4z" />
                  </svg>
                  <h3 className="font-medium">{a.title}</h3>
                </span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {ARTIFACT_TYPE_LABELS[a.artifact_type] ?? a.artifact_type}
                </span>
              </summary>
              <p className="mt-1 text-xs text-zinc-500">
                {a.external_tool && <>via {a.external_tool} · </>}
                {new Date(a.created_at).toLocaleString()}
              </p>
              {a.content && (
                <div className="mt-2 rounded border border-zinc-100 bg-zinc-50 p-3">
                  <Markdown text={a.content} />
                </div>
              )}
              {a.external_url && (
                /^https?:\/\//i.test(a.external_url) ? (
                  <a href={a.external_url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-blue-700 underline">
                    {a.external_url}
                  </a>
                ) : (
                  <p className="mt-2 font-mono text-xs text-zinc-500" title="Not a public URL -- a local filesystem path can't be opened from the browser.">
                    {a.external_url} <span className="italic text-zinc-400">(local path, not a link)</span>
                  </p>
                )
              )}
              {a.notes && (
                <div className="mt-2 border-t border-zinc-100 pt-2">
                  <Markdown text={a.notes} />
                </div>
              )}
              <Link
                href={`/projects/${id}/notes?contextType=workstream_artifact&contextId=${a.id}`}
                className="mt-2 inline-block text-xs text-blue-700 underline"
              >
                Add a note about this artifact
              </Link>
            </details>
          ))}
          {artifacts.length === 0 && <p className="text-sm text-zinc-500">No artifacts attached yet.</p>}
        </div>

        {canAttach && <AttachArtifactForm workstreamId={workstream.id} />}
      </section>
    </div>
  )
}
