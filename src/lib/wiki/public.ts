import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WikiCategoryId } from '@/types/database'
import { listPublicProjects, type PublicProjectRow } from '@/lib/projects/public'

// Narrow-select query layer for anonymous/public reads -- mirrors
// getQuickHelpBySlug's pattern (src/lib/wiki/help.ts), not the select('*')
// helpers in queries.ts. wiki_versions carries several internal-process
// columns (source_chunk_ids point at potentially private document chunks;
// created_by/approved_by are reviewer identities; ai_provider/ai_model/
// ai_generated_at/verification_status are internal generation metadata) --
// none of those belong on the public path even though RLS permits the row.
//
// As in src/lib/projects/public.ts: the hand-authored Database type doesn't
// give supabase-js's select-string inference enough structure to resolve
// real per-column types (it silently degrades to `any`), so these explicit
// row interfaces + casts are the actual TS-level safety net. The runtime
// column list sent to Postgrest is exactly what's written below regardless.
export interface PublicArticleRow {
  id: string
  slug: string
  title: string
  category: WikiCategoryId
  short_description: string | null
  current_version_id: string | null
}

export interface PublicVersionRow {
  id: string
  quick_help: string
  content: string
  implementation_notes: string | null
  limitations: string | null
}

const PUBLIC_ARTICLE_COLUMNS = 'id, slug, title, category, short_description, current_version_id'
const PUBLIC_VERSION_COLUMNS = 'id, quick_help, content, implementation_notes, limitations'

export interface PublicArticleFilter {
  category?: WikiCategoryId
  search?: string
}

export async function getPublicArticleBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data, error } = await supabase
    .from('wiki_articles')
    .select(PUBLIC_ARTICLE_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'approved')
    .eq('is_public', true)
    .maybeSingle()
  if (error) throw error
  const article = data as PublicArticleRow | null
  if (!article || !article.current_version_id) return null

  const { data: versionData, error: versionError } = await supabase
    .from('wiki_versions')
    .select(PUBLIC_VERSION_COLUMNS)
    .eq('id', article.current_version_id)
    .maybeSingle()
  if (versionError) throw versionError
  const version = versionData as PublicVersionRow | null
  if (!version) return null

  return { article, version }
}

export async function listPublicArticles(supabase: SupabaseClient<Database>, filter: PublicArticleFilter = {}) {
  let query = supabase
    .from('wiki_articles')
    .select(PUBLIC_ARTICLE_COLUMNS)
    .eq('status', 'approved')
    .eq('is_public', true)
    .order('title', { ascending: true })

  if (filter.category) query = query.eq('category', filter.category)
  if (filter.search) query = query.or(`title.ilike.%${filter.search}%,short_description.ilike.%${filter.search}%`)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PublicArticleRow[]
}

// The reverse of the Example -> Wiki link already rendered on
// /examples/[slug] ("Related Knowledge", via public_profile.relatedWikiSlugs)
// -- reuses the exact same slug-array relationship rather than a new join
// table, per the design note's "use relationships, don't duplicate content."
// listPublicProjects is small (a handful of published examples at most), so
// a full fetch + in-memory filter is simpler than threading a new query
// param through projects/public.ts for one caller.
export async function listRelatedExamples(supabase: SupabaseClient<Database>, articleSlug: string): Promise<PublicProjectRow[]> {
  const projects = await listPublicProjects(supabase)
  return projects.filter((p) => p.public_profile?.relatedWikiSlugs?.includes(articleSlug))
}
