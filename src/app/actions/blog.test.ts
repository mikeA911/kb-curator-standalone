import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireRoleMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return { ...actual, requireRole: (...args: unknown[]) => requireRoleMock(...args) }
})

const { createBlogPostAction, updateBlogPostAction, publishBlogPostAction, unpublishBlogPostAction, deleteBlogPostAction } = await import('./blog')

beforeEach(() => {
  requireRoleMock.mockReset()
})

describe('createBlogPostAction', () => {
  it('requires admin', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, supabase })

    await createBlogPostAction({ title: 'X', slug: '', excerpt: '', content: 'body' })

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
  })

  it('slugifies the title when no slug is given, and stamps the session author', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, supabase })

    await createBlogPostAction({ title: 'My First Post!', slug: '', excerpt: 'why', content: 'body' })

    const insert = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ slug: 'my-first-post', title: 'My First Post!', author_id: 'admin-1', excerpt: 'why', content: 'body' })
  })

  it('respects an explicit slug over the title-derived one', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, supabase })

    await createBlogPostAction({ title: 'My First Post', slug: 'custom-slug', excerpt: '', content: 'body' })

    const insert = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ slug: 'custom-slug' })
  })
})

describe('updateBlogPostAction', () => {
  it('requires admin and updates the given fields', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await updateBlogPostAction('p-1', { title: 'Updated', slug: 'updated', excerpt: '', content: 'new body' })

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ title: 'Updated', slug: 'updated', excerpt: null, content: 'new body' })
  })
})

describe('publishBlogPostAction', () => {
  it('sets status to published and stamps published_at', async () => {
    // publishPost's update runs first, then getPostById's select (for revalidation).
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: null, error: null },
        { data: { id: 'p-1', slug: 'x' }, error: null },
      ],
    })
    requireRoleMock.mockResolvedValue({ supabase })

    await publishBlogPostAction('p-1')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'published' })
    expect((update?.args as { published_at: string }).published_at).toBeTruthy()
  })
})

describe('unpublishBlogPostAction', () => {
  it('sets status back to draft and clears published_at', async () => {
    // getPostById's select runs first (to know the slug to revalidate), then unpublishPost's update.
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'p-1', slug: 'x' }, error: null },
        { data: null, error: null },
      ],
    })
    requireRoleMock.mockResolvedValue({ supabase })

    await unpublishBlogPostAction('p-1')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toEqual({ status: 'draft', published_at: null })
  })
})

describe('deleteBlogPostAction', () => {
  it('requires admin and deletes a draft post', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1', status: 'draft' }, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await deleteBlogPostAction('p-1')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const del = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'delete')
    expect(del).toBeTruthy()
  })

  it('rejects deleting a post that is already published', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1', status: 'published' }, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await expect(deleteBlogPostAction('p-1')).rejects.toThrow('Only a draft post can be deleted')
  })
})
