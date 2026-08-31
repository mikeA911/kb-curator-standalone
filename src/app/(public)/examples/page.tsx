import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listPublicProjects } from '@/lib/projects/public'
import { ShowcaseJourney } from '@/components/public/ShowcaseJourney'
import type { ProjectType } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  learning: 'Learning',
  experiment: 'AI Experiment',
  consulting: 'Client / Consulting',
  transformation: 'Internal Transformation',
  knowledge: 'Knowledge',
}

export default async function ExamplesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  const supabase = await createClient()
  const projects = await listPublicProjects(supabase, { type: type as ProjectType | undefined })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Examples</h1>
        <p className="mt-1 text-sm text-zinc-600">Deliberately published projects &mdash; the problem, the approach, and the results.</p>
      </div>

      <ShowcaseJourney variant="compact" />

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Published Examples catalogue</h2>
        <p className="mt-1 text-xs text-zinc-500">The complete, database-backed list of published Example Projects.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/examples" className={`rounded-full px-3 py-1 ${!type ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}>
          All
        </Link>
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={`/examples?type=${value}`}
            className={`rounded-full px-3 py-1 ${type === value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/examples/${p.public_slug}`} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{p.public_profile?.title || p.name}</h3>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {TYPE_LABELS[p.project_type] ?? p.project_type}
              </span>
            </div>
            {p.public_profile?.summary && <p className="mt-1 text-sm text-zinc-600">{p.public_profile.summary}</p>}
            {p.published_at && (
              <p className="mt-2 text-xs text-zinc-400">Published {new Date(p.published_at).toLocaleDateString()}</p>
            )}
          </Link>
        ))}
        {projects.length === 0 && <p className="text-sm text-zinc-500 sm:col-span-2">No published examples yet.</p>}
      </div>
    </div>
  )
}
