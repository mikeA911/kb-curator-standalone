import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getArticleBySlug, getLatestVersion } from '@/lib/wiki/queries'
import { EditDraftForm } from '@/components/wiki/EditDraftForm'

export default async function EditWikiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'curator' && profile?.role !== 'admin') redirect(`/wiki/${slug}`)

  const article = await getArticleBySlug(supabase, slug)
  if (!article) notFound()

  const latest = await getLatestVersion(supabase, article.id)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Edit: {article.title}</h1>
        {article.status === 'approved' && (
          <p className="mt-1 text-sm text-amber-700">
            This article is approved. Saving creates a new draft version — the currently approved content stays live
            until the new version is itself approved.
          </p>
        )}
      </div>
      <EditDraftForm articleId={article.id} slug={article.slug} initialVersion={latest} />
    </div>
  )
}
