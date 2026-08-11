import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectNotes } from '@/components/projects/ProjectNotes'
import { listWorkstreams } from '@/lib/projects/workstreams'

const TYPE_LABELS: Record<string, string> = {
  learning: 'Learning',
  experiment: 'AI Experiment',
  consulting: 'Client / Consulting',
  transformation: 'Internal Transformation',
  knowledge: 'Knowledge',
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: knowledgeBases }, { data: evalDatasets }, { data: viewerProfile }, { data: viewerMembership }, workstreams] = await Promise.all([
    supabase.from('knowledge_bases').select('id, name').eq('project_id', id),
    supabase.from('eval_datasets').select('id, name, status').eq('project_id', id),
    user ? supabase.from('profiles').select('role').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user
      ? supabase.from('project_members').select('role').eq('project_id', id).eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
    listWorkstreams(supabase, id),
  ])
  const canManage = viewerProfile?.role === 'admin' || viewerMembership?.role === 'owner'
  // Workstreams are curator+ manageable, not just owner -- matches
  // project_workstreams_manage_curator's can_curate_project RLS bar exactly.
  const canCurateWorkstreams = canManage || viewerMembership?.role === 'curator'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{project.status}</span>
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
              <Link href={`/projects/${project.id}/members`} className="text-sm underline">
                Members
              </Link>
              <Link href={`/projects/${project.id}/publish`} className="text-sm underline">
                Publish
              </Link>
            </div>
          )}
          {project.visibility === 'public' && project.public_slug && (
            <Link href={`/examples/${project.public_slug}`} className="text-sm underline text-green-700">
              View public page
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">{TYPE_LABELS[project.project_type] ?? project.project_type}</p>
        {project.objective && <p className="mt-2 text-sm text-zinc-600">{project.objective}</p>}
        {Object.keys(project.details ?? {}).length > 0 && (
          <dl className="mt-3 flex flex-col gap-1 text-sm">
            {Object.entries(project.details as Record<string, string>).map(([k, v]) =>
              v ? (
                <div key={k} className="flex gap-2">
                  <dt className="capitalize text-zinc-500">{k.replace(/_/g, ' ')}:</dt>
                  <dd>{v}</dd>
                </div>
              ) : null
            )}
          </dl>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Knowledge</h2>
        <p className="text-sm text-zinc-600">
          Platform Knowledge: <Link href="/wiki" className="underline">AI Engineering Wiki</Link>
        </p>
        {(knowledgeBases ?? []).length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {knowledgeBases!.map((kb) => (
              <li key={kb.id}>Project Knowledge: {kb.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No project-specific knowledge base attached yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Evals</h2>
        {(evalDatasets ?? []).length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {evalDatasets!.map((d) => (
              <li key={d.id}>
                <Link href={`/evals/datasets/${d.id}`} className="underline">
                  {d.name}
                </Link>{' '}
                <span className="text-zinc-500">({d.status})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No benchmark attached yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Workstreams</h2>
          {canCurateWorkstreams && (
            <Link href={`/projects/${project.id}/workstreams/new`} className="text-sm underline">
              New Workstream
            </Link>
          )}
        </div>
        {workstreams.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {workstreams.map((w) => {
              const completed = w.deliverables.filter((d) => d.completed).length
              return (
                <li key={w.id}>
                  <Link href={`/projects/${project.id}/workstreams/${w.id}`} className="underline">
                    {w.name}
                  </Link>{' '}
                  <span className="text-zinc-500">
                    ({w.status} · {completed}/{w.deliverables.length} deliverables)
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No workstreams defined yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Notes / Findings</h2>
        <ProjectNotes projectId={project.id} initialNotes={project.notes} />
      </section>
    </div>
  )
}
