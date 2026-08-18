import { createClient } from '@/lib/supabase/server'
import { listCategories } from '@/lib/wiki/queries'
import { NewArticleForms } from '@/components/wiki/NewArticleForms'

export default async function NewWikiArticlePage() {
  const supabase = await createClient()

  const [categories, { data: chunks }, { data: artifactRows }] = await Promise.all([
    listCategories(supabase),
    supabase
      .from('document_chunks')
      .select('id, chunk_text, source_page, document_id')
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
    // RLS-scoped (workstream_artifacts_select_member) -- naturally limited to
    // artifacts on projects this viewer is a member of, or all of them if admin.
    supabase
      .from('workstream_artifacts')
      .select('id, title, content, workstream_id')
      .not('content', 'is', null)
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

  const workstreamIds = [...new Set((artifactRows ?? []).map((a) => a.workstream_id))]
  const { data: workstreamRows } = workstreamIds.length
    ? await supabase.from('project_workstreams').select('id, name, project_id').in('id', workstreamIds)
    : { data: [] }
  const projectIds = [...new Set((workstreamRows ?? []).map((w) => w.project_id))]
  const { data: projectRows } = projectIds.length
    ? await supabase.from('projects').select('id, name').in('id', projectIds)
    : { data: [] }
  const projectNameById = new Map((projectRows ?? []).map((p) => [p.id, p.name]))
  const workstreamById = new Map(
    (workstreamRows ?? []).map((w) => [w.id, { name: w.name, projectName: projectNameById.get(w.project_id) ?? null }])
  )

  const artifacts = (artifactRows ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    workstreamName: workstreamById.get(a.workstream_id)?.name ?? null,
    projectName: workstreamById.get(a.workstream_id)?.projectName ?? null,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">New Wiki article</h1>
      <NewArticleForms categories={categories} approvedChunks={approvedChunks} artifacts={artifacts} />
    </div>
  )
}
