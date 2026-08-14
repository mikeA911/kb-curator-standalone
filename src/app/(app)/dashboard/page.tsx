import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SectionHero } from '@/components/SectionHero'
import { UnpublishedWikiWidget } from '@/components/wiki/UnpublishedWikiWidget'
import { listUnpublishedArticles, getWikiStats } from '@/lib/wiki/queries'
import { getProjectStats } from '@/lib/projects/queries'
import { getEvalStats } from '@/lib/eval/queries'
import { getAgentStats } from '@/lib/agent/queries'
import { getNeedsAttention } from '@/lib/dashboard/needs-attention'
import { hasRequiredRole } from '@/lib/auth'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const canSeeWikiQueue = profile ? hasRequiredRole(profile.role, 'curator') : false

  const [unpublishedWikiArticles, projectStats, wikiStats, evalStats, agentStats, needsAttention] = await Promise.all([
    canSeeWikiQueue ? listUnpublishedArticles(supabase) : Promise.resolve([]),
    getProjectStats(supabase),
    getWikiStats(supabase),
    getEvalStats(supabase),
    getAgentStats(supabase),
    canSeeWikiQueue ? getNeedsAttention(supabase) : Promise.resolve([]),
  ])

  const summaryCards = [
    { label: 'Projects', href: '/projects', value: projectStats.total, subtitle: `${projectStats.active} active` },
    { label: 'Knowledge', href: '/wiki', value: wikiStats.total, subtitle: `${wikiStats.approved} approved` },
    { label: 'Evaluations', href: '/evals', value: evalStats.totalRuns, subtitle: `${evalStats.needReview} need review` },
    { label: 'Agents', href: '/agents', value: agentStats.total, subtitle: `${agentStats.active} active` },
  ]

  const attentionItems = needsAttention.filter((item) => item.count > 0)

  return (
    <div className="flex flex-col gap-8">
      <SectionHero image="/images/sections/kb-sandbox.png" height="compact" priority />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Workbench</h1>
        <Link href="/upload" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Sources &amp; Curation
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
            <div className="text-xs uppercase tracking-wide text-zinc-500">{card.label}</div>
            <div className="mt-1 text-3xl font-semibold">{card.value}</div>
            <div className="mt-1 text-sm text-zinc-600">{card.subtitle}</div>
          </Link>
        ))}
      </div>

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
    </div>
  )
}
