import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getPublishedPostBySlug } from '@/lib/blog/public'
import { Markdown } from '@/components/shared/Markdown'

// This app's first per-page metadata (only the root layout sets any today)
// -- worth adding specifically for the Blog, where a real <title>/description
// per post matters for sharing and search in a way the rest of the app
// hasn't needed yet.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const post = await getPublishedPostBySlug(supabase, slug)
  if (!post) return {}
  return {
    title: `${post.title} | KB Sandbox Blog`,
    description: post.excerpt ?? undefined,
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const post = await getPublishedPostBySlug(supabase, slug)
  if (!post) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{post.title}</h1>
        {post.published_at && <p className="mt-1 text-sm text-zinc-500">{new Date(post.published_at).toLocaleDateString()}</p>}
      </div>

      <div className="rounded border border-zinc-200 bg-white p-5">
        <Markdown text={post.content} />
      </div>
    </div>
  )
}
