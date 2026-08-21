import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Narrow-select query layer for anonymous/public reads -- mirrors
// src/lib/wiki/public.ts's pattern. No author_id/status/created_at/
// updated_at: internal-only fields, same "don't leak reviewer/internal
// metadata" reasoning as the Wiki public module.
export interface PublicBlogPostSummary {
  id: string
  slug: string
  title: string
  excerpt: string | null
  published_at: string | null
}

export interface PublicBlogPost extends PublicBlogPostSummary {
  content: string
}

const SUMMARY_COLUMNS = 'id, slug, title, excerpt, published_at'
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, content`

export async function listPublishedPosts(supabase: SupabaseClient<Database>): Promise<PublicBlogPostSummary[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PublicBlogPostSummary[]
}

export async function getPublishedPostBySlug(supabase: SupabaseClient<Database>, slug: string): Promise<PublicBlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw error
  return data as PublicBlogPost | null
}
