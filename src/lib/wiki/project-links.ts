import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Project-Aware Knowledge and Assistant Context, Stage 1 -- mirrors
// src/lib/wiki/relations.ts's exact shape (two plain queries rather than an
// embedded Postgrest join, since our hand-written Relationships: [] table
// types don't carry FK constraint names for Postgrest to resolve).

export async function linkProjectArticle(supabase: SupabaseClient<Database>, projectId: string, wikiArticleId: string, attachedBy: string) {
  const { error } = await supabase
    .from('project_wiki_articles')
    .insert({ project_id: projectId, wiki_article_id: wikiArticleId, relationship: null, attached_by: attachedBy })
  if (error) throw error
}

export async function unlinkProjectArticle(supabase: SupabaseClient<Database>, linkId: string) {
  const { error } = await supabase.from('project_wiki_articles').delete().eq('id', linkId)
  if (error) throw error
}

export async function getProjectsForArticle(supabase: SupabaseClient<Database>, wikiArticleId: string) {
  const { data: links, error } = await supabase
    .from('project_wiki_articles')
    .select('id, project_id')
    .eq('wiki_article_id', wikiArticleId)
  if (error) throw error
  if (!links || links.length === 0) return []

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', links.map((l) => l.project_id))
  if (projectsError) throw projectsError

  const byId = new Map((projects ?? []).map((p) => [p.id, p]))
  return links.map((l) => ({ linkId: l.id, project: byId.get(l.project_id) ?? null })).filter((l) => l.project !== null)
}

// For the project detail page's Wiki-articles list -- the reverse direction
// of getProjectsForArticle.
export async function listArticlesForProject(supabase: SupabaseClient<Database>, projectId: string) {
  const { data: links, error } = await supabase
    .from('project_wiki_articles')
    .select('id, wiki_article_id')
    .eq('project_id', projectId)
  if (error) throw error
  if (!links || links.length === 0) return []

  const { data: articles, error: articlesError } = await supabase
    .from('wiki_articles')
    .select('id, slug, title, status, visibility_scope')
    .in('id', links.map((l) => l.wiki_article_id))
  if (articlesError) throw articlesError

  const byId = new Map((articles ?? []).map((a) => [a.id, a]))
  return links.map((l) => ({ linkId: l.id, article: byId.get(l.wiki_article_id) ?? null })).filter((l) => l.article !== null)
}
