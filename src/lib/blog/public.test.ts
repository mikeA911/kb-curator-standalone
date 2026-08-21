import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { listPublishedPosts, getPublishedPostBySlug } from './public'

describe('listPublishedPosts', () => {
  it('returns whatever the published-only query resolves to', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [{ data: [{ id: 'p-1', slug: 'first-post', title: 'First post', excerpt: 'why', published_at: '2026-01-01' }], error: null }],
    })
    const posts = await listPublishedPosts(supabase as never)
    expect(posts).toEqual([{ id: 'p-1', slug: 'first-post', title: 'First post', excerpt: 'why', published_at: '2026-01-01' }])
  })

  it('returns an empty array rather than null when there are no rows', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    expect(await listPublishedPosts(supabase as never)).toEqual([])
  })

  it('throws on a Postgrest error', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: new Error('boom') }] })
    await expect(listPublishedPosts(supabase as never)).rejects.toThrow('boom')
  })
})

describe('getPublishedPostBySlug', () => {
  it('returns null (not throw) when nothing matches -- maybeSingle semantics', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    expect(await getPublishedPostBySlug(supabase as never, 'missing')).toBeNull()
  })

  it('returns the full post including content', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [
        {
          data: { id: 'p-1', slug: 'first-post', title: 'First post', excerpt: 'why', published_at: '2026-01-01', content: '## Body' },
          error: null,
        },
      ],
    })
    const post = await getPublishedPostBySlug(supabase as never, 'first-post')
    expect(post?.content).toBe('## Body')
  })
})
