import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SectionHero } from '@/components/SectionHero'

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
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-zinc-200 text-zinc-500',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  curator: 'Curator',
  consultant: 'Consultant',
  viewer: 'Viewer',
}

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let viewerRole: string | undefined
  let membershipByProject = new Map<string, string>()
  let projects: { id: string; name: string; project_type: string; objective: string | null; status: string; visibility: string; published_at: string | null; owner_id: string | null }[] = []
  if (user) {
    const [{ data: viewerProfile }, { data: memberships }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('project_members').select('project_id, role').eq('user_id', user.id).eq('status', 'active'),
    ])
    viewerRole = viewerProfile?.role
    membershipByProject = new Map((memberships ?? []).map((m) => [m.project_id, m.role]))

    // My Projects means the viewer's own active memberships -- for
    // everyone, including admins/curators. is_project_member's RLS bypass
    // for platform admins would otherwise return every project here; the
    // Organization Portfolio (/projects/portfolio) is the deliberate,
    // safe-metadata-only place for staff to see across memberships.
    const projectIds = [...membershipByProject.keys()]
    if (projectIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('id, name, project_type, objective, status, visibility, published_at, owner_id')
        .in('id', projectIds)
        .order('created_at', { ascending: false })
      projects = data ?? []
    }
  }

  // "Draft" means "not yet approved" -- only meaningful to someone who
  // either created it (they know it's a work in progress) or could approve
  // it (they need to see what's pending). A plain viewer/consultant on a
  // draft project sees no status badge at all rather than "draft".
  function canSeeDraftBadge(p: { id: string; owner_id: string | null }): boolean {
    if (!user) return false
    if (p.owner_id === user.id) return true
    if (viewerRole === 'admin' || viewerRole === 'curator') return true
    const projectRole = membershipByProject.get(p.id)
    return projectRole === 'owner' || projectRole === 'curator'
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHero image="/images/sections/graph-workflow.png" height="compact" priority />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Projects</h1>
          {(viewerRole === 'admin' || viewerRole === 'curator') && (
            <Link href="/projects/portfolio" className="text-sm underline">
              View Organization Portfolio &rarr;
            </Link>
          )}
        </div>
        <Link href="/projects/new" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          New project
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(projects ?? []).map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{p.name}</h3>
              <div className="flex shrink-0 items-center gap-1.5">
                {membershipByProject.get(p.id) && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                    {ROLE_LABELS[membershipByProject.get(p.id)!] ?? membershipByProject.get(p.id)}
                  </span>
                )}
                {p.visibility === 'public' && p.published_at && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Published</span>
                )}
                {(p.status !== 'draft' || canSeeDraftBadge(p)) && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{TYPE_LABELS[p.project_type] ?? p.project_type}</p>
            {p.objective && <p className="mt-1 text-sm text-zinc-600">{p.objective}</p>}
          </Link>
        ))}
        {(projects ?? []).length === 0 && (
          <p className="text-sm text-zinc-500 sm:col-span-2">
            No projects yet, or none you&rsquo;re a member of. Create a project to organize AI engineering work --
            knowledge, evaluations, and results that belong together.
          </p>
        )}
      </div>
    </div>
  )
}
