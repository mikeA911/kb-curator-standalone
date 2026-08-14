import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TrendingStatus } from '@/types/database'

export interface ListTrendingItemsFilter {
  tag?: string
  projectId?: string
}

// RLS (trending_items_select_visible) already scopes rows to what the
// caller can see -- platform-visibility items, their own project's
// project-visibility items, or explicitly public ones. This just adds the
// optional tag/project narrowing on top.
export async function listTrendingItems(supabase: SupabaseClient<Database>, filter: ListTrendingItemsFilter = {}) {
  let query = supabase.from('trending_items').select('*').order('created_at', { ascending: false })
  if (filter.tag) query = query.contains('tags', [filter.tag])
  if (filter.projectId) query = query.eq('project_id', filter.projectId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getTrendingItemById(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase.from('trending_items').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export interface TrendingCommentWithAuthor {
  id: string
  trending_item_id: string
  author_id: string | null
  body: string
  created_at: string
  updated_at: string | null
  author: { id: string; email: string | null } | null
}

// Two plain queries, not an embedded select -- same reasoning as listWikiLinks.
export async function listComments(
  supabase: SupabaseClient<Database>,
  trendingItemId: string
): Promise<TrendingCommentWithAuthor[]> {
  const { data: comments, error } = await supabase
    .from('trending_comments')
    .select('id, trending_item_id, author_id, body, created_at, updated_at')
    .eq('trending_item_id', trendingItemId)
    .order('created_at', { ascending: true })
  if (error) throw error
  if (!comments || comments.length === 0) return []

  const authorIds = [...new Set(comments.map((c) => c.author_id).filter((id): id is string => !!id))]
  const { data: authors, error: authorsError } =
    authorIds.length > 0
      ? await supabase.from('profiles').select('id, email').in('id', authorIds)
      : { data: [], error: null }
  if (authorsError) throw authorsError

  const byId = new Map((authors ?? []).map((a) => [a.id, a]))
  return comments.map((c) => ({ ...c, author: c.author_id ? (byId.get(c.author_id) ?? null) : null }))
}

export interface TrendingWikiLinkWithArticle {
  id: string
  wiki_article_id: string
  linked_by: string | null
  created_at: string
  article: { id: string; slug: string; title: string } | null
}

// Two plain queries rather than a Postgrest embedded join -- same reasoning
// as getRelatedArticles (src/lib/wiki/relations.ts): the hand-written
// Database type's Relationships: [] means an embedded select doesn't
// type-check cleanly against it.
export async function listWikiLinks(
  supabase: SupabaseClient<Database>,
  trendingItemId: string
): Promise<TrendingWikiLinkWithArticle[]> {
  const { data: links, error } = await supabase
    .from('trending_wiki_links')
    .select('id, wiki_article_id, linked_by, created_at')
    .eq('trending_item_id', trendingItemId)
  if (error) throw error
  if (!links || links.length === 0) return []

  const { data: articles, error: articlesError } = await supabase
    .from('wiki_articles')
    .select('id, slug, title')
    .in('id', links.map((l) => l.wiki_article_id))
  if (articlesError) throw articlesError

  const byId = new Map((articles ?? []).map((a) => [a.id, a]))
  return links.map((l) => ({ ...l, article: byId.get(l.wiki_article_id) ?? null }))
}

// Candidates for the "link to Wiki" picker on a Trending item -- everything
// non-archived, same shape/exclusion rule as listArticlesForLinking
// (src/lib/wiki/queries.ts) but with no "exclude self" id, since we're
// linking from a Trending item, not from another Wiki article.
export async function listWikiArticlesForLinking(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('wiki_articles')
    .select('id, slug, title, status')
    .neq('status', 'archived')
    .order('title', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Curator/admin "Needs Attention" feed -- items awaiting a promotion
// decision. RLS already scopes to what the caller can curate/see.
export async function listTrendingUnderReview(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('trending_items')
    .select('id, title, status, created_at')
    .eq('status', 'under_review' as TrendingStatus)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTrendingStats(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from('trending_items').select('status')
  if (error) throw error
  const rows = data ?? []
  return { total: rows.length, active: rows.filter((r) => r.status === 'active').length }
}
