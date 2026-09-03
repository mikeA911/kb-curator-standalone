import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const listProjectNotesMock = vi.fn()
const createProjectMock = vi.fn()
const approveProjectMock = vi.fn()
const searchProjectsMock = vi.fn()
const setProjectInformationSensitivityMock = vi.fn()
const createWorkstreamMock = vi.fn()
const attachArtifactMock = vi.fn()
const createManualDraftArticleMock = vi.fn()
const linkRelatedArticleMock = vi.fn()
const getActiveEmbeddingProviderMock = vi.fn()
const embedMock = vi.fn()
const rpcMock = vi.fn()
const wikiArticlesInMock = vi.fn()
const wikiArticlesMaybeSingleMock = vi.fn()

class FakeWikiValidationError extends Error {}

vi.mock('@/lib/projects/notes', () => ({ listProjectNotes: (...args: unknown[]) => listProjectNotesMock(...args) }))
vi.mock('@/lib/projects/evidence-access', () => ({
  setProjectInformationSensitivity: (...args: unknown[]) => setProjectInformationSensitivityMock(...args),
}))
vi.mock('@/lib/workbench/projects', () => ({
  createProject: (...args: unknown[]) => createProjectMock(...args),
  approveProject: (...args: unknown[]) => approveProjectMock(...args),
  searchProjects: (...args: unknown[]) => searchProjectsMock(...args),
}))
vi.mock('@/lib/workbench/workstreams', () => ({
  createWorkstream: (...args: unknown[]) => createWorkstreamMock(...args),
  attachArtifact: (...args: unknown[]) => attachArtifactMock(...args),
}))
vi.mock('@/lib/wiki/articles', () => ({
  createManualDraftArticle: (...args: unknown[]) => createManualDraftArticleMock(...args),
  WikiValidationError: FakeWikiValidationError,
}))
vi.mock('@/lib/wiki/relations', () => ({ linkRelatedArticle: (...args: unknown[]) => linkRelatedArticleMock(...args) }))
vi.mock('@/lib/ai', () => ({ getActiveEmbeddingProvider: (...args: unknown[]) => getActiveEmbeddingProviderMock(...args) }))

const { callTool, listTools } = await import('./tools')

const ctx = {
  user: { id: 'user-1' },
  profile: { id: 'user-1', role: 'admin' },
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({
      select: () => ({
        in: (...inArgs: unknown[]) => wikiArticlesInMock(...inArgs),
        eq: () => ({ maybeSingle: (...singleArgs: unknown[]) => wikiArticlesMaybeSingleMock(...singleArgs) }),
      }),
    }),
  },
} as unknown as WorkbenchCallerContext

beforeEach(() => {
  listProjectNotesMock.mockReset()
  createProjectMock.mockReset()
  approveProjectMock.mockReset()
  searchProjectsMock.mockReset()
  setProjectInformationSensitivityMock.mockReset()
  createWorkstreamMock.mockReset()
  attachArtifactMock.mockReset()
  createManualDraftArticleMock.mockReset()
  linkRelatedArticleMock.mockReset()
  getActiveEmbeddingProviderMock.mockReset()
  embedMock.mockReset()
  rpcMock.mockReset()
  wikiArticlesInMock.mockReset()
  wikiArticlesMaybeSingleMock.mockReset()
  getActiveEmbeddingProviderMock.mockResolvedValue({ embed: embedMock })
  wikiArticlesInMock.mockResolvedValue({ data: [] })
  wikiArticlesMaybeSingleMock.mockResolvedValue({ data: null })
})

describe('callTool', () => {
  it('rejects an unknown tool name', async () => {
    await expect(callTool(ctx, 'not_a_real_tool', {})).rejects.toThrow('Unknown tool')
  })

  it('rejects input that fails the schema before the handler runs', async () => {
    await expect(callTool(ctx, 'approve_project', { projectId: 123 })).rejects.toThrow()
    expect(approveProjectMock).not.toHaveBeenCalled()
  })

  it('create_wiki_draft creates a draft article via createManualDraftArticle, always as status draft', async () => {
    createManualDraftArticleMock.mockResolvedValue({ article: { id: 'article-1', slug: 'my-method' } })

    const result = await callTool(ctx, 'create_wiki_draft', {
      title: 'My Method',
      category: 'platform_handbook',
      quickHelp: 'Use this when...',
      content: '## Goal\n\n...',
    })

    expect(createManualDraftArticleMock).toHaveBeenCalledWith(
      ctx.supabase,
      expect.objectContaining({
        slug: 'my-method',
        title: 'My Method',
        category: 'platform_handbook',
        quickHelp: 'Use this when...',
        content: '## Goal\n\n...',
        createdBy: 'user-1',
      })
    )
    expect(result).toEqual({ articleId: 'article-1', slug: 'my-method', status: 'draft' })
  })

  it('create_wiki_draft rejects a category outside the allowed Handbook/Product-Handbook set', async () => {
    await expect(
      callTool(ctx, 'create_wiki_draft', { title: 'X', category: 'governance', quickHelp: 'x', content: 'x' })
    ).rejects.toThrow()
    expect(createManualDraftArticleMock).not.toHaveBeenCalled()
  })

  it('create_wiki_draft retries once with a suffixed slug on a slug collision', async () => {
    createManualDraftArticleMock
      .mockRejectedValueOnce(new FakeWikiValidationError('Slug "my-method-workbench-method" is already in use'))
      .mockResolvedValueOnce({ article: { id: 'article-2', slug: 'my-method-workbench-method-abcd' } })

    const result = await callTool(ctx, 'create_wiki_draft', {
      title: 'My Method',
      category: 'platform_handbook',
      quickHelp: 'Use this when...',
      content: '## Goal',
    })

    expect(createManualDraftArticleMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ articleId: 'article-2', slug: 'my-method-workbench-method-abcd', status: 'draft' })
  })

  it('create_wiki_draft links each found related article title, skipping ones that do not resolve', async () => {
    createManualDraftArticleMock.mockResolvedValue({ article: { id: 'article-1', slug: 'my-method-workbench-method' } })
    wikiArticlesMaybeSingleMock.mockResolvedValueOnce({ data: { id: 'related-1' } }).mockResolvedValueOnce({ data: null })

    await callTool(ctx, 'create_wiki_draft', {
      title: 'My Method',
      category: 'platform_handbook',
      quickHelp: 'x',
      content: 'x',
      relatedArticleTitles: ['Existing Method (Workbench Method)', 'Nonexistent Method (Workbench Method)'],
    })

    expect(linkRelatedArticleMock).toHaveBeenCalledTimes(1)
    expect(linkRelatedArticleMock).toHaveBeenCalledWith(ctx.supabase, 'article-1', 'related-1')
  })

  it('get_navigation_guide returns the full catalogue when no topic is given, excluding the Ember-behavior/process sections', async () => {
    const result = (await callTool(ctx, 'get_navigation_guide', {})) as { guide: string }
    expect(result.guide).toContain('Navigation map')
    expect(result.guide).toContain('Sign in')
    expect(result.guide).not.toContain('## Ember response contract for navigation')
    expect(result.guide).not.toContain('## Update checklist')
  })

  it('get_navigation_guide narrows to matching sections when a topic is given', async () => {
    const result = (await callTool(ctx, 'get_navigation_guide', { topic: 'agent registry' })) as { guide: string }
    expect(result.guide).toContain('Agent Registry')
    expect(result.guide).not.toContain('### Draft and submit an article')
  })

  it('get_navigation_guide falls back to the full catalogue when a topic matches nothing', async () => {
    const result = (await callTool(ctx, 'get_navigation_guide', { topic: 'zzz-no-such-topic-zzz' })) as { guide: string }
    expect(result.guide).toContain('Navigation map')
    expect(result.guide.length).toBeGreaterThan(1000)
  })

  // OR-030 -- curator-led Project onboarding (membership authority, member-
  // submitted knowledge sources, per-project starter prompt) added four new
  // catalogue entries; these confirm Ember can actually discover them, and
  // that the explicit "never claim X" guidance (curator can't create a
  // curator/admin account; a submission isn't retrievable until approved)
  // survived topic-narrowing rather than only existing in the full catalogue.
  it('get_navigation_guide surfaces the new member-invite entry and its curator/admin cap', async () => {
    const result = (await callTool(ctx, 'get_navigation_guide', { topic: 'invite a member' })) as { guide: string }
    expect(result.guide).toContain('### Add or invite a member to a Project')
    expect(result.guide).toContain('a curator can never create a new curator or admin account')
  })

  it('get_navigation_guide surfaces the new source-submission entry and the not-yet-retrievable rule', async () => {
    const result = (await callTool(ctx, 'get_navigation_guide', { topic: 'submit a candidate source' })) as { guide: string }
    expect(result.guide).toContain('### Submit a candidate source for a Project')
    expect(result.guide).toContain('Nothing becomes retrievable by Ember at this point')
  })

  it('get_navigation_guide surfaces the source-review entry and the real-approval-moment rule', async () => {
    const result = (await callTool(ctx, 'get_navigation_guide', { topic: 'review and decide a candidate source' })) as { guide: string }
    expect(result.guide).toContain('### Review and decide a candidate source')
    expect(result.guide).toContain('this is the moment the source actually becomes retrievable by Ember, never before')
  })

  it('get_navigation_guide surfaces the new starter-prompt entry', async () => {
    const result = (await callTool(ctx, 'get_navigation_guide', { topic: 'starter prompt' })) as { guide: string }
    expect(result.guide).toContain("### Configure a Project's Ember starter prompt")
  })

  it('search_wiki embeds the query, calls match_wiki_vectors, and shapes the output with content and category', async () => {
    embedMock.mockResolvedValue({ embedding: [0.1, 0.2, 0.3], model: 'embed-model', dimensions: 3, usage: { inputTokens: 3, outputTokens: 0 } })
    rpcMock.mockResolvedValue({
      data: [{ id: 'v1', wiki_version_id: 'ver-1', wiki_article_id: 'a1', content: 'text', similarity: 0.78, article_slug: 'a1-slug', article_title: 'A1' }],
      error: null,
    })
    wikiArticlesInMock.mockResolvedValue({ data: [{ id: 'a1', category: 'platform_handbook' }] })

    const result = await callTool(ctx, 'search_wiki', { query: 'retrieval' })

    expect(embedMock).toHaveBeenCalledWith({ text: 'retrieval' })
    expect(rpcMock).toHaveBeenCalledWith('match_wiki_vectors', { query_embedding: [0.1, 0.2, 0.3], match_threshold: 0, match_count: 5 })
    expect(wikiArticlesInMock).toHaveBeenCalledWith('id', ['a1'])
    expect(result).toEqual({
      articles: [{ articleId: 'a1', slug: 'a1-slug', title: 'A1', category: 'platform_handbook', similarity: 0.78, content: 'text' }],
    })
  })

  it('search_wiki truncates content over 4000 characters', async () => {
    embedMock.mockResolvedValue({ embedding: [0.1], model: 'embed-model', dimensions: 1, usage: { inputTokens: 1, outputTokens: 0 } })
    const longContent = 'x'.repeat(5000)
    rpcMock.mockResolvedValue({
      data: [{ id: 'v1', wiki_version_id: 'ver-1', wiki_article_id: 'a1', content: longContent, similarity: 0.5, article_slug: 'a1-slug', article_title: 'A1' }],
      error: null,
    })

    const result = (await callTool(ctx, 'search_wiki', { query: 'retrieval' })) as { articles: { content: string }[] }

    expect(result.articles[0].content).toHaveLength(4001)
    expect(result.articles[0].content.endsWith('…')).toBe(true)
  })

  it('list_project_notes maps input and shapes the output', async () => {
    listProjectNotesMock.mockResolvedValue([
      { id: 'n1', subject: 'Subject', body: 'Body', status: 'open', created_at: '2026-08-18T00:00:00Z', author: { email: 'a@b.com' } },
    ])

    const result = await callTool(ctx, 'list_project_notes', { projectId: 'proj-1', status: 'open' })

    expect(listProjectNotesMock).toHaveBeenCalledWith(ctx.supabase, 'proj-1', { status: 'open' })
    expect(result).toEqual({
      notes: [{ id: 'n1', subject: 'Subject', body: 'Body', authorEmail: 'a@b.com', status: 'open', createdAt: '2026-08-18T00:00:00Z' }],
    })
  })

  it('search_projects passes query/limit through and reshapes the result', async () => {
    searchProjectsMock.mockResolvedValue([
      { id: 'proj-1', name: 'Sandz–Zadara Pilot', projectType: 'consulting', status: 'draft', objective: 'Pilot proposals' },
    ])

    const result = await callTool(ctx, 'search_projects', { query: 'Sandz', limit: 10 })

    expect(searchProjectsMock).toHaveBeenCalledWith(ctx, 'Sandz', 10)
    expect(result).toEqual({
      projects: [{ id: 'proj-1', name: 'Sandz–Zadara Pilot', projectType: 'consulting', status: 'draft', objective: 'Pilot proposals' }],
    })
  })

  it('classify_project delegates to setProjectInformationSensitivity and reports the tier back', async () => {
    setProjectInformationSensitivityMock.mockResolvedValue(undefined)

    const result = await callTool(ctx, 'classify_project', { projectId: 'proj-1', sensitivity: 'restricted' })

    expect(setProjectInformationSensitivityMock).toHaveBeenCalledWith(ctx, 'proj-1', 'restricted')
    expect(result).toEqual({ classified: true, sensitivity: 'restricted' })
  })

  it('classify_project propagates a thrown error (e.g. RLS-blocked non-manager caller) rather than reporting false success', async () => {
    setProjectInformationSensitivityMock.mockRejectedValue(new Error('not found or not permitted'))

    await expect(callTool(ctx, 'classify_project', { projectId: 'proj-1', sensitivity: 'restricted' })).rejects.toThrow(
      'not found or not permitted'
    )
  })

  it('create_project supplies null/empty defaults for fields not exposed on the tool', async () => {
    createProjectMock.mockResolvedValue({ projectId: 'proj-1' })

    const result = await callTool(ctx, 'create_project', {
      name: 'New Project',
      projectType: 'learning',
      objective: 'Try something',
      details: {},
    })

    expect(createProjectMock).toHaveBeenCalledWith(ctx, {
      name: 'New Project',
      projectType: 'learning',
      objective: 'Try something',
      details: {},
      knowledgeBaseId: null,
      evalDatasetId: null,
      members: [],
    })
    expect(result).toEqual({ projectId: 'proj-1' })
  })

  it('approve_project delegates straight to the already-gated workbench function', async () => {
    approveProjectMock.mockResolvedValue(undefined)

    const result = await callTool(ctx, 'approve_project', { projectId: 'proj-1' })

    expect(approveProjectMock).toHaveBeenCalledWith(ctx, 'proj-1')
    expect(result).toEqual({ approved: true })
  })

  it('create_workstream defaults repositoryScope to empty', async () => {
    createWorkstreamMock.mockResolvedValue({ workstreamId: 'ws-1', projectId: 'proj-1' })

    const result = await callTool(ctx, 'create_workstream', {
      projectId: 'proj-1',
      name: 'Discovery',
      slug: 'discovery',
      deliverables: ['Do the thing'],
    })

    expect(createWorkstreamMock).toHaveBeenCalledWith(ctx, {
      projectId: 'proj-1',
      name: 'Discovery',
      slug: 'discovery',
      repositoryScope: [],
      goal: undefined,
      guardrail: undefined,
      deliverables: ['Do the thing'],
    })
    expect(result).toEqual({ workstreamId: 'ws-1' })
  })

  it('attach_workstream_artifact passes input through unchanged and returns the new artifact id and status', async () => {
    attachArtifactMock.mockResolvedValue({ projectId: 'proj-1', artifactId: 'artifact-1', status: 'ready_for_review', validationNotes: [] })

    const input = { workstreamId: 'ws-1', artifactType: 'findings' as const, title: 'Findings', content: 'text' }
    const result = await callTool(ctx, 'attach_workstream_artifact', input)

    expect(attachArtifactMock).toHaveBeenCalledWith(ctx, input)
    expect(result).toEqual({ attached: true, artifactId: 'artifact-1', status: 'ready_for_review', validationNotes: [] })
  })

  it('attach_workstream_artifact relays a validation_failed status and its notes honestly', async () => {
    attachArtifactMock.mockResolvedValue({
      projectId: 'proj-1',
      artifactId: 'artifact-2',
      status: 'validation_failed',
      validationNotes: ["'info.title' is missing."],
    })

    const input = { workstreamId: 'ws-1', artifactType: 'openapi_spec' as const, title: 'Contract v0.2', content: '{}' }
    const result = await callTool(ctx, 'attach_workstream_artifact', input)

    expect(result).toEqual({
      attached: true,
      artifactId: 'artifact-2',
      status: 'validation_failed',
      validationNotes: ["'info.title' is missing."],
    })
  })
})

describe('listTools', () => {
  it('lists all ten registered tools with descriptions', () => {
    const names = listTools().map((t) => t.name)
    expect(names).toEqual([
      'get_navigation_guide',
      'create_wiki_draft',
      'search_wiki',
      'list_project_notes',
      'search_projects',
      'classify_project',
      'create_project',
      'approve_project',
      'create_workstream',
      'attach_workstream_artifact',
    ])
    expect(listTools().every((t) => t.description.length > 0)).toBe(true)
  })
})
