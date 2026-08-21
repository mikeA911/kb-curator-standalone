import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listPublishedPosts } from '@/lib/blog/public'
import { SectionHero } from '@/components/SectionHero'

export default async function BlogIndexPage() {
  const supabase = await createClient()
  const posts = await listPublishedPosts(supabase)

  return (
    <div className="flex flex-col gap-6">
      <SectionHero image="/images/sections/front-page-ghibli.png" height="standard" priority />

      <div>
        <h1 className="text-xl font-semibold">Blog</h1>
        <p className="mt-1 text-sm text-zinc-600">Notes on building, evaluating, and deploying KB Sandbox.</p>
      </div>

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
            <h2 className="font-medium">{post.title}</h2>
            {post.published_at && <p className="mt-1 text-xs text-zinc-500">{new Date(post.published_at).toLocaleDateString()}</p>}
            {post.excerpt && <p className="mt-2 text-sm text-zinc-700">{post.excerpt}</p>}
          </Link>
        ))}
        {posts.length === 0 && <p className="text-sm text-zinc-500">No posts yet -- check back soon.</p>}
      </div>
    </div>
  )
}
