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

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: false })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let viewerRole: string | undefined
  let membershipByProject = new Map<string, string>()
  if (user) {
    const [{ data: viewerProfile }, { data: memberships }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('project_members').select('project_id, role').eq('user_id', user.id),
    ])
    viewerRole = viewerProfile?.role
    membershipByProject = new Map((memberships ?? []).map((m) => [m.project_id, m.role]))
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
        <h1 className="text-xl font-semibold">Projects</h1>
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
