'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BlogPost } from '@/types/database'
import {
  createBlogPostAction,
  updateBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
  deleteBlogPostAction,
} from '@/app/actions/blog'

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Same shape as PublishForm.tsx: local field state + a run() helper wrapping
// useTransition, window.confirm for destructive/publishing actions,
// router.refresh()/router.push() to reflect the result.
export function BlogPostForm({ post }: { post?: BlogPost }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [content, setContent] = useState(post?.content ?? '')

  function run(action: () => Promise<void>, successMessage: string) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await action()
        setMessage(successMessage)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required')
      return
    }
    const fields = { title: title.trim(), slug: slug.trim() || slugify(title), excerpt, content }
    if (post) {
      run(() => updateBlogPostAction(post.id, fields), 'Saved.')
    } else {
      setError(null)
      setMessage(null)
      startTransition(async () => {
        try {
          const { id } = await createBlogPostAction(fields)
          router.push(`/admin/blog/${id}/edit`)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create post')
        }
      })
    }
  }

  function handlePublish() {
    if (!post) return
    run(() => publishBlogPostAction(post.id), 'Published.')
  }

  function handleUnpublish() {
    if (!post) return
    if (!window.confirm('Unpublish this post? It will no longer be visible to anonymous visitors.')) return
    run(() => unpublishBlogPostAction(post.id), 'Unpublished.')
  }

  function handleDelete() {
    if (!post) return
    if (!window.confirm(`Delete the draft "${post.title}"? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        await deleteBlogPostAction(post.id)
        router.push('/admin')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete post')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {post && (
        <div className="flex items-center justify-between rounded border border-zinc-200 bg-white p-4">
          <div>
            <p className="text-sm font-medium">
              Status: <span className={post.status === 'published' ? 'text-green-700' : 'text-zinc-500'}>{post.status}</span>
            </p>
            {post.status === 'published' && <p className="text-xs text-zinc-500">Live at /blog/{post.slug}</p>}
          </div>
          <div className="flex gap-2">
            {post.status === 'draft' && (
              <button
                disabled={isPending}
                onClick={handleDelete}
                className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
            {post.status === 'published' ? (
              <button
                disabled={isPending}
                onClick={handleUnpublish}
                className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
              >
                Unpublish
              </button>
            ) : (
              <button
                disabled={isPending}
                onClick={handlePublish}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">URL slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugify(title || 'post-title')}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Excerpt (shown in the blog listing and page description)</span>
          <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Content (Markdown)</span>
          <textarea
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button
          disabled={isPending}
          onClick={handleSave}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {post ? 'Save changes' : 'Save draft'}
        </button>
      </div>
    </div>
  )
}
