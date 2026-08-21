import Link from 'next/link'
import type { BlogPost } from '@/types/database'

// Same shape as AIProvidersList.tsx: each row links out to its own detail
// page rather than managing everything inline in the tab.
export function BlogPostsList({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Blog posts</h2>
        <Link href="/admin/blog/new" className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
          + New post
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/admin/blog/${post.id}/edit`}
            className="flex items-center justify-between rounded border border-zinc-200 bg-white p-4 text-sm hover:border-zinc-400"
          >
            <div>
              <div className="font-medium">{post.title}</div>
              <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {post.status}
                </span>
                <span>/blog/{post.slug}</span>
                {post.published_at && <span>Published {new Date(post.published_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <span className="text-xs underline">Edit</span>
          </Link>
        ))}
        {posts.length === 0 && <p className="text-sm text-zinc-500">No blog posts yet.</p>}
      </div>
    </section>
  )
}
