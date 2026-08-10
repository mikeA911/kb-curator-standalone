import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicArticleBySlug } from '@/lib/wiki/public'
import { MarkdownLite } from '@/components/wiki/MarkdownLite'

// No Sources section, no version history, no Edit link -- all staff-only
// concerns (and Sources would point at potentially private document
// chunks). Only the current approved version's own content.
export default async function PublicArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const result = await getPublicArticleBySlug(supabase, slug)
  if (!result) notFound()
  const { article, version } = result

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{article.title}</h1>
        {article.short_description && <p className="mt-1 text-zinc-600">{article.short_description}</p>}
      </div>

      <div className="rounded border border-zinc-200 bg-white p-5">
        <p className="mb-4 rounded bg-zinc-50 p-3 text-sm text-zinc-700">
          <span className="font-medium">Quick help: </span>
          {version.quick_help}
        </p>
        <MarkdownLite text={version.content} />
        {version.implementation_notes && (
          <div className="mt-4">
            <h3 className="font-semibold text-zinc-900">Implementation notes</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{version.implementation_notes}</p>
          </div>
        )}
        {version.limitations && (
          <div className="mt-4">
            <h3 className="font-semibold text-zinc-900">Limitations</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{version.limitations}</p>
          </div>
        )}
      </div>
    </div>
  )
}
