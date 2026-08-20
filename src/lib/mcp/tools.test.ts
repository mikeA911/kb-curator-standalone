import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const listProjectNotesMock = vi.fn()
const createProjectMock = vi.fn()
const approveProjectMock = vi.fn()
const createWorkstreamMock = vi.fn()
const attachArtifactMock = vi.fn()
const getActiveEmbeddingProviderMock = vi.fn()
const embedMock = vi.fn()
const rpcMock = vi.fn()
const wikiArticlesInMock = vi.fn()

vi.mock('@/lib/projects/notes', () => ({ listProjectNotes: (...args: unknown[]) => listProjectNotesMock(...args) }))
vi.mock('@/lib/workbench/projects', () => ({
  createProject: (...args: unknown[]) => createProjectMock(...args),
  approveProject: (...args: unknown[]) => approveProjectMock(...args),
}))
vi.mock('@/lib/workbench/workstreams', () => ({
  createWorkstream: (...args: unknown[]) => createWorkstreamMock(...args),
  attachArtifact: (...args: unknown[]) => attachArtifactMock(...args),
}))
vi.mock('@/lib/ai', () => ({ getActiveEmbeddingProvider: (...args: unknown[]) => getActiveEmbeddingProviderMock(...args) }))

const { callTool, listTools } = await import('./tools')

const ctx = {
  user: { id: 'user-1' },
  profile: { id: 'user-1', role: 'admin' },
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({ select: () => ({ in: (...inArgs: unknown[]) => wikiArticlesInMock(...inArgs) }) }),
  },
} as unknown as WorkbenchCallerContext

beforeEach(() => {
  listProjectNotesMock.mockReset()
  createProjectMock.mockReset()
  approveProjectMock.mockReset()
  createWorkstreamMock.mockReset()
  attachArtifactMock.mockReset()
  getActiveEmbeddingProviderMock.mockReset()
  embedMock.mockReset()
  rpcMock.mockReset()
  wikiArticlesInMock.mockReset()
  getActiveEmbeddingProviderMock.mockResolvedValue({ embed: embedMock })
  wikiArticlesInMock.mockResolvedValue({ data: [] })
})

describe('callTool', () => {
  it('rejects an unknown tool name', async () => {
    await expect(callTool(ctx, 'not_a_real_tool', {})).rejects.toThrow('Unknown tool')
  })

  it('rejects input that fails the schema before the handler runs', async () => {
    await expect(callTool(ctx, 'approve_project', { projectId: 123 })).rejects.toThrow()
    expect(approveProjectMock).not.toHaveBeenCalled()
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

  it('attach_workstream_artifact passes input through unchanged and returns the new artifact id', async () => {
    attachArtifactMock.mockResolvedValue({ projectId: 'proj-1', artifactId: 'artifact-1' })

    const input = { workstreamId: 'ws-1', artifactType: 'findings' as const, title: 'Findings', content: 'text' }
    const result = await callTool(ctx, 'attach_workstream_artifact', input)

    expect(attachArtifactMock).toHaveBeenCalledWith(ctx, input)
    expect(result).toEqual({ attached: true, artifactId: 'artifact-1' })
  })
})

describe('listTools', () => {
  it('lists all six registered tools with descriptions', () => {
    const names = listTools().map((t) => t.name)
    expect(names).toEqual([
      'search_wiki',
      'list_project_notes',
      'create_project',
      'approve_project',
      'create_workstream',
      'attach_workstream_artifact',
    ])
    expect(listTools().every((t) => t.description.length > 0)).toBe(true)
  })
})
