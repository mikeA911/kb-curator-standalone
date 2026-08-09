import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listArticles, listCategories } from '@/lib/wiki/queries'
import type { WikiCategoryId } from '@/types/database'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  archived: 'bg-zinc-200 text-zinc-500',
}

export default async function WikiListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const { category, q } = await searchParams
  const supabase = await createClient()

  const [categories, articles] = await Promise.all([
    listCategories(supabase),
    listArticles(supabase, { category: category as WikiCategoryId | undefined, search: q }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Wiki</h1>
        <Link href="/wiki/new" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          New article
        </Link>
      </div>

      <form className="flex flex-wrap gap-2" action="/wiki">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search title or description…"
          className="w-64 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="rounded border border-zinc-300 px-3 py-2 text-sm">Search</button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/wiki"
          className={`rounded-full px-3 py-1 ${!category ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/wiki?category=${c.id}`}
            className={`rounded-full px-3 py-1 ${category === c.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/wiki/${article.slug}`}
            className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium">{article.title}</h2>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[article.status]}`}>
                {article.status}
              </span>
            </div>
            {article.short_description && (
              <p className="mt-1 text-sm text-zinc-600">{article.short_description}</p>
            )}
          </Link>
        ))}
        {articles.length === 0 && (
          <p className="text-sm text-zinc-500 sm:col-span-2">No articles yet.</p>
        )}
      </div>
    </div>
  )
}
