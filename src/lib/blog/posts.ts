import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BlogPost, Database } from '@/types/database'

export class BlogValidationError extends Error {}

export async function listAllPosts(supabase: SupabaseClient<Database>): Promise<BlogPost[]> {
  const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPostById(supabase: SupabaseClient<Database>, id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export interface BlogPostFields {
  slug: string
  title: string
  excerpt: string | null
  content: string
}

export async function createDraftPost(
  supabase: SupabaseClient<Database>,
  input: BlogPostFields & { authorId: string }
): Promise<BlogPost> {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      author_id: input.authorId,
    })
    .select()
    .single()
  if (error) {
    // The unique constraint on blog_posts.slug is the actual enforcement --
    // no separate pre-check query, which would just race with a concurrent
    // insert. Same pattern as publishProject's public_slug handling.
    if (error.code === '23505') throw new BlogValidationError('That slug is already in use -- choose a different one')
    throw error
  }
  if (!data) throw new Error('Failed to create post')
  return data
}

export async function updatePost(supabase: SupabaseClient<Database>, id: string, input: BlogPostFields): Promise<void> {
  const { error } = await supabase
    .from('blog_posts')
    .update({ slug: input.slug, title: input.title, excerpt: input.excerpt, content: input.content })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') throw new BlogValidationError('That slug is already in use -- choose a different one')
    throw error
  }
}

export async function publishPost(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from('blog_posts').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function unpublishPost(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from('blog_posts').update({ status: 'draft', published_at: null }).eq('id', id)
  if (error) throw error
}

// Hard delete -- safe only because nothing references a blog post by id yet
// and this only ever runs on a post that was never published (checked here,
// not just trusted from the client, since RLS alone can't express "only
// while draft").
export async function deleteDraftPost(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const post = await getPostById(supabase, id)
  if (!post) return
  if (post.status !== 'draft') {
    throw new BlogValidationError('Only a draft post can be deleted -- unpublish it first.')
  }
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) throw error
}
