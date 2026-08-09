import { createClient } from '@/lib/supabase/server'
import { listCategories } from '@/lib/wiki/queries'
import { NewArticleForms } from '@/components/wiki/NewArticleForms'

export default async function NewWikiArticlePage() {
  const supabase = await createClient()

  const [categories, { data: chunks }] = await Promise.all([
    listCategories(supabase),
    supabase
      .from('document_chunks')
      .select('id, chunk_text, source_page, document_id')
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const documentIds = [...new Set((chunks ?? []).map((c) => c.document_id))]
  const { data: documents } = documentIds.length
    ? await supabase.from('documents').select('id, original_filename, doc_type').in('id', documentIds)
    : { data: [] }
  const documentById = new Map((documents ?? []).map((d) => [d.id, d]))

  const approvedChunks = (chunks ?? []).map((c) => ({
    ...c,
    document: documentById.get(c.document_id) ?? null,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">New Wiki article</h1>
      <NewArticleForms categories={categories} approvedChunks={approvedChunks} />
    </div>
  )
}
