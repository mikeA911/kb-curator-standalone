import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SectionHero } from '@/components/SectionHero'
import { UnpublishedWikiWidget } from '@/components/wiki/UnpublishedWikiWidget'
import { NotesForYouWidget, type NoteForYouRow } from '@/components/projects/NotesForYouWidget'
import { SharedLinksWidget } from '@/components/trending/SharedLinksWidget'
import { listUnpublishedArticles, getWikiStats } from '@/lib/wiki/queries'
import { getProjectStats } from '@/lib/projects/queries'
import { getEvalStats } from '@/lib/eval/queries'
import { getAgentStats } from '@/lib/agent/queries'
import { getTrendingStats, listRecentSharedLinks } from '@/lib/trending/queries'
import { listNotesForUser } from '@/lib/projects/notes'
import { getNeedsAttention } from '@/lib/dashboard/needs-attention'
import { hasRequiredRole } from '@/lib/auth'
import { listMemberProjectOptions } from '@/lib/projects/queries'
import { listRecentConversations } from '@/lib/chat/conversations'
import { EmberHome, type RecentConversationRow } from '@/components/dashboard/EmberHome'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ ember?: string }> }) {
  const { ember: initialProjectId } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const canSeeWikiQueue = profile ? hasRequiredRole(profile.role, 'curator') : false
  const canSeeNotes = !!user && profile?.role !== 'anonymous'
  // Every active signed-in user, not just curators -- unlike the widgets
  // above, per the doc's own acceptance criterion #1.
  const canSeeSharedLinks = !!user && profile?.role !== 'anonymous'
  const isAdmin = profile?.role === 'admin'
  // Ember-first home (docs/dev-request-role-aware-project-views-and-ember-
  // first-workspace.md, View 3) -- ordinary members only. Admin/curator keep
  // today's Workbench dashboard unchanged. 'member' (OL-007) is exactly the
  // "ordinary member" case this was already named for.
  const isEmberFirst = profile?.role === 'consultant' || profile?.role === 'member'

  const [
    unpublishedWikiArticles,
    projectStats,
    wikiStats,
    evalStats,
    agentStats,
    trendingStats,
    needsAttention,
    notesForUser,
    sharedLinks,
    emberProjects,
    emberRecentConversations,
  ] = await Promise.all([
    canSeeWikiQueue ? listUnpublishedArticles(supabase) : Promise.resolve([]),
    getProjectStats(supabase),
    getWikiStats(supabase),
    getEvalStats(supabase),
    getAgentStats(supabase),
    getTrendingStats(supabase),
    canSeeWikiQueue ? getNeedsAttention(supabase) : Promise.resolve([]),
    canSeeNotes ? listNotesForUser(supabase, user!.id) : Promise.resolve([]),
    canSeeSharedLinks ? listRecentSharedLinks(supabase) : Promise.resolve([]),
    isEmberFirst ? listMemberProjectOptions(supabase, user!.id) : Promise.resolve([]),
    isEmberFirst ? listRecentConversations(supabase, user!.id, { limit: 5 }) : Promise.resolve([]),
  ])

  // Same "projects this user actually belongs to" query as trending/new/page.tsx
  // -- the Add-link form's project picker. A separate step, same pattern as
  // notesForYou's project-name lookup below.
  const { data: memberProjects } = canSeeSharedLinks
    ? await supabase.from('project_members').select('project_id').eq('user_id', user!.id)
    : { data: [] }
  const memberProjectIds = (memberProjects ?? []).map((m) => m.project_id)
  const { data: sharedLinkProjects } =
    memberProjectIds.length > 0
      ? await supabase.from('projects').select('id, name').in('id', memberProjectIds).order('name')
      : { data: [] }

  const projectIds = [...new Set(notesForUser.map((n) => n.project_id))]
  const { data: noteProjects } =
    projectIds.length > 0 ? await supabase.from('projects').select('id, name').in('id', projectIds) : { data: [] }
  const projectNameById = new Map((noteProjects ?? []).map((p) => [p.id, p.name]))

  // Same "resolve project names for a list of conversations" pattern as
  // notesForYou just above -- emberProjects already covers every currently
  // active membership, so a conversation bound to a Project the viewer has
  // since lost is simply labeled with whatever emberProjects doesn't have.
  const emberProjectNameById = new Map(emberProjects.map((p) => [p.id, p.name]))
  const emberRecentConversationRows: RecentConversationRow[] = emberRecentConversations.map((c) => ({
    id: c.id,
    title: c.title,
    projectId: c.project_id,
    projectName: c.project_id ? (emberProjectNameById.get(c.project_id) ?? null) : null,
  }))
  const notesForYou: NoteForYouRow[] = notesForUser.map((n) => ({
    id: n.id,
    projectId: n.project_id,
    projectName: projectNameById.get(n.project_id) ?? 'Unknown project',
    subject: n.subject,
    authorEmail: n.author?.email ?? null,
    createdAt: n.created_at,
  }))

  const summaryCards = [
    { label: 'Projects', href: '/projects', value: projectStats.total, subtitle: `${projectStats.active} active` },
    { label: 'Knowledge', href: '/wiki', value: wikiStats.total, subtitle: `${wikiStats.approved} approved` },
    { label: 'Evaluations', href: '/evals', value: evalStats.totalRuns, subtitle: `${evalStats.needReview} need review` },
    { label: 'Agents', href: '/agents', value: agentStats.total, subtitle: `${agentStats.active} active` },
    { label: 'Trending', href: '/trending', value: trendingStats.total, subtitle: `${trendingStats.active} active` },
  ]

  const attentionItems = needsAttention.filter((item) => item.count > 0)

  return (
    <div className="flex flex-col gap-8">
      <SectionHero image="/images/sections/kb-sandbox.png" height="compact" priority />

      {isEmberFirst ? (
        <EmberHome projects={emberProjects} recentConversations={emberRecentConversationRows} initialProjectId={initialProjectId} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Workbench</h1>
            <Link href="/upload" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              Sources &amp; Curation
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {summaryCards.map((card) => (
              <Link key={card.label} href={card.href} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
                <div className="text-xs uppercase tracking-wide text-zinc-500">{card.label}</div>
                <div className="mt-1 text-3xl font-semibold">{card.value}</div>
                <div className="mt-1 text-sm text-zinc-600">{card.subtitle}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {canSeeWikiQueue && (
        <div className="rounded border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Needs attention</h2>
          {attentionItems.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing needs attention right now.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {attentionItems.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-zinc-700 hover:underline">
                    <span className="font-medium">{item.count}</span> {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canSeeWikiQueue && <UnpublishedWikiWidget articles={unpublishedWikiArticles} />}
      {canSeeSharedLinks && <SharedLinksWidget links={sharedLinks} projects={sharedLinkProjects ?? []} isAdmin={isAdmin} />}
      {canSeeNotes && <NotesForYouWidget notes={notesForYou} />}
    </div>
  )
}
