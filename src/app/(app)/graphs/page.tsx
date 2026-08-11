import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listActiveGraphs } from '@/lib/graph/queries'

export default async function GraphsPage() {
  const supabase = await createClient()
  const graphs = await listActiveGraphs(supabase)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Graphs</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Controlled execution graphs -- bounded retry loops that wrap the single-pass eval pipeline. No visual
          editor here on purpose: the trace is what matters.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {graphs.map((g) => (
          <Link key={g.id} href={`/graphs/${g.slug}`} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{g.name}</h3>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{g.graph_type}</span>
            </div>
            {g.description && <p className="mt-1 text-sm text-zinc-600">{g.description}</p>}
          </Link>
        ))}
        {graphs.length === 0 && <p className="text-sm text-zinc-500 sm:col-span-2">No active graphs yet.</p>}
      </div>
    </div>
  )
}
