import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { listPublishedPosts } from '@/lib/blog/public'
import { getBlogMediaUrl } from '@/lib/blog/media'
import { SectionHero } from '@/components/SectionHero'
import { env } from '@/lib/env'

const DESCRIPTION = 'Notes on building, evaluating, and deploying KB Sandbox.'

export function generateMetadata(): Metadata {
  const url = `${env.siteUrl()}/blog`
  return {
    title: 'Blog | KB Sandbox',
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { title: 'KB Sandbox Blog', description: DESCRIPTION, url, type: 'website' },
    twitter: { card: 'summary', title: 'KB Sandbox Blog', description: DESCRIPTION },
  }
}

export default async function BlogIndexPage() {
  const supabase = await createClient()
  const posts = await listPublishedPosts(supabase)

  return (
    <div className="flex flex-col gap-6">
      <SectionHero image="/images/sections/front-page-ghibli.png" height="standard" priority />

      <div>
        <h1 className="text-xl font-semibold">Blog</h1>
        <p className="mt-1 text-sm text-zinc-600">{DESCRIPTION}</p>
      </div>

      <div className="flex flex-col gap-3">
        {posts.map((post) => {
          const coverImageUrl = post.cover_image_path ? getBlogMediaUrl(supabase, post.cover_image_path) : null
          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="flex gap-4 rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400"
            >
              {coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a static asset.
                <img src={coverImageUrl} alt={post.cover_image_alt ?? ''} className="h-20 w-28 shrink-0 rounded object-cover" />
              )}
              <div>
                <h2 className="font-medium">{post.title}</h2>
                {post.published_at && <p className="mt-1 text-xs text-zinc-500">{new Date(post.published_at).toLocaleDateString()}</p>}
                {post.excerpt && <p className="mt-2 text-sm text-zinc-700">{post.excerpt}</p>}
              </div>
            </Link>
          )
        })}
        {posts.length === 0 && <p className="text-sm text-zinc-500">No posts yet -- check back soon.</p>}
      </div>
    </div>
  )
}
