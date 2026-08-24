import Link from 'next/link'
import type { BlogPost } from '@/types/database'

function statusLabel(post: BlogPost): string {
  if (post.status === 'published') return 'published'
  return post.submitted_for_review_at ? 'ready for review' : 'draft'
}

// Curator's own-work view, scoped server-side to the signed-in user's
// posts -- distinct from BlogPostsList.tsx, which is the admin's
// cross-author view of every post.
export function MyBlogDraftsList({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Blog drafts</h1>
        <Link href="/contribute/blog/new" className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
          + New draft
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/contribute/blog/${post.id}/edit`}
            className="flex items-center justify-between rounded border border-zinc-200 bg-white p-4 text-sm hover:border-zinc-400"
          >
            <div>
              <div className="font-medium">{post.title}</div>
              <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    post.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : post.submitted_for_review_at
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {statusLabel(post)}
                </span>
                {post.published_at && <span>Published {new Date(post.published_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <span className="text-xs underline">Edit</span>
          </Link>
        ))}
        {posts.length === 0 && <p className="text-sm text-zinc-500">You haven&apos;t created any Blog drafts yet.</p>}
      </div>
    </section>
  )
}
