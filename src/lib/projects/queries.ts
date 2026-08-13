import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function getProjectStats(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from('projects').select('status')
  if (error) throw error
  const rows = data ?? []
  return { total: rows.length, active: rows.filter((p) => p.status === 'active').length }
}

// "Drafted a public presentation but hasn't published it" -- not just "any
// private project," since most projects are legitimately private forever
// (client work) and that'd make this permanently full of noise. This is
// specifically work sitting one click short of done.
export async function listProjectsWithDraftUpdates(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, public_profile')
    .eq('visibility', 'private')
    .not('public_profile', 'is', null)
    .order('name')
  if (error) throw error
  return data ?? []
}

export interface ProjectKnowledgeSummary {
  id: string
  name: string
  documentCount: number
  wikiArticleCount: number
}

// Projects with their own attached knowledge base (knowledge_bases.project_id
// set via attachKnowledgeBaseAction) -- as opposed to the platform-global AI
// Engineering Wiki, which every project can read but none of them own.
// Documents join via doc_type (a KB id); Wiki articles via knowledge_base_id.
export async function listProjectsWithKnowledge(supabase: SupabaseClient<Database>): Promise<ProjectKnowledgeSummary[]> {
  const { data: kbs, error: kbError } = await supabase
    .from('knowledge_bases')
    .select('id, project_id')
    .not('project_id', 'is', null)
  if (kbError) throw kbError
  if (!kbs || kbs.length === 0) return []

  const kbIdsByProject = new Map<string, string[]>()
  for (const kb of kbs) {
    const pid = kb.project_id as string
    kbIdsByProject.set(pid, [...(kbIdsByProject.get(pid) ?? []), kb.id])
  }
  const projectIds = [...kbIdsByProject.keys()]
  const allKbIds = kbs.map((kb) => kb.id)

  const [{ data: projects, error: projError }, { data: documents, error: docError }, { data: articles, error: articleError }] =
    await Promise.all([
      supabase.from('projects').select('id, name').in('id', projectIds),
      supabase.from('documents').select('doc_type').in('doc_type', allKbIds),
      supabase.from('wiki_articles').select('knowledge_base_id').in('knowledge_base_id', allKbIds),
    ])
  if (projError) throw projError
  if (docError) throw docError
  if (articleError) throw articleError

  return (projects ?? []).map((p) => {
    const kbIds = kbIdsByProject.get(p.id) ?? []
    return {
      id: p.id,
      name: p.name,
      documentCount: (documents ?? []).filter((d) => kbIds.includes(d.doc_type)).length,
      wikiArticleCount: (articles ?? []).filter((a) => kbIds.includes(a.knowledge_base_id ?? '')).length,
    }
  })
}
