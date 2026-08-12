import Link from 'next/link'
import type { WikiArticleStatus, WikiCategoryId } from '@/types/database'

const STATUS_STYLES: Record<WikiArticleStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  archived: 'bg-zinc-200 text-zinc-500',
}

export interface UnpublishedWikiArticleRow {
  id: string
  slug: string
  title: string
  category: WikiCategoryId
  status: WikiArticleStatus
  is_public: boolean
  updated_at: string
}

// Shared by /dashboard and /admin -- both are places a curator or admin
// checks in on outstanding work, and "edited but not live" is exactly that:
// a draft, or a change already submitted for review, sitting on an article
// whose published (status='approved') content -- if any -- is still what
// the public and other consultants see.
export function UnpublishedWikiWidget({ articles }: { articles: UnpublishedWikiArticleRow[] }) {
  return (
    <div className="rounded border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="font-medium">Wiki: edited, not yet published</h2>
        <Link href="/wiki" className="text-sm text-zinc-500 hover:text-zinc-900">
          View all
        </Link>
      </div>
      {articles.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">Nothing pending -- every article matches its last approved version.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Article</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Was public</th>
              <th className="px-4 py-2 font-medium">Last edited</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/wiki/${article.slug}`} className="font-medium hover:underline">
                    {article.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[article.status]}`}>
                    {article.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-zinc-600">{article.is_public ? 'Yes' : '—'}</td>
                <td className="px-4 py-2 text-zinc-500">{new Date(article.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
