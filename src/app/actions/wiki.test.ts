import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireRoleMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireRole: (...args: unknown[]) => requireRoleMock(...args),
  }
})

const { setArticlePublicAction } = await import('./wiki')

beforeEach(() => {
  requireRoleMock.mockReset()
})

describe('setArticlePublicAction', () => {
  it('requires admin -- setting is_public is a stronger claim than approval', async () => {
    const supabase = createFakeSupabase({ wiki_articles: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await setArticlePublicAction('article-1', true)

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const update = supabase._calls.find((c) => c.table === 'wiki_articles' && c.method === 'update')
    expect(update?.args).toEqual({ is_public: true })
  })

  it('can unset is_public the same way', async () => {
    const supabase = createFakeSupabase({ wiki_articles: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await setArticlePublicAction('article-1', false)

    const update = supabase._calls.find((c) => c.table === 'wiki_articles' && c.method === 'update')
    expect(update?.args).toEqual({ is_public: false })
  })
})
