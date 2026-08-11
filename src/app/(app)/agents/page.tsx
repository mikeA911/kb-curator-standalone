import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listActiveAgents } from '@/lib/agent/queries'
import { SectionHero } from '@/components/SectionHero'

export default async function AgentsPage() {
  const supabase = await createClient()
  const agents = await listActiveAgents(supabase)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  let canCreate = false
  if (user) {
    const { data: viewerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    canCreate = viewerProfile?.role === 'curator' || viewerProfile?.role === 'admin'
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHero image="/images/sections/agents.png" height="compact" priority />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Agents</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Governed configurations -- purpose, instructions, models, sources, guardrails -- that execute through a
            Graph. Created from an Agent Template, not hand-authored from scratch.
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-sm">
          <Link href="/agents/templates" className="underline">
            Templates
          </Link>
          {canCreate && (
            <Link href="/agents/new" className="underline">
              New Agent
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {agents.map((a) => (
          <Link key={a.id} href={`/agents/${a.slug}`} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{a.name}</h3>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{a.agent_type}</span>
            </div>
            {a.description && <p className="mt-1 text-sm text-zinc-600">{a.description}</p>}
          </Link>
        ))}
        {agents.length === 0 && <p className="text-sm text-zinc-500 sm:col-span-2">No active agents yet.</p>}
      </div>
    </div>
  )
}
