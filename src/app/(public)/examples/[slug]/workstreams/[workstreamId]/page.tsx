import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPublicProjectBySlug } from '@/lib/projects/public'
import { getPublicWorkstreamById, listPublicArtifacts, listPublicAssessmentSummariesForProject } from '@/lib/projects/public-workstreams'
import { DeliverableChecklist } from '@/components/projects/DeliverableChecklist'
import { CopyArtifactButton } from '@/components/projects/CopyArtifactButton'
import { Markdown } from '@/components/shared/Markdown'
import type { ArtifactType } from '@/types/database'

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  capability_inventory: 'Capability Inventory',
  endpoint_inventory: 'Endpoint Inventory',
  openapi_spec: 'OpenAPI Spec',
  mcp_server: 'MCP Server',
  evidence_map: 'Evidence Map',
  test_results: 'Test Results',
  findings: 'Findings',
  design_note: 'Design Note',
  other: 'Other',
}

const STATUS_LABEL: Record<string, string> = { completed: 'Completed' }

// Public sibling of (app)/projects/[id]/workstreams/[workstreamId]/page.tsx --
// same content, read-only (no edit forms, no "Add a note" links, no
// AttachArtifactForm). Only reachable when the parent project has opted in
// to public_full_detail (see setPublicFullDetailAction); notFound()
// otherwise, matching the RLS that would return an empty row anyway.
export default async function PublicWorkstreamDetailPage({
  params,
}: {
  params: Promise<{ slug: string; workstreamId: string }>
}) {
  const { slug, workstreamId } = await params
  const supabase = await createClient()

  const project = await getPublicProjectBySlug(supabase, slug)
  if (!project || !project.public_full_detail) notFound()

  const workstream = await getPublicWorkstreamById(supabase, workstreamId)
  if (!workstream || workstream.project_id !== project.id) notFound()

  const [artifacts, assessmentSummaries] = await Promise.all([
    listPublicArtifacts(supabase, workstreamId),
    listPublicAssessmentSummariesForProject(supabase, project.id),
  ])

  const completedCount = workstream.deliverables.filter((d) => d.completed).length

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/examples/${slug}`} className="text-sm underline">
          &larr; {project.public_profile?.title || project.name}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-semibold">{workstream.name}</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{workstream.status}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {completedCount}/{workstream.deliverables.length} deliverables complete
        </p>
      </div>

      {workstream.summary && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
          <div className="rounded border border-zinc-200 bg-white p-4">
            <Markdown text={workstream.summary} />
          </div>
        </section>
      )}

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

          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Guardrail</h2>
          {workstream.guardrail ? <Markdown text={workstream.guardrail} /> : <p className="text-sm text-zinc-500">Not specified.</p>}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Deliverables</h2>
          <DeliverableChecklist workstreamId={workstream.id} deliverables={workstream.deliverables} canEdit={false} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">System Understanding</h2>
        {assessmentSummaries.length === 0 ? (
          <p className="text-sm text-zinc-500">No assessment published yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {assessmentSummaries.map(({ assessment, activeVersion, questionCount, responses }) => (
              <div key={assessment.id} className="rounded border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{assessment.name}</h3>
                    {activeVersion && (
                      <p className="text-xs text-zinc-500">
                        Version {activeVersion.version_number} · {questionCount} question{questionCount === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  {activeVersion && (
                    <Link href={`/examples/${slug}/assessments/${assessment.id}`} className="shrink-0 text-sm text-blue-700 underline">
                      View Assessment
                    </Link>
                  )}
                </div>
                {assessment.description && <p className="mt-2 text-sm text-zinc-600">{assessment.description}</p>}
                {activeVersion && (
                  <ul className="mt-3 flex flex-col gap-1 text-sm">
                    {responses.length === 0 && <li className="text-zinc-500">No completed responses yet.</li>}
                    {responses.map((r) => (
                      <li key={r.participantLabel} className="flex items-center justify-between gap-2">
                        <span>{r.participantLabel}</span>
                        <span className="text-green-700">{STATUS_LABEL.completed}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Artifacts</h2>
        <div className="flex flex-col gap-3">
          {artifacts.map((a) => (
            <details key={a.id} id={a.id} className="group rounded border border-zinc-200 bg-white p-4 scroll-mt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-3 w-3 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" fill="currentColor">
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
                <div className="mt-2">
                  <div className="mb-1 flex justify-end">
                    <CopyArtifactButton title={a.title} content={a.content} />
                  </div>
                  <div className="rounded border border-zinc-100 bg-zinc-50 p-3">
                    <Markdown text={a.content} />
                  </div>
                </div>
              )}
              {a.external_url &&
                (/^https?:\/\//i.test(a.external_url) ? (
                  <a href={a.external_url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-blue-700 underline">
                    {a.external_url}
                  </a>
                ) : (
                  <p className="mt-2 font-mono text-xs text-zinc-500">
                    {a.external_url} <span className="italic text-zinc-400">(local path, not a link)</span>
                  </p>
                ))}
              {a.notes && (
                <div className="mt-2 border-t border-zinc-100 pt-2">
                  <Markdown text={a.notes} />
                </div>
              )}
            </details>
          ))}
          {artifacts.length === 0 && <p className="text-sm text-zinc-500">No artifacts attached yet.</p>}
        </div>
      </section>
    </div>
  )
}
