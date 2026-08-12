import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireRoleMock = vi.fn()
const approveWikiVersionMock = vi.fn()
const embedApprovedVersionMock = vi.fn()
const getActiveProviderMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireRole: (...args: unknown[]) => requireRoleMock(...args),
  }
})
vi.mock('@/lib/wiki/review', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wiki/review')>('@/lib/wiki/review')
  return {
    ...actual,
    approveWikiVersion: (...args: unknown[]) => approveWikiVersionMock(...args),
    embedApprovedVersion: (...args: unknown[]) => embedApprovedVersionMock(...args),
  }
})
vi.mock('@/lib/ai', () => ({ getActiveProvider: (...args: unknown[]) => getActiveProviderMock(...args) }))

const adminSupabase = createFakeSupabase({ wiki_versions: [{ data: { content: 'some content' }, error: null }] })
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminSupabase }))

const { setArticlePublicAction, approveArticleAction } = await import('./wiki')

beforeEach(() => {
  requireRoleMock.mockReset()
  approveWikiVersionMock.mockReset()
  embedApprovedVersionMock.mockReset()
  getActiveProviderMock.mockReset()
  requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' } })
  approveWikiVersionMock.mockResolvedValue(undefined)
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

describe('approveArticleAction', () => {
  it('still succeeds when the AI provider lookup fails -- embedding is best-effort, not a gate on approval', async () => {
    getActiveProviderMock.mockRejectedValue(new Error('No default generation model configured'))

    await expect(approveArticleAction('article-1', 'version-1')).resolves.toBeUndefined()

    expect(approveWikiVersionMock).toHaveBeenCalledWith(adminSupabase, 'article-1', 'version-1', 'admin-1')
    expect(embedApprovedVersionMock).not.toHaveBeenCalled()
  })
})
