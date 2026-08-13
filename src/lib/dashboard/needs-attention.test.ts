import { describe, it, expect, vi } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const listUnpublishedArticlesMock = vi.fn()
const listProjectsWithDraftUpdatesMock = vi.fn()

vi.mock('@/lib/wiki/queries', () => ({ listUnpublishedArticles: (...args: unknown[]) => listUnpublishedArticlesMock(...args) }))
vi.mock('@/lib/projects/queries', () => ({
  listProjectsWithDraftUpdates: (...args: unknown[]) => listProjectsWithDraftUpdatesMock(...args),
}))

const { getNeedsAttention } = await import('./needs-attention')

describe('getNeedsAttention', () => {
  it('combines documents, wiki, eval, and project queries into one list, including zero counts', async () => {
    listUnpublishedArticlesMock.mockResolvedValue([{ id: 'w1' }, { id: 'w2' }])
    listProjectsWithDraftUpdatesMock.mockResolvedValue([])

    const supabase = createFakeSupabase({
      documents: [{ data: [{ id: 'd1' }], error: null }],
      eval_runs: [{ data: [{ id: 'r1' }, { id: 'r2' }], error: null }],
    }) as never

    const result = await getNeedsAttention(supabase)

    expect(result).toEqual([
      { label: 'documents awaiting curation', count: 1, href: '/upload' },
      { label: 'Wiki articles awaiting approval', count: 2, href: '/wiki' },
      { label: 'failed evaluation runs', count: 2, href: '/evals' },
      { label: 'unpublished project updates', count: 0, href: '/projects' },
    ])
  })
})
