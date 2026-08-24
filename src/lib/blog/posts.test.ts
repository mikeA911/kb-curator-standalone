import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import {
  createDraftPost,
  updatePost,
  submitPostForReview,
  returnPostToDraft,
  publishPost,
  unpublishPost,
  deleteDraftPost,
  setCoverImage,
  listPublishablePostsForLinking,
  BlogValidationError,
} from './posts'

describe('createDraftPost', () => {
  it('stamps the author as the last editor too', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    await createDraftPost(supabase as never, { slug: 's', title: 'T', excerpt: null, content: 'body', authorId: 'user-1' })

    const insert = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ author_id: 'user-1', last_editor_id: 'user-1' })
  })
})

describe('updatePost', () => {
  it('stamps the last editor and succeeds when a row is affected', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    await updatePost(supabase as never, 'p-1', { slug: 's', title: 'T', excerpt: null, content: 'body' }, 'editor-1')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ last_editor_id: 'editor-1' })
  })

  it('throws when RLS or the status=draft predicate blocks the update (no row returned)', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    await expect(updatePost(supabase as never, 'p-1', { slug: 's', title: 'T', excerpt: null, content: 'body' }, 'editor-1')).rejects.toThrow(
      BlogValidationError
    )
  })

  it('scopes the update to status=draft -- a crafted update against a published post matches no row and is rejected', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    await updatePost(supabase as never, 'p-1', { slug: 's', title: 'T', excerpt: null, content: 'body' }, 'editor-1')

    const statusFilter = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'eq' && (c.args as { column: string }).column === 'status')
    expect(statusFilter?.args).toEqual({ column: 'status', value: 'draft' })
  })
})

describe('submitPostForReview', () => {
  it('sets submitted_for_review_at and submitted_by when eligible', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    await submitPostForReview(supabase as never, 'p-1', 'curator-1')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ submitted_by: 'curator-1' })
  })

  it('throws when the draft is not eligible (RLS blocks it)', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    await expect(submitPostForReview(supabase as never, 'p-1', 'curator-1')).rejects.toThrow(BlogValidationError)
  })
})

describe('returnPostToDraft', () => {
  it('clears submission markers', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    await returnPostToDraft(supabase as never, 'p-1')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toEqual({ submitted_for_review_at: null, submitted_by: null })
  })
})

describe('publishPost', () => {
  it('sets status, published_at, and published_by', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    await publishPost(supabase as never, 'p-1', 'admin-1')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'published', published_by: 'admin-1' })
  })
})

describe('unpublishPost', () => {
  it('clears status, published_at, published_by, and any stale submission markers', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    await unpublishPost(supabase as never, 'p-1')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toEqual({
      status: 'draft',
      published_at: null,
      published_by: null,
      submitted_for_review_at: null,
      submitted_by: null,
    })
  })
})

describe('setCoverImage', () => {
  it('sets cover_image_path and cover_image_alt when a row is affected', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    await setCoverImage(supabase as never, 'p-1', 'posts/123-photo.png', 'A diagram')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toEqual({ cover_image_path: 'posts/123-photo.png', cover_image_alt: 'A diagram' })
  })

  it('is scoped to status=draft, same as updatePost -- throws when blocked', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    await expect(setCoverImage(supabase as never, 'p-1', 'posts/123-photo.png', 'A diagram')).rejects.toThrow(BlogValidationError)

    const statusFilter = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'eq' && (c.args as { column: string }).column === 'status')
    expect(statusFilter?.args).toEqual({ column: 'status', value: 'draft' })
  })
})

describe('deleteDraftPost', () => {
  it('removes the cover image object from storage after deleting a post that had one', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'p-1', status: 'draft', cover_image_path: 'posts/123-cover.png' }, error: null },
        { data: null, error: null },
      ],
    })
    await deleteDraftPost(supabase as never, 'p-1')

    expect(supabase._storageRemoveCalls).toEqual([{ bucket: 'blog-media', paths: ['posts/123-cover.png'] }])
  })

  it('does not attempt any storage removal when the post has no cover image', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'p-1', status: 'draft', cover_image_path: null }, error: null },
        { data: null, error: null },
      ],
    })
    await deleteDraftPost(supabase as never, 'p-1')

    expect(supabase._storageRemoveCalls).toEqual([])
  })

  it('only ever targets the exact path read off the row being deleted -- never another post’s cover image', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'p-1', status: 'draft', cover_image_path: 'posts/111-mine.png' }, error: null },
        { data: null, error: null },
      ],
    })
    await deleteDraftPost(supabase as never, 'p-1')

    expect(supabase._storageRemoveCalls).toHaveLength(1)
    expect(supabase._storageRemoveCalls[0].paths).toEqual(['posts/111-mine.png'])
    expect(supabase._storageRemoveCalls[0].paths).not.toContain('posts/222-someone-elses.png')
  })
})

describe('listPublishablePostsForLinking', () => {
  it('queries only published posts, excluding the given post id', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: [{ id: 'p-2', slug: 'b', title: 'B', status: 'published' }], error: null }] })
    const result = await listPublishablePostsForLinking(supabase as never, 'p-1')

    expect(result).toEqual([{ id: 'p-2', slug: 'b', title: 'B', status: 'published' }])
    const statusFilter = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'eq' && (c.args as { column: string }).column === 'status')
    expect(statusFilter?.args).toEqual({ column: 'status', value: 'published' })
  })
})
