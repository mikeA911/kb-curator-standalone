import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectFindings } from '@/components/projects/ProjectFindings'
import { ProjectGoalForm } from '@/components/projects/ProjectGoalForm'
import { ProjectStatusSection } from '@/components/projects/ProjectStatusSection'
import { listWorkstreams } from '@/lib/projects/workstreams'
import { listProjectNotes } from '@/lib/projects/notes'
import { listAttachableKnowledgeBases } from '@/lib/knowledge-bases'
import { listKnowledgeBasesForProject } from '@/lib/projects/queries'
import { listArticlesForProject } from '@/lib/wiki/project-links'
import { KnowledgeBaseAttachManager, KnowledgeBaseDetachButton } from '@/components/projects/KnowledgeBaseAttachManager'
import { listRecentConversations } from '@/lib/chat/conversations'
import { ProjectAssistantSection } from '@/components/projects/ProjectAssistantSection'

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

  const [
    knowledgeBases,
    { data: evalDatasets },
    { data: viewerProfile },
    { data: viewerMembership },
    workstreams,
    openNotes,
    { data: approvalPolicies },
    { data: activeAuthorityAssignments },
    unattachedKnowledgeBases,
    linkedArticles,
    projectConversations,
    { data: statusHistory },
  ] = await Promise.all([
    listKnowledgeBasesForProject(supabase, id),
    supabase.from('eval_datasets').select('id, name, status').eq('project_id', id),
    user ? supabase.from('profiles').select('role').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user
      ? supabase.from('project_members').select('role').eq('project_id', id).eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
    listWorkstreams(supabase, id),
    user ? listProjectNotes(supabase, id, { status: 'open' }) : Promise.resolve([]),
    supabase.from('project_approval_policies').select('approval_type, requirement_status').eq('project_id', id),
    supabase.from('project_authority_assignments').select('approval_type').eq('project_id', id).eq('status', 'active'),
    listAttachableKnowledgeBases(supabase, id),
    listArticlesForProject(supabase, id),
    user ? listRecentConversations(supabase, user.id, { projectId: id }) : Promise.resolve([]),
    // RLS (project_status_history_select_curator) already limits this to
    // curator+ viewers -- an ungated fetch just returns empty for anyone
    // else, same as the rest of this page's queries.
    supabase.from('project_status_history').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ])
  const statusHistoryActorIds = [...new Set((statusHistory ?? []).map((h) => h.actor_id).filter((x): x is string => !!x))]
  const { data: statusHistoryActors } =
    statusHistoryActorIds.length > 0
      ? await supabase.from('profiles').select('id, email').in('id', statusHistoryActorIds)
      : { data: [] }
  const statusHistoryActorEmail = new Map((statusHistoryActors ?? []).map((p) => [p.id, p.email]))
  const canManage = viewerProfile?.role === 'admin' || viewerMembership?.role === 'owner'
  // Workstreams are curator+ manageable, not just owner -- matches
  // project_workstreams_manage_curator's can_curate_project RLS bar exactly.
  const canCurateWorkstreams = canManage || viewerMembership?.role === 'curator'
  // Same bar as approveProjectAction's own check -- curator or admin, by
  // either role system (platform role, or project role on this project).
  const canApprove =
    viewerProfile?.role === 'admin' ||
    viewerProfile?.role === 'curator' ||
    viewerMembership?.role === 'owner' ||
    viewerMembership?.role === 'curator'
  // "Draft" means "not yet approved" -- shown only to the creator or to
  // someone who could approve it. Everyone else sees no status badge while
  // it's in draft, matching the same rule on the Projects list page.
  const showStatusBadge = project.status !== 'draft' || project.owner_id === user?.id || canApprove

  const assignedTypes = new Set((activeAuthorityAssignments ?? []).map((a) => a.approval_type))
  const missingAuthorities = (approvalPolicies ?? []).filter(
    (p) => p.requirement_status === 'required' && !assignedTypes.has(p.approval_type)
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {project.visibility === 'public' && project.published_at && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Published</span>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
              <Link href={`/projects/${project.id}/members`} className="text-sm underline">
                Members
              </Link>
              <Link href={`/projects/${project.id}/access`} className="text-sm underline">
                Access &amp; Evidence
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

      <ProjectGoalForm projectId={project.id} goal={project.goal} canEdit={canManage} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Knowledge</h2>
        <p className="text-sm text-zinc-600">
          Platform Knowledge: <Link href="/wiki" className="underline">AI Engineering Wiki</Link>
        </p>
        {knowledgeBases.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {knowledgeBases.map((kb) => (
              <li key={kb.id} className="flex items-center gap-2">
                Project Knowledge: {kb.name}
                {canManage && <KnowledgeBaseDetachButton projectId={project.id} knowledgeBaseId={kb.id} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No project-specific knowledge base attached yet.</p>
        )}
        {canManage && <KnowledgeBaseAttachManager projectId={project.id} availableKnowledgeBases={unattachedKnowledgeBases} />}

        {linkedArticles.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {linkedArticles.map((l) =>
              l.article ? (
                <li key={l.linkId}>
                  Wiki:{' '}
                  <Link href={`/wiki/${l.article.slug}`} className="underline">
                    {l.article.title}
                  </Link>
                </li>
              ) : null
            )}
          </ul>
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Governance</h2>
          {canManage && (
            <Link href={`/projects/${project.id}/governance`} className="text-sm underline">
              Manage
            </Link>
          )}
        </div>
        {(approvalPolicies ?? []).length > 0 ? (
          <p className="text-sm text-zinc-600">
            {(approvalPolicies ?? []).length} approval {(approvalPolicies ?? []).length === 1 ? 'type' : 'types'} configured
            {missingAuthorities.length > 0 && (
              <span className="ml-1 font-medium text-amber-700">
                — {missingAuthorities.length} authority {missingAuthorities.length === 1 ? 'gap' : 'gaps'} (Authority needed)
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">No approval requirements configured for this project.</p>
        )}
      </section>

      {user && <ProjectAssistantSection projectId={project.id} recentConversations={projectConversations} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Status</h2>
        <ProjectStatusSection
          projectId={project.id}
          status={project.status}
          canApprove={canApprove}
          showStatus={showStatusBadge}
          history={(statusHistory ?? []).map((h) => ({
            fromStatus: h.from_status,
            toStatus: h.to_status,
            createdAt: h.created_at,
            actorEmail: h.actor_id ? (statusHistoryActorEmail.get(h.actor_id) ?? null) : null,
          }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Notes</h2>
          <div className="flex items-center gap-3">
            <Link href={`/projects/${project.id}/notes`} className="text-sm underline">
              + Add
            </Link>
            <Link href={`/projects/${project.id}/notes`} className="text-sm underline">
              {openNotes.length > 0 ? `${openNotes.length} open` : 'View all'}
            </Link>
          </div>
        </div>
        <ProjectFindings projectId={project.id} initialNotes={project.notes} />
        {openNotes.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {openNotes.slice(0, 5).map((note) => (
              <li key={note.id}>
                <Link href={`/projects/${project.id}/notes/${note.id}`} className="underline">
                  {note.subject}
                </Link>{' '}
                <span className="text-zinc-500">({note.author?.email ?? 'Unknown'})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No open notes.</p>
        )}
      </section>
    </div>
  )
}
