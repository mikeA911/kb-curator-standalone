import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getTrendingItemById,
  listComments,
  listWikiLinks,
  listWikiArticlesForLinking,
} from '@/lib/trending/queries'
import { listCategories } from '@/lib/wiki/queries'
import { TrendingComments } from '@/components/trending/TrendingComments'
import { TrendingWikiLinker } from '@/components/trending/TrendingWikiLinker'
import { TrendingCuratorActions } from '@/components/trending/TrendingCuratorActions'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  under_review: 'bg-amber-100 text-amber-800',
  promoted: 'bg-blue-100 text-blue-700',
  archived: 'bg-zinc-200 text-zinc-500',
}

export default async function TrendingItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isCurator = profile?.role === 'curator' || profile?.role === 'admin'

  const item = await getTrendingItemById(supabase, id)
  if (!item) notFound()

  const [comments, wikiLinks, linkableArticles, categories] = await Promise.all([
    listComments(supabase, id),
    listWikiLinks(supabase, id),
    listWikiArticlesForLinking(supabase),
    isCurator ? listCategories(supabase) : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <a href={item.source_url} target="_blank" rel="noreferrer" className="underline">
              {item.source_name || item.source_url}
            </a>
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
          {item.status.replace('_', ' ')}
        </span>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Why it matters</h2>
        <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{item.description}</p>
        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 text-xs text-zinc-500">{item.tags.join(' · ')}</div>
        )}
      </div>

      <div className="rounded border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Related Wiki</h2>
        {wikiLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">None linked.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {wikiLinks.map((link) =>
              link.article ? (
                <li key={link.id}>
                  <Link href={`/wiki/${link.article.slug}`} className="underline">
                    {link.article.title}
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        )}
        <TrendingWikiLinker
          trendingItemId={id}
          articles={linkableArticles}
          excludeSlugs={wikiLinks.map((l) => l.article?.slug).filter((s): s is string => !!s)}
        />
      </div>

      {isCurator && item.status !== 'promoted' && item.status !== 'archived' && (
        <TrendingCuratorActions
          trendingItemId={id}
          status={item.status}
          title={item.title}
          description={item.description}
          categories={categories}
          existingArticles={linkableArticles.map((a) => ({ id: a.id, title: a.title }))}
        />
      )}

      <div className="rounded border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {comments.length} comment{comments.length === 1 ? '' : 's'}
        </h2>
        <TrendingComments trendingItemId={id} comments={comments} />
      </div>
    </div>
  )
}
