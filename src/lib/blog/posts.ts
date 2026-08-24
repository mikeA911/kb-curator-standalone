import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BlogPost, Database } from '@/types/database'
import { BLOG_MEDIA_BUCKET } from '@/lib/blog/media'

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

// Candidate list for the related-posts picker -- only published posts, per
// the dev request's "select related published posts while editing" (a
// curator/admin can still see an already-linked draft target via
// getRelatedPosts, just can't add a new link to one from this list).
export async function listPublishablePostsForLinking(supabase: SupabaseClient<Database>, excludePostId: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, status')
    .eq('status', 'published')
    .neq('id', excludePostId)
    .order('title')
  if (error) throw error
  return data ?? []
}

// Cover image is a separate action from updatePost's content fields, but
// gated by the same status='draft' predicate for the same reason (Finding
// 1's fix, see updatePost's comment) -- a cover image is part of what the
// public sees, so swapping it on a published post must go through
// Unpublish first too, not silently replace live content.
export async function setCoverImage(supabase: SupabaseClient<Database>, id: string, path: string, alt: string): Promise<void> {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ cover_image_path: path, cover_image_alt: alt })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new BlogValidationError("This post's cover image can't be changed right now -- it may be published, submitted for review, or not yours.")
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
      last_editor_id: input.authorId,
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

// RLS silently no-ops a blocked update (0 rows, no error) rather than
// throwing, so any of the reasons a write can be blocked -- a curator
// hitting another curator's draft, their own draft after submitting it for
// review, or (below) a published post -- need an explicit check here, not
// just a hidden button (see blog_posts_update_own_eligible_draft in
// 20260823100001_blog_curator_workflow.sql).
//
// `.eq('status', 'draft')` is the "update predicate" enforcement called for
// in the dev request's Finding 1 fix: editing a published post must not
// silently replace live public content. It's deliberately a query
// predicate rather than a stricter RLS policy, because blog_posts_update_admin
// still needs unrestricted access for publish/unpublish/return-to-draft,
// which are separate functions that DO need to transition a row's status --
// see publishPost/unpublishPost below.
export async function updatePost(supabase: SupabaseClient<Database>, id: string, input: BlogPostFields, lastEditorId: string): Promise<void> {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ slug: input.slug, title: input.title, excerpt: input.excerpt, content: input.content, last_editor_id: lastEditorId })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()
  if (error) {
    if (error.code === '23505') throw new BlogValidationError('That slug is already in use -- choose a different one')
    throw error
  }
  if (!data) {
    throw new BlogValidationError(
      "This post can't be edited right now -- it may be published (unpublish it first), submitted for review, or not yours."
    )
  }
}

export async function submitPostForReview(supabase: SupabaseClient<Database>, id: string, submittedBy: string): Promise<void> {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ submitted_for_review_at: new Date().toISOString(), submitted_by: submittedBy })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new BlogValidationError('This draft is not eligible for submission right now.')
}

// Admin-only caller (enforced in the Server Action) -- clears the
// submission markers so the curator's own-draft RLS policy allows editing
// again.
export async function returnPostToDraft(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from('blog_posts').update({ submitted_for_review_at: null, submitted_by: null }).eq('id', id)
  if (error) throw error
}

export async function publishPost(supabase: SupabaseClient<Database>, id: string, publishedBy: string): Promise<void> {
  const { error } = await supabase
    .from('blog_posts')
    .update({ status: 'published', published_at: new Date().toISOString(), published_by: publishedBy })
    .eq('id', id)
  if (error) throw error
}

export async function unpublishPost(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  // Also clears any stale submission markers -- an unpublished post is back
  // to a fresh, editable draft, not still "awaiting review" for a
  // publish decision that already happened.
  const { error } = await supabase
    .from('blog_posts')
    .update({ status: 'draft', published_at: null, published_by: null, submitted_for_review_at: null, submitted_by: null })
    .eq('id', id)
  if (error) throw error
}

// Hard delete -- blog_relations references blog_posts(id) on delete cascade,
// so any related-post links are cleaned up automatically. This only ever
// runs on a post that was never published (checked here, not just trusted
// from the client, since RLS alone can't express "only while draft").
export async function deleteDraftPost(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const post = await getPostById(supabase, id)
  if (!post) return
  if (post.status !== 'draft') {
    throw new BlogValidationError('Only a draft post can be deleted -- unpublish it first.')
  }
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) throw error

  // Best-effort -- a storage failure here must not surface as a failed
  // delete (the post row is already gone). Curator/admin already has
  // delete rights on blog-media via blog_media_bucket_staff_delete, so the
  // caller's own RLS-scoped client is enough; no admin client needed.
  if (post.cover_image_path) {
    await supabase.storage
      .from(BLOG_MEDIA_BUCKET)
      .remove([post.cover_image_path])
      .catch(() => {})
  }
}
