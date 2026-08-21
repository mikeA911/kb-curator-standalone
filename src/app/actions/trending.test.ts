import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireUserMock = vi.fn()
const requireRoleMock = vi.fn()
const createManualDraftArticleMock = vi.fn()
const createNextDraftVersionMock = vi.fn()
const submitArticleForReviewMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireUser: (...args: unknown[]) => requireUserMock(...args),
    requireRole: (...args: unknown[]) => requireRoleMock(...args),
  }
})
vi.mock('@/lib/wiki/articles', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wiki/articles')>('@/lib/wiki/articles')
  return {
    ...actual,
    createManualDraftArticle: (...args: unknown[]) => createManualDraftArticleMock(...args),
    createNextDraftVersion: (...args: unknown[]) => createNextDraftVersionMock(...args),
    submitArticleForReview: (...args: unknown[]) => submitArticleForReviewMock(...args),
  }
})

const adminSupabase = createFakeSupabase({
  wiki_versions: [{ data: null, error: null }],
  trending_items: [{ data: null, error: null }],
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminSupabase }))

const {
  submitTrendingItemAction,
  commentOnTrendingItemAction,
  linkTrendingToWikiAction,
  unlinkTrendingWikiAction,
  markUnderReviewAction,
  archiveTrendingItemAction,
  removeSharedLinkAction,
  setTrendingPublicAction,
  promoteTrendingToWikiAction,
} = await import('./trending')

beforeEach(() => {
  requireUserMock.mockReset()
  requireRoleMock.mockReset()
  createManualDraftArticleMock.mockReset()
  createNextDraftVersionMock.mockReset()
  submitArticleForReviewMock.mockReset()
  adminSupabase._calls.length = 0
})

describe('submitTrendingItemAction', () => {
  it('rejects an anonymous visitor -- requireUser alone does not exclude that role', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(
      submitTrendingItemAction({ title: 'X', sourceUrl: 'https://x.test', sourceName: null, description: 'why', tags: [], projectId: null })
    ).rejects.toThrow('Create an account')
  })

  it('inserts through the RLS-scoped client with submitted_by stamped from the session, not the caller', async () => {
    // Two queued trending_items results: the duplicate-check select (none
    // found), then the actual insert.
    const supabase = createFakeSupabase({
      trending_items: [
        { data: null, error: null },
        { data: { id: 't-1' }, error: null },
      ],
    })
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase })

    const result = await submitTrendingItemAction({
      title: 'New retrieval paper',
      sourceUrl: 'https://example.test/paper',
      sourceName: 'arXiv',
      description: 'Changes how we should think about chunking',
      tags: ['RAG'],
      projectId: null,
    })

    expect(result).toEqual({ status: 'created', id: 't-1' })
    const insert = supabase._calls.find((c) => c.table === 'trending_items' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ submitted_by: 'user-1', visibility: 'platform' })
  })

  it('sets visibility to project when a project is attached', async () => {
    const supabase = createFakeSupabase({
      trending_items: [
        { data: null, error: null },
        { data: { id: 't-1' }, error: null },
      ],
    })
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase })

    await submitTrendingItemAction({
      title: 'X',
      sourceUrl: 'https://x.test',
      sourceName: null,
      description: 'why',
      tags: [],
      projectId: 'p-1',
    })

    const insert = supabase._calls.find((c) => c.table === 'trending_items' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ project_id: 'p-1', visibility: 'project' })
  })

  it('rejects an invalid URL before touching the database', async () => {
    const supabase = createFakeSupabase({ trending_items: [] })
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase })

    await expect(
      submitTrendingItemAction({
        title: 'X',
        sourceUrl: 'javascript:alert(1)',
        sourceName: null,
        description: 'why',
        tags: [],
        projectId: null,
      })
    ).rejects.toThrow('Only http(s)')
    expect(supabase._calls).toHaveLength(0)
  })

  it('returns a duplicate result instead of inserting when an active match already exists', async () => {
    const supabase = createFakeSupabase({
      trending_items: [{ data: { id: 'existing-1', title: 'Existing paper' }, error: null }],
    })
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase })

    const result = await submitTrendingItemAction({
      title: 'New title, same link',
      sourceUrl: 'https://example.test/paper/',
      sourceName: null,
      description: 'why',
      tags: [],
      projectId: null,
    })

    expect(result).toEqual({ status: 'duplicate', existingItemId: 'existing-1', existingTitle: 'Existing paper' })
    expect(supabase._calls.find((c) => c.method === 'insert')).toBeUndefined()
  })

  it('inserts anyway when confirmDuplicate is set, even with a duplicate present', async () => {
    const supabase = createFakeSupabase({
      trending_items: [{ data: { id: 't-2' }, error: null }],
    })
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase })

    const result = await submitTrendingItemAction({
      title: 'X',
      sourceUrl: 'https://example.test/paper',
      sourceName: null,
      description: 'why',
      tags: [],
      projectId: null,
      confirmDuplicate: true,
    })

    expect(result).toEqual({ status: 'created', id: 't-2' })
  })
})

describe('commentOnTrendingItemAction', () => {
  it('rejects an anonymous visitor', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(commentOnTrendingItemAction('t-1', 'hello')).rejects.toThrow('Create an account')
  })

  it('rejects a blank comment', async () => {
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' } })
    await expect(commentOnTrendingItemAction('t-1', '   ')).rejects.toThrow('empty')
  })

  it('inserts a trimmed comment stamped with the session author', async () => {
    const supabase = createFakeSupabase({ trending_comments: [{ data: null, error: null }] })
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase })

    await commentOnTrendingItemAction('t-1', '  worth a look  ')

    const insert = supabase._calls.find((c) => c.table === 'trending_comments' && c.method === 'insert')
    expect(insert?.args).toEqual({ trending_item_id: 't-1', author_id: 'user-1', body: 'worth a look' })
  })
})

describe('linkTrendingToWikiAction / unlinkTrendingWikiAction', () => {
  it('rejects an anonymous visitor from linking', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(linkTrendingToWikiAction('t-1', 'a-1')).rejects.toThrow('Create an account')
  })

  it('inserts the link stamped with the session user', async () => {
    const supabase = createFakeSupabase({ trending_wiki_links: [{ data: null, error: null }] })
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase })

    await linkTrendingToWikiAction('t-1', 'a-1')

    const insert = supabase._calls.find((c) => c.table === 'trending_wiki_links' && c.method === 'insert')
    expect(insert?.args).toEqual({ trending_item_id: 't-1', wiki_article_id: 'a-1', linked_by: 'user-1' })
  })

  it('unlink deletes by link id -- no role gate beyond authentication, RLS is the real gate', async () => {
    const supabase = createFakeSupabase({ trending_wiki_links: [{ data: null, error: null }] })
    requireUserMock.mockResolvedValue({ supabase })

    await unlinkTrendingWikiAction('link-1', 't-1')

    const del = supabase._calls.find((c) => c.table === 'trending_wiki_links' && c.method === 'delete')
    expect(del).toBeTruthy()
  })
})

describe('curator-gated status actions', () => {
  it('markUnderReviewAction requires curator and sets status', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await markUnderReviewAction('t-1')

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
    const update = supabase._calls.find((c) => c.table === 'trending_items' && c.method === 'update')
    expect(update?.args).toEqual({ status: 'under_review' })
  })

  it('archiveTrendingItemAction requires curator and sets status', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await archiveTrendingItemAction('t-1')

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
    const update = supabase._calls.find((c) => c.table === 'trending_items' && c.method === 'update')
    expect(update?.args).toEqual({ status: 'archived' })
  })

  it('removeSharedLinkAction requires admin (stricter than curator-level archive) and stamps a moderation audit trail', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, supabase })

    await removeSharedLinkAction('t-1', 'Duplicate of an existing entry')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const update = supabase._calls.find((c) => c.table === 'trending_items' && c.method === 'update')
    expect(update?.args).toMatchObject({
      status: 'archived',
      archived_by: 'admin-1',
      moderation_reason: 'Duplicate of an existing entry',
    })
    expect((update?.args as { archived_at: string }).archived_at).toBeTruthy()
  })

  it('removeSharedLinkAction stores a null moderation_reason when none is given', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, supabase })

    await removeSharedLinkAction('t-1')

    const update = supabase._calls.find((c) => c.table === 'trending_items' && c.method === 'update')
    expect(update?.args).toMatchObject({ moderation_reason: null })
  })

  it('setTrendingPublicAction stamps published_at when publishing, clears it when unpublishing', async () => {
    const supabase = createFakeSupabase({ trending_items: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await setTrendingPublicAction('t-1', true)
    let update = supabase._calls.find((c) => c.table === 'trending_items' && c.method === 'update')
    expect(update?.args).toMatchObject({ is_public: true })
    expect((update?.args as { published_at: string }).published_at).toBeTruthy()

    await setTrendingPublicAction('t-1', false)
    update = supabase._calls.filter((c) => c.table === 'trending_items' && c.method === 'update').at(-1)
    expect(update?.args).toEqual({ is_public: false, published_at: null })
  })
})

describe('promoteTrendingToWikiAction', () => {
  it('requires curator', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' } })
    createManualDraftArticleMock.mockResolvedValue({ article: { id: 'a-1' }, version: { id: 'v-1' } })

    await promoteTrendingToWikiAction('t-1', {
      mode: 'new',
      title: 'New article',
      category: 'foundations',
      shortDescription: 'desc',
      quickHelp: 'help',
      content: 'content',
      implementationNotes: '',
      limitations: '',
    })

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
  })

  it('new mode: creates a draft via the unmodified Wiki lifecycle, stamps provenance, submits for review, and marks the Trending item promoted', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' } })
    createManualDraftArticleMock.mockResolvedValue({ article: { id: 'a-1' }, version: { id: 'v-1' } })

    const result = await promoteTrendingToWikiAction('t-1', {
      mode: 'new',
      title: 'New article',
      slug: 'new-article',
      category: 'foundations',
      shortDescription: 'desc',
      quickHelp: 'help',
      content: 'content',
      implementationNotes: '',
      limitations: '',
    })

    expect(result).toEqual({ articleId: 'a-1' })
    expect(createManualDraftArticleMock).toHaveBeenCalledWith(
      adminSupabase,
      expect.objectContaining({ slug: 'new-article', title: 'New article', createdBy: 'curator-1' })
    )
    const provenanceUpdate = adminSupabase._calls.find((c) => c.table === 'wiki_versions' && c.method === 'update')
    expect(provenanceUpdate?.args).toEqual({ promoted_from_trending_item_id: 't-1' })
    expect(submitArticleForReviewMock).toHaveBeenCalledWith(adminSupabase, 'a-1')
    const statusUpdate = adminSupabase._calls.find((c) => c.table === 'trending_items' && c.method === 'update')
    expect(statusUpdate?.args).toEqual({ status: 'promoted' })
  })

  it('update mode: creates the next draft version on the existing article, not a new one', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' } })
    createNextDraftVersionMock.mockResolvedValue({ id: 'v-2' })

    const result = await promoteTrendingToWikiAction('t-1', {
      mode: 'update',
      articleId: 'existing-a-1',
      quickHelp: 'help',
      content: 'content',
      implementationNotes: '',
      limitations: '',
    })

    expect(result).toEqual({ articleId: 'existing-a-1' })
    expect(createManualDraftArticleMock).not.toHaveBeenCalled()
    expect(createNextDraftVersionMock).toHaveBeenCalledWith(
      adminSupabase,
      'existing-a-1',
      expect.objectContaining({ quickHelp: 'help', content: 'content' }),
      'curator-1'
    )
    const provenanceUpdate = adminSupabase._calls.find((c) => c.table === 'wiki_versions' && c.method === 'update')
    expect(provenanceUpdate?.args).toEqual({ promoted_from_trending_item_id: 't-1' })
  })
})
