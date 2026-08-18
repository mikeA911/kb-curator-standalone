import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireRoleMock = vi.fn()
const approveWikiVersionMock = vi.fn()
const embedApprovedVersionMock = vi.fn()
const getActiveEmbeddingProviderMock = vi.fn()

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
const getActiveStructuredOutputProviderMock = vi.fn()
vi.mock('@/lib/ai', () => ({
  getActiveEmbeddingProvider: (...args: unknown[]) => getActiveEmbeddingProviderMock(...args),
  getActiveStructuredOutputProvider: (...args: unknown[]) => getActiveStructuredOutputProviderMock(...args),
}))

// Two identical entries -- the wiki_versions queue is a shared, cursor-based
// FIFO consumed once per test in this describe block (see fake-supabase.ts),
// not reset between tests.
const adminSupabase = createFakeSupabase({
  wiki_versions: [
    { data: { content: 'some content' }, error: null },
    { data: { content: 'some content' }, error: null },
  ],
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminSupabase }))

const { setArticlePublicAction, approveArticleAction, createAIAssistedDraftAction } = await import('./wiki')

beforeEach(() => {
  requireRoleMock.mockReset()
  approveWikiVersionMock.mockReset()
  embedApprovedVersionMock.mockReset()
  getActiveStructuredOutputProviderMock.mockReset()
  getActiveEmbeddingProviderMock.mockReset()
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
    getActiveEmbeddingProviderMock.mockRejectedValue(new Error('No default embedding model configured'))

    await expect(approveArticleAction('article-1', 'version-1')).resolves.toBeUndefined()

    expect(approveWikiVersionMock).toHaveBeenCalledWith(adminSupabase, 'article-1', 'version-1', 'admin-1')
    expect(embedApprovedVersionMock).not.toHaveBeenCalled()
  })

  it('resolves the embedding provider, not generation or structured-output -- some generation-only providers (e.g. Groq) cannot embed at all', async () => {
    const embeddingProvider = { name: 'embedding-provider' }
    getActiveEmbeddingProviderMock.mockResolvedValue(embeddingProvider)

    await approveArticleAction('article-1', 'version-1')

    expect(getActiveEmbeddingProviderMock).toHaveBeenCalled()
    expect(getActiveStructuredOutputProviderMock).not.toHaveBeenCalled()
    expect(embedApprovedVersionMock).toHaveBeenCalledWith(adminSupabase, embeddingProvider, 'version-1', 'some content')
  })
})

describe('createAIAssistedDraftAction — artifact-sourced (M6A Handbook path)', () => {
  const draftFields = {
    title: 'How KB Sandbox Is Organized',
    short_description: 'A short overview',
    quick_help: 'Quick help text',
    content: '# Content',
    implementation_notes: undefined,
    limitations: undefined,
  }

  it('synthesizes from a workstream_artifacts row and links it as source_type workstream_artifact', async () => {
    const supabase = createFakeSupabase({
      workstream_artifacts: [{ data: { id: 'artifact-1', title: 'Capability Inventory', content: 'evidence text' }, error: null }],
      wiki_articles: [
        { data: null, error: null }, // slug-availability check
        { data: { id: 'article-1', slug: 'how-kb-sandbox-is-organized' }, error: null }, // insert
      ],
      wiki_versions: [{ data: { id: 'version-1' }, error: null }],
      wiki_sources: [{ data: { id: 'source-1' }, error: null }],
    })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })
    const generateStructured = vi.fn().mockResolvedValue({ data: draftFields, model: 'test-model' })
    getActiveStructuredOutputProviderMock.mockResolvedValue({ name: 'test-provider', generateStructured })

    const result = await createAIAssistedDraftAction({
      topic: 'How KB Sandbox Is Organized',
      category: 'platform_handbook',
      workstreamArtifactId: 'artifact-1',
    })

    expect(result).toEqual({ articleId: 'article-1', slug: 'how-kb-sandbox-is-organized' })
    expect(generateStructured).toHaveBeenCalled()
    const sourceInsert = supabase._calls.find((c) => c.table === 'wiki_sources' && c.method === 'insert')
    expect(sourceInsert?.args).toMatchObject({
      wiki_version_id: 'version-1',
      workstream_artifact_id: 'artifact-1',
      source_type: 'workstream_artifact',
    })
  })

  it('rejects a link-only artifact (no content to synthesize from)', async () => {
    const supabase = createFakeSupabase({
      workstream_artifacts: [{ data: { id: 'artifact-2', title: 'External PR link', content: null }, error: null }],
    })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })

    await expect(
      createAIAssistedDraftAction({ topic: 'x', category: 'platform_handbook', workstreamArtifactId: 'artifact-2' })
    ).rejects.toThrow('link-only artifact')
    expect(getActiveStructuredOutputProviderMock).not.toHaveBeenCalled()
  })
})
