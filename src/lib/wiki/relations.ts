import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function linkRelatedArticle(supabase: SupabaseClient<Database>, fromArticleId: string, toArticleId: string) {
  const { error } = await supabase
    .from('wiki_relations')
    .insert({ from_article_id: fromArticleId, to_article_id: toArticleId, relation_type: 'related' })
  if (error) throw error
}

export async function unlinkRelatedArticle(supabase: SupabaseClient<Database>, relationId: string) {
  const { error } = await supabase.from('wiki_relations').delete().eq('id', relationId)
  if (error) throw error
}

// Relations are stored directionally but displayed symmetrically -- an
// article shows up as "related" on both ends of a link. Two plain queries
// (relation rows, then the referenced articles) rather than a Postgrest
// embedded join: with two FKs from wiki_relations to wiki_articles, an
// embedded select needs the exact constraint name and doesn't type-check
// cleanly against our hand-written (Relationships: []) table types.
export async function getRelatedArticles(supabase: SupabaseClient<Database>, articleId: string) {
  const [{ data: outgoing, error: outErr }, { data: incoming, error: inErr }] = await Promise.all([
    supabase.from('wiki_relations').select('id, to_article_id').eq('from_article_id', articleId),
    supabase.from('wiki_relations').select('id, from_article_id').eq('to_article_id', articleId),
  ])
  if (outErr) throw outErr
  if (inErr) throw inErr

  const relationIds = [
    ...(outgoing ?? []).map((r) => ({ relationId: r.id, articleId: r.to_article_id })),
    ...(incoming ?? []).map((r) => ({ relationId: r.id, articleId: r.from_article_id })),
  ]
  if (relationIds.length === 0) return []

  const { data: articles, error: articlesError } = await supabase
    .from('wiki_articles')
    .select('id, slug, title, category, status')
    .in('id', relationIds.map((r) => r.articleId))
  if (articlesError) throw articlesError

  const byId = new Map((articles ?? []).map((a) => [a.id, a]))
  return relationIds
    .map((r) => ({ relationId: r.relationId, article: byId.get(r.articleId) ?? null }))
    .filter((r) => r.article !== null)
}
