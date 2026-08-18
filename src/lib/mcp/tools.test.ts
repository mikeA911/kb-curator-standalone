import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const listArticlesMock = vi.fn()
const listProjectNotesMock = vi.fn()
const createProjectMock = vi.fn()
const approveProjectMock = vi.fn()
const createWorkstreamMock = vi.fn()
const attachArtifactMock = vi.fn()

vi.mock('@/lib/wiki/queries', () => ({ listArticles: (...args: unknown[]) => listArticlesMock(...args) }))
vi.mock('@/lib/projects/notes', () => ({ listProjectNotes: (...args: unknown[]) => listProjectNotesMock(...args) }))
vi.mock('@/lib/workbench/projects', () => ({
  createProject: (...args: unknown[]) => createProjectMock(...args),
  approveProject: (...args: unknown[]) => approveProjectMock(...args),
}))
vi.mock('@/lib/workbench/workstreams', () => ({
  createWorkstream: (...args: unknown[]) => createWorkstreamMock(...args),
  attachArtifact: (...args: unknown[]) => attachArtifactMock(...args),
}))

const { callTool, listTools } = await import('./tools')

const ctx = { user: { id: 'user-1' }, profile: { id: 'user-1', role: 'admin' }, supabase: {} } as unknown as WorkbenchCallerContext

beforeEach(() => {
  listArticlesMock.mockReset()
  listProjectNotesMock.mockReset()
  createProjectMock.mockReset()
  approveProjectMock.mockReset()
  createWorkstreamMock.mockReset()
  attachArtifactMock.mockReset()
})

describe('callTool', () => {
  it('rejects an unknown tool name', async () => {
    await expect(callTool(ctx, 'not_a_real_tool', {})).rejects.toThrow('Unknown tool')
  })

  it('rejects input that fails the schema before the handler runs', async () => {
    await expect(callTool(ctx, 'approve_project', { projectId: 123 })).rejects.toThrow()
    expect(approveProjectMock).not.toHaveBeenCalled()
  })

  it('search_wiki maps input to listArticles and shapes the output', async () => {
    listArticlesMock.mockResolvedValue([
      { id: 'a1', slug: 'a1-slug', title: 'A1', short_description: 'about a1' },
    ])

    const result = await callTool(ctx, 'search_wiki', { query: 'retrieval', category: 'foundations' })

    expect(listArticlesMock).toHaveBeenCalledWith(ctx.supabase, { search: 'retrieval', category: 'foundations' })
    expect(result).toEqual({ articles: [{ id: 'a1', slug: 'a1-slug', title: 'A1', shortDescription: 'about a1' }] })
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

  it('attach_workstream_artifact passes input through unchanged', async () => {
    attachArtifactMock.mockResolvedValue({ projectId: 'proj-1' })

    const input = { workstreamId: 'ws-1', artifactType: 'findings' as const, title: 'Findings', content: 'text' }
    const result = await callTool(ctx, 'attach_workstream_artifact', input)

    expect(attachArtifactMock).toHaveBeenCalledWith(ctx, input)
    expect(result).toEqual({ attached: true })
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
