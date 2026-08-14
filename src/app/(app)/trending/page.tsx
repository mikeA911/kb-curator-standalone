import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listTrendingItems } from '@/lib/trending/queries'

const SUGGESTED_TAGS = ['AI Agents', 'RAG', 'Models', 'Local AI', 'Evaluation', 'Governance', 'Engineering', 'Other']

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  under_review: 'bg-amber-100 text-amber-800',
  promoted: 'bg-blue-100 text-blue-700',
  archived: 'bg-zinc-200 text-zinc-500',
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

export default async function TrendingPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams
  const supabase = await createClient()
  const items = await listTrendingItems(supabase, { tag })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trending</h1>
          <p className="mt-1 text-sm text-zinc-600">What we&rsquo;re watching &mdash; external material worth examining, not yet knowledge.</p>
        </div>
        <Link href="/trending/new" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Submit to Trending
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/trending" className={`rounded-full px-3 py-1 ${!tag ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}>
          All
        </Link>
        {SUGGESTED_TAGS.map((t) => (
          <Link
            key={t}
            href={`/trending?tag=${encodeURIComponent(t)}`}
            className={`rounded-full px-3 py-1 ${tag === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
          >
            {t}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/trending/${item.id}`}
            className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium">{item.title}</h2>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                {item.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {item.source_name || new URL(item.source_url).hostname} &middot; submitted {timeAgo(item.created_at)}
            </p>
            <p className="text-sm text-zinc-700">{item.description}</p>
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 text-xs text-zinc-500">{item.tags.join(' · ')}</div>
            )}
          </Link>
        ))}
        {items.length === 0 && <p className="text-sm text-zinc-500 sm:col-span-2">Nothing here yet.</p>}
      </div>
    </div>
  )
}
