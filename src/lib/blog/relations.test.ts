import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { linkRelatedPost, unlinkRelatedPost, getRelatedPosts } from './relations'

describe('linkRelatedPost', () => {
  it('inserts a directional relation row', async () => {
    const supabase = createFakeSupabase({ blog_relations: [{ data: null, error: null }] })
    await linkRelatedPost(supabase as never, 'post-a', 'post-b')

    const insert = supabase._calls.find((c) => c.table === 'blog_relations' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ from_post_id: 'post-a', to_post_id: 'post-b' })
  })
})

describe('unlinkRelatedPost', () => {
  it('deletes by relation id', async () => {
    const supabase = createFakeSupabase({ blog_relations: [{ data: null, error: null }] })
    await unlinkRelatedPost(supabase as never, 'relation-1')

    const del = supabase._calls.find((c) => c.table === 'blog_relations' && c.method === 'delete')
    expect(del).toBeTruthy()
  })
})

describe('getRelatedPosts', () => {
  it('merges outgoing and incoming relations symmetrically', async () => {
    const supabase = createFakeSupabase({
      blog_relations: [
        { data: [{ id: 'rel-1', to_post_id: 'post-b' }], error: null },
        { data: [{ id: 'rel-2', from_post_id: 'post-c' }], error: null },
      ],
      blog_posts: [{ data: [{ id: 'post-b', slug: 'b', title: 'B', status: 'published' }, { id: 'post-c', slug: 'c', title: 'C', status: 'draft' }], error: null }],
    })

    const result = await getRelatedPosts(supabase as never, 'post-a', false)

    expect(result).toEqual([
      { relationId: 'rel-1', post: { id: 'post-b', slug: 'b', title: 'B', status: 'published' } },
      { relationId: 'rel-2', post: { id: 'post-c', slug: 'c', title: 'C', status: 'draft' } },
    ])
  })

  it('returns an empty array without querying posts when there are no relations', async () => {
    const supabase = createFakeSupabase({
      blog_relations: [
        { data: [], error: null },
        { data: [], error: null },
      ],
    })

    const result = await getRelatedPosts(supabase as never, 'post-a', false)
    expect(result).toEqual([])
  })

  it('drops a related post the target query excludes -- publicOnly filters out a still-draft target', async () => {
    const supabase = createFakeSupabase({
      blog_relations: [
        { data: [{ id: 'rel-1', to_post_id: 'post-b' }], error: null },
        { data: [], error: null },
      ],
      // publicOnly's status='published' filter means the draft target
      // never comes back from this query in the real database -- the fake
      // just returns whatever's queued, so an empty result models that.
      blog_posts: [{ data: [], error: null }],
    })

    const result = await getRelatedPosts(supabase as never, 'post-a', true)
    expect(result).toEqual([])
  })
})
