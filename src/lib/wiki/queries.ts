import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WikiCategoryId } from '@/types/database'

export interface ListArticlesFilter {
  category?: WikiCategoryId
  search?: string
}

// Simple ILIKE title/short_description search -- no vector retrieval here,
// per the brief ("Initial Wiki search can be simple... Do not implement
// agentic Wiki retrieval yet").
export async function listArticles(supabase: SupabaseClient<Database>, filter: ListArticlesFilter = {}) {
  let query = supabase.from('wiki_articles').select('*').order('title', { ascending: true })

  if (filter.category) query = query.eq('category', filter.category)
  if (filter.search) query = query.or(`title.ilike.%${filter.search}%,short_description.ilike.%${filter.search}%`)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listCategories(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from('wiki_categories').select('*').order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getArticleBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data, error } = await supabase.from('wiki_articles').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function getArticleById(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase.from('wiki_articles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getVersion(supabase: SupabaseClient<Database>, versionId: string) {
  const { data, error } = await supabase.from('wiki_versions').select('*').eq('id', versionId).maybeSingle()
  if (error) throw error
  return data
}

// Every version for an article, newest first -- backs the version-history UI.
// verification_status / approved_at are enough to render "compare basic
// version metadata" per the brief without a full diff view.
export async function getVersionHistory(supabase: SupabaseClient<Database>, articleId: string) {
  const { data, error } = await supabase
    .from('wiki_versions')
    .select('id, version_number, generated_by, verification_status, created_by, created_at, approved_by, approved_at')
    .eq('wiki_article_id', articleId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return data ?? []
}

// The most recent version regardless of approval -- what a draft editor
// should load to continue working (as opposed to current_version_id, which
// only ever points at the last APPROVED version).
export async function getLatestVersion(supabase: SupabaseClient<Database>, articleId: string) {
  const { data, error } = await supabase
    .from('wiki_versions')
    .select('*')
    .eq('wiki_article_id', articleId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
