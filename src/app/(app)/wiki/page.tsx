import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listArticles, listCategories, getWikiStats } from '@/lib/wiki/queries'
import { listProjectsWithKnowledge } from '@/lib/projects/queries'
import { SectionHero } from '@/components/SectionHero'
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

  const [categories, articles, wikiStats, projectsWithKnowledge] = await Promise.all([
    listCategories(supabase),
    listArticles(supabase, { category: category as WikiCategoryId | undefined, search: q }),
    getWikiStats(supabase),
    listProjectsWithKnowledge(supabase),
  ])

  return (
    <div className="flex flex-col gap-6">
      <SectionHero image="/images/sections/ghibli_wiki.png" height="compact" priority />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Wiki</h1>
        <Link href="/wiki/new" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          New article
        </Link>
      </div>

      {/* Teaches the Platform-vs-Project distinction every time this page
          loads: Platform Knowledge is the shared AI Engineering Wiki below;
          Project Knowledge belongs to one project's own attached KB (set via
          attachKnowledgeBaseAction) and lives on that project's page. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Knowledge</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href="#browse" className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Platform Knowledge</div>
            <div className="mt-1 font-medium">AI Engineering Wiki</div>
            <div className="mt-2 text-sm text-zinc-600">
              {wikiStats.total} articles · {wikiStats.approved} approved
            </div>
          </a>
          {projectsWithKnowledge.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400"
            >
              <div className="text-xs uppercase tracking-wide text-zinc-500">Project Knowledge</div>
              <div className="mt-1 font-medium">{p.name}</div>
              <div className="mt-2 text-sm text-zinc-600">
                {p.wikiArticleCount} articles · {p.documentCount} sources
              </div>
            </Link>
          ))}
        </div>
        {projectsWithKnowledge.length === 0 && (
          <p className="text-sm text-zinc-500">
            No project has attached its own knowledge base yet — a project can attach one from its Knowledge section.
          </p>
        )}
      </section>

      <div id="browse" className="flex flex-col gap-6 scroll-mt-4">
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

        {articles.length === 0 && <p className="text-sm text-zinc-500">No articles yet.</p>}

        {/* Grouped by category only for the unfiltered/unsearched "All" view --
            recency is administrative metadata, category is knowledge architecture.
            A single active category or search already scopes to one concern, so
            grouping there would just be a group-of-one wrapped around the same list. */}
        {!category && !q ? (
          <div className="flex flex-col gap-6">
            {categories.map((cat) => {
              const inCategory = articles.filter((a) => a.category === cat.id)
              if (inCategory.length === 0) return null
              return (
                <div key={cat.id} className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{cat.name}</h2>
                  <ArticleGrid articles={inCategory} />
                </div>
              )
            })}
          </div>
        ) : (
          articles.length > 0 && <ArticleGrid articles={articles} />
        )}
      </div>
    </div>
  )
}

function ArticleGrid({ articles }: { articles: Awaited<ReturnType<typeof listArticles>> }) {
  return (
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
    </div>
  )
}
