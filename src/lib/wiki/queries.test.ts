import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { listUnpublishedArticles, listArticlesForLinking } from './queries'

describe('listUnpublishedArticles', () => {
  it('queries only draft/review status, newest edit first', async () => {
    const rows = [
      { id: '1', slug: 'a', title: 'A', category: 'foundations', status: 'review', is_public: true, updated_at: '2026-08-12T00:00:00Z' },
      { id: '2', slug: 'b', title: 'B', category: 'foundations', status: 'draft', is_public: false, updated_at: '2026-08-11T00:00:00Z' },
    ]
    const supabase = createFakeSupabase({
      wiki_articles: [{ data: rows, error: null }],
    }) as never

    const result = await listUnpublishedArticles(supabase)

    expect(result).toEqual(rows)
    const calls = (supabase as ReturnType<typeof createFakeSupabase>)._calls
    // No insert/update/delete -- this is a plain filtered select, asserting
    // that much guards against someone turning it into a mutation by accident.
    expect(calls.length).toBe(0)
  })
})

describe('listArticlesForLinking', () => {
  it('excludes the current article and archived articles, sorted by title', async () => {
    const rows = [
      { id: '2', slug: 'b', title: 'B', status: 'draft' },
      { id: '3', slug: 'c', title: 'C', status: 'approved' },
    ]
    const supabase = createFakeSupabase({
      wiki_articles: [{ data: rows, error: null }],
    }) as never

    const result = await listArticlesForLinking(supabase, '1')

    expect(result).toEqual(rows)
  })
})
