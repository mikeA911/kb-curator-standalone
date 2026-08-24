import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function linkRelatedPost(supabase: SupabaseClient<Database>, fromPostId: string, toPostId: string) {
  const { error } = await supabase.from('blog_relations').insert({ from_post_id: fromPostId, to_post_id: toPostId, relation_type: 'related' })
  if (error) throw error
}

export async function unlinkRelatedPost(supabase: SupabaseClient<Database>, relationId: string) {
  const { error } = await supabase.from('blog_relations').delete().eq('id', relationId)
  if (error) throw error
}

// Relations are stored directionally but displayed symmetrically -- a post
// shows up as "related" on both ends of a link. Two plain queries (relation
// rows, then the referenced posts) rather than a Postgrest embedded join --
// same reasoning as src/lib/wiki/relations.ts::getRelatedArticles: with two
// FKs from blog_relations to blog_posts, an embedded select needs the exact
// constraint name and doesn't type-check cleanly against our hand-written
// (Relationships: []) table types.
//
// publicOnly scopes the *displayed* posts to status='published' -- the
// public article page must never surface a still-draft related target,
// while the editor (publicOnly: false) shows everything the curator/admin
// picked, including a draft they're pre-linking before its own publication.
export async function getRelatedPosts(supabase: SupabaseClient<Database>, postId: string, publicOnly: boolean) {
  const [{ data: outgoing, error: outErr }, { data: incoming, error: inErr }] = await Promise.all([
    supabase.from('blog_relations').select('id, to_post_id').eq('from_post_id', postId),
    supabase.from('blog_relations').select('id, from_post_id').eq('to_post_id', postId),
  ])
  if (outErr) throw outErr
  if (inErr) throw inErr

  const relationIds = [
    ...(outgoing ?? []).map((r) => ({ relationId: r.id, postId: r.to_post_id })),
    ...(incoming ?? []).map((r) => ({ relationId: r.id, postId: r.from_post_id })),
  ]
  if (relationIds.length === 0) return []

  let query = supabase.from('blog_posts').select('id, slug, title, status').in(
    'id',
    relationIds.map((r) => r.postId)
  )
  if (publicOnly) query = query.eq('status', 'published')
  const { data: posts, error: postsError } = await query
  if (postsError) throw postsError

  const byId = new Map((posts ?? []).map((p) => [p.id, p]))
  return relationIds
    .map((r) => ({ relationId: r.relationId, post: byId.get(r.postId) ?? null }))
    .filter((r): r is { relationId: string; post: NonNullable<typeof r.post> } => r.post !== null)
}
