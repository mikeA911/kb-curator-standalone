import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import {
  listTrendingItems,
  getTrendingItemById,
  listComments,
  listWikiLinks,
  listWikiArticlesForLinking,
  listTrendingUnderReview,
  listRecentSharedLinks,
  getTrendingStats,
} from './queries'

describe('listTrendingItems', () => {
  it('returns whatever RLS-scoped rows the query resolves to', async () => {
    const supabase = createFakeSupabase({
      trending_items: [{ data: [{ id: 't-1' }, { id: 't-2' }], error: null }],
    })
    const items = await listTrendingItems(supabase as never)
    expect(items).toEqual([{ id: 't-1' }, { id: 't-2' }])
  })

  it('returns an empty array rather than null when there are no rows', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: null }] })
    expect(await listTrendingItems(supabase as never)).toEqual([])
  })

  it('throws on a Postgrest error', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: new Error('boom') }] })
    await expect(listTrendingItems(supabase as never)).rejects.toThrow('boom')
  })
})

describe('getTrendingItemById', () => {
  it('returns null (not throw) when nothing matches -- maybeSingle semantics', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: null }] })
    expect(await getTrendingItemById(supabase as never, 'missing')).toBeNull()
  })
})

describe('listComments', () => {
  it('short-circuits to [] when there are no comments', async () => {
    const supabase = createFakeSupabase({ trending_comments: [{ data: [], error: null }] })
    expect(await listComments(supabase as never, 't-1')).toEqual([])
  })

  it('merges each comment with its author via a second query, not an embedded select', async () => {
    const supabase = createFakeSupabase({
      trending_comments: [
        {
          data: [
            { id: 'c-1', trending_item_id: 't-1', author_id: 'u-1', body: 'first', created_at: '2026-01-01', updated_at: null },
            { id: 'c-2', trending_item_id: 't-1', author_id: null, body: 'anon note', created_at: '2026-01-02', updated_at: null },
          ],
          error: null,
        },
      ],
      profiles: [{ data: [{ id: 'u-1', email: 'a@example.com' }], error: null }],
    })

    const comments = await listComments(supabase as never, 't-1')

    expect(comments).toEqual([
      { id: 'c-1', trending_item_id: 't-1', author_id: 'u-1', body: 'first', created_at: '2026-01-01', updated_at: null, author: { id: 'u-1', email: 'a@example.com' } },
      { id: 'c-2', trending_item_id: 't-1', author_id: null, body: 'anon note', created_at: '2026-01-02', updated_at: null, author: null },
    ])
  })
})

describe('listWikiLinks', () => {
  it('short-circuits to [] when there are no links', async () => {
    const supabase = createFakeSupabase({ trending_wiki_links: [{ data: [], error: null }] })
    expect(await listWikiLinks(supabase as never, 't-1')).toEqual([])
  })

  it('merges each link with its Wiki article via a second query', async () => {
    const supabase = createFakeSupabase({
      trending_wiki_links: [
        { data: [{ id: 'l-1', wiki_article_id: 'a-1', linked_by: 'u-1', created_at: '2026-01-01' }], error: null },
      ],
      wiki_articles: [{ data: [{ id: 'a-1', slug: 'rag-basics', title: 'RAG Basics' }], error: null }],
    })

    const links = await listWikiLinks(supabase as never, 't-1')

    expect(links).toEqual([
      { id: 'l-1', wiki_article_id: 'a-1', linked_by: 'u-1', created_at: '2026-01-01', article: { id: 'a-1', slug: 'rag-basics', title: 'RAG Basics' } },
    ])
  })

  it('degrades to a null article rather than throwing when the linked article is missing', async () => {
    const supabase = createFakeSupabase({
      trending_wiki_links: [
        { data: [{ id: 'l-1', wiki_article_id: 'gone', linked_by: 'u-1', created_at: '2026-01-01' }], error: null },
      ],
      wiki_articles: [{ data: [], error: null }],
    })

    const links = await listWikiLinks(supabase as never, 't-1')
    expect(links[0].article).toBeNull()
  })
})

describe('listWikiArticlesForLinking', () => {
  it('returns whatever the non-archived query resolves to', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [{ data: [{ id: 'a-1', slug: 'x', title: 'X', status: 'approved' }], error: null }],
    })
    expect(await listWikiArticlesForLinking(supabase as never)).toEqual([{ id: 'a-1', slug: 'x', title: 'X', status: 'approved' }])
  })
})

describe('listTrendingUnderReview', () => {
  it('returns the under-review rows for the curator Needs Attention feed', async () => {
    const supabase = createFakeSupabase({
      trending_items: [{ data: [{ id: 't-1', title: 'X', status: 'under_review', created_at: '2026-01-01' }], error: null }],
    })
    const items = await listTrendingUnderReview(supabase as never)
    expect(items).toEqual([{ id: 't-1', title: 'X', status: 'under_review', created_at: '2026-01-01' }])
  })
})

describe('listRecentSharedLinks', () => {
  it('short-circuits to [] when there are no active platform-visible items', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: [], error: null }] })
    expect(await listRecentSharedLinks(supabase as never)).toEqual([])
  })

  it('resolves each item\'s contributor email via a second query, not an embedded select', async () => {
    const supabase = createFakeSupabase({
      trending_items: [
        {
          data: [
            {
              id: 't-1',
              title: 'Retrieval paper',
              source_url: 'https://example.test/paper',
              source_name: 'arXiv',
              description: 'why it matters',
              tags: ['RAG'],
              submitted_by: 'u-1',
              created_at: '2026-01-01',
            },
            {
              id: 't-2',
              title: 'Anonymous-ish submission',
              source_url: 'https://example.test/other',
              source_name: null,
              description: 'why',
              tags: [],
              submitted_by: null,
              created_at: '2026-01-02',
            },
          ],
          error: null,
        },
      ],
      profiles: [{ data: [{ id: 'u-1', email: 'a@example.com' }], error: null }],
    })

    const links = await listRecentSharedLinks(supabase as never)

    expect(links).toEqual([
      {
        id: 't-1',
        title: 'Retrieval paper',
        source_url: 'https://example.test/paper',
        source_name: 'arXiv',
        description: 'why it matters',
        tags: ['RAG'],
        submitted_by: 'u-1',
        created_at: '2026-01-01',
        contributorEmail: 'a@example.com',
      },
      {
        id: 't-2',
        title: 'Anonymous-ish submission',
        source_url: 'https://example.test/other',
        source_name: null,
        description: 'why',
        tags: [],
        submitted_by: null,
        created_at: '2026-01-02',
        contributorEmail: null,
      },
    ])
  })
})

describe('getTrendingStats', () => {
  it('counts total and active from the status column', async () => {
    const supabase = createFakeSupabase({
      trending_items: [
        { data: [{ status: 'active' }, { status: 'active' }, { status: 'archived' }, { status: 'promoted' }], error: null },
      ],
    })
    expect(await getTrendingStats(supabase as never)).toEqual({ total: 4, active: 2 })
  })

  it('handles zero rows', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: [], error: null }] })
    expect(await getTrendingStats(supabase as never)).toEqual({ total: 0, active: 0 })
  })
})
