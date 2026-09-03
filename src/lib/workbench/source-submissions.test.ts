import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from './context'

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: (...args: unknown[]) => createAdminClientMock(...args) }))

const createUploadedDocumentMock = vi.fn()
const processDocumentMock = vi.fn()
const deleteDocumentByIdMock = vi.fn()
vi.mock('@/lib/curator/documents', () => ({
  createUploadedDocument: (...args: unknown[]) => createUploadedDocumentMock(...args),
  processDocument: (...args: unknown[]) => processDocumentMock(...args),
  deleteDocumentById: (...args: unknown[]) => deleteDocumentByIdMock(...args),
}))

const approveChunkMock = vi.fn()
vi.mock('@/lib/curator/chunks', () => ({ approveChunk: (...args: unknown[]) => approveChunkMock(...args) }))

const getActiveEmbeddingProviderMock = vi.fn().mockResolvedValue({})
vi.mock('@/lib/ai', () => ({ getActiveEmbeddingProvider: (...args: unknown[]) => getActiveEmbeddingProviderMock(...args) }))

const requireActiveKnowledgeBaseMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/knowledge-bases', () => ({ requireActiveKnowledgeBase: (...args: unknown[]) => requireActiveKnowledgeBaseMock(...args) }))

const { submitFileSource, submitArtifactSource, approveSourceSubmission, rejectSourceSubmission } = await import('./source-submissions')

beforeEach(() => {
  createAdminClientMock.mockReset()
  createUploadedDocumentMock.mockReset()
  processDocumentMock.mockReset()
  deleteDocumentByIdMock.mockReset()
  approveChunkMock.mockReset()
  getActiveEmbeddingProviderMock.mockClear()
  requireActiveKnowledgeBaseMock.mockClear()
})

function ctxWith(supabase: unknown, opts: { userId?: string; platformRole?: string } = {}): WorkbenchCallerContext {
  return {
    user: { id: opts.userId ?? 'user-1' },
    profile: { role: opts.platformRole ?? 'consultant' },
    supabase,
  } as unknown as WorkbenchCallerContext
}

const fakeFile = new File(['hello'], 'notes.txt', { type: 'text/plain' })

describe('submitFileSource', () => {
  it('rejects a caller with no active membership on the project', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: null, error: null }] })
    await expect(submitFileSource(ctxWith(supabase), { projectId: 'proj-1', knowledgeBaseId: 'kb-1', file: fakeFile })).rejects.toThrow(
      'active member of this project'
    )
    expect(createUploadedDocumentMock).not.toHaveBeenCalled()
  })

  it('rejects a knowledge base that is not attached to this project', async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
      project_knowledge_bases: [{ data: null, error: null }],
    })
    await expect(submitFileSource(ctxWith(supabase), { projectId: 'proj-1', knowledgeBaseId: 'kb-1', file: fakeFile })).rejects.toThrow(
      'not attached to this project'
    )
    expect(createUploadedDocumentMock).not.toHaveBeenCalled()
  })

  it('lets an active member (any role) upload a document and creates a pending submission', async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
      project_knowledge_bases: [{ data: { knowledge_base_id: 'kb-1' }, error: null }],
      project_source_submissions: [{ data: { id: 'sub-1' }, error: null }],
    })
    const admin = createFakeSupabase({})
    createAdminClientMock.mockReturnValue(admin)
    createUploadedDocumentMock.mockResolvedValue({ id: 'doc-1' })

    const result = await submitFileSource(ctxWith(supabase), { projectId: 'proj-1', knowledgeBaseId: 'kb-1', file: fakeFile })

    expect(result).toEqual({ submissionId: 'sub-1' })
    expect(createUploadedDocumentMock).toHaveBeenCalledWith(admin, expect.objectContaining({ docType: 'kb-1', uploadedBy: 'user-1' }))
    const insert = supabase._calls.find((c) => c.table === 'project_source_submissions' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ source_kind: 'file', document_id: 'doc-1', submitted_by: 'user-1' })
  })
})

describe('submitArtifactSource', () => {
  it('rejects an artifact that is not yet approved', async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
      project_knowledge_bases: [{ data: { knowledge_base_id: 'kb-1' }, error: null }],
      workstream_artifacts: [{ data: { id: 'art-1', title: 'X', content: 'text', status: 'ready_for_review', workstream: { project_id: 'proj-1' } }, error: null }],
    })
    await expect(
      submitArtifactSource(ctxWith(supabase), { projectId: 'proj-1', knowledgeBaseId: 'kb-1', workstreamArtifactId: 'art-1' })
    ).rejects.toThrow('already-approved artifact')
  })

  it('rejects a content-less (link-only) artifact', async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
      project_knowledge_bases: [{ data: { knowledge_base_id: 'kb-1' }, error: null }],
      workstream_artifacts: [{ data: { id: 'art-1', title: 'X', content: null, status: 'approved', workstream: { project_id: 'proj-1' } }, error: null }],
    })
    await expect(
      submitArtifactSource(ctxWith(supabase), { projectId: 'proj-1', knowledgeBaseId: 'kb-1', workstreamArtifactId: 'art-1' })
    ).rejects.toThrow('already-approved artifact')
  })

  it("rejects an artifact belonging to a different project's workstream", async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
      project_knowledge_bases: [{ data: { knowledge_base_id: 'kb-1' }, error: null }],
      workstream_artifacts: [{ data: { id: 'art-1', title: 'X', content: 'text', status: 'approved', workstream: { project_id: 'other-project' } }, error: null }],
    })
    await expect(
      submitArtifactSource(ctxWith(supabase), { projectId: 'proj-1', knowledgeBaseId: 'kb-1', workstreamArtifactId: 'art-1' })
    ).rejects.toThrow('does not belong to this project')
  })

  it('accepts an approved, content-bearing artifact from this project', async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
      project_knowledge_bases: [{ data: { knowledge_base_id: 'kb-1' }, error: null }],
      workstream_artifacts: [{ data: { id: 'art-1', title: 'Findings', content: 'text', status: 'approved', workstream: { project_id: 'proj-1' } }, error: null }],
      project_source_submissions: [{ data: { id: 'sub-1' }, error: null }],
    })

    const result = await submitArtifactSource(ctxWith(supabase), { projectId: 'proj-1', knowledgeBaseId: 'kb-1', workstreamArtifactId: 'art-1' })

    expect(result).toEqual({ submissionId: 'sub-1' })
    const insert = supabase._calls.find((c) => c.table === 'project_source_submissions' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ source_kind: 'artifact', title: 'Findings', workstream_artifact_id: 'art-1' })
  })
})

describe('approveSourceSubmission', () => {
  it('rejects a caller who is not this project\'s owner/curator/admin', async () => {
    const supabase = createFakeSupabase({
      project_source_submissions: [{ data: { id: 'sub-1', project_id: 'proj-1', status: 'pending', source_kind: 'file', document_id: 'doc-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })
    await expect(approveSourceSubmission(ctxWith(supabase), 'sub-1')).rejects.toThrow("owner or curator role")
    expect(processDocumentMock).not.toHaveBeenCalled()
  })

  it('is a no-op on a submission that is no longer pending', async () => {
    const supabase = createFakeSupabase({
      project_source_submissions: [{ data: { id: 'sub-1', project_id: 'proj-1', status: 'approved' }, error: null }],
    })
    await approveSourceSubmission(ctxWith(supabase), 'sub-1')
    expect(processDocumentMock).not.toHaveBeenCalled()
  })

  it('for a file-kind submission, processes the already-uploaded document and auto-approves every chunk', async () => {
    const supabase = createFakeSupabase({
      project_source_submissions: [
        { data: { id: 'sub-1', project_id: 'proj-1', status: 'pending', source_kind: 'file', document_id: 'doc-1' }, error: null },
        { data: [{ id: 'sub-1' }], error: null }, // decision update
      ],
      project_members: [{ data: { role: 'curator' }, error: null }],
    })
    const admin = createFakeSupabase({ document_chunks: [{ data: [{ id: 'chunk-1' }, { id: 'chunk-2' }], error: null }] })
    createAdminClientMock.mockReturnValue(admin)

    await approveSourceSubmission(ctxWith(supabase), 'sub-1')

    expect(processDocumentMock).toHaveBeenCalledWith(admin, 'doc-1')
    expect(approveChunkMock).toHaveBeenCalledTimes(2)
    expect(approveChunkMock.mock.calls[0][2]).toMatchObject({ chunkId: 'chunk-1', reviewedBy: 'user-1' })
    const decisionUpdate = supabase._calls.find((c) => c.table === 'project_source_submissions' && c.method === 'update')
    expect(decisionUpdate?.args).toMatchObject({ status: 'approved', decided_by: 'user-1' })
  })

  it('for an artifact-kind submission, synthesizes a document from the artifact content first', async () => {
    const supabase = createFakeSupabase({
      project_source_submissions: [
        { data: { id: 'sub-1', project_id: 'proj-1', status: 'pending', source_kind: 'artifact', document_id: null, workstream_artifact_id: 'art-1', knowledge_base_id: 'kb-1', submitted_by: 'member-1' }, error: null },
        { data: [{ id: 'sub-1' }], error: null },
      ],
      project_members: [{ data: { role: 'owner' }, error: null }],
    })
    const admin = createFakeSupabase({
      workstream_artifacts: [{ data: { title: 'Findings', content: 'Real content' }, error: null }],
      document_chunks: [{ data: [], error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)
    createUploadedDocumentMock.mockResolvedValue({ id: 'doc-synth-1' })

    await approveSourceSubmission(ctxWith(supabase), 'sub-1')

    expect(createUploadedDocumentMock).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ docType: 'kb-1', uploadedBy: 'member-1' })
    )
    expect(processDocumentMock).toHaveBeenCalledWith(admin, 'doc-synth-1')
  })
})

describe('rejectSourceSubmission', () => {
  it('rejects a caller who is not this project\'s owner/curator/admin', async () => {
    const supabase = createFakeSupabase({
      project_source_submissions: [{ data: { id: 'sub-1', project_id: 'proj-1', status: 'pending', source_kind: 'file', document_id: 'doc-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })
    await expect(rejectSourceSubmission(ctxWith(supabase), 'sub-1')).rejects.toThrow('owner or curator role')
    expect(deleteDocumentByIdMock).not.toHaveBeenCalled()
  })

  it('deletes the already-created document for a rejected file-kind submission', async () => {
    const supabase = createFakeSupabase({
      project_source_submissions: [
        { data: { id: 'sub-1', project_id: 'proj-1', status: 'pending', source_kind: 'file', document_id: 'doc-1' }, error: null },
        { data: [{ id: 'sub-1' }], error: null },
      ],
      project_members: [{ data: { role: 'curator' }, error: null }],
    })
    const admin = createFakeSupabase({})
    createAdminClientMock.mockReturnValue(admin)

    await rejectSourceSubmission(ctxWith(supabase), 'sub-1', 'Not relevant')

    expect(deleteDocumentByIdMock).toHaveBeenCalledWith(admin, 'doc-1', expect.objectContaining({ role: 'admin' }))
    const decisionUpdate = supabase._calls.find((c) => c.table === 'project_source_submissions' && c.method === 'update')
    expect(decisionUpdate?.args).toMatchObject({ status: 'rejected', decision_reason: 'Not relevant' })
  })

  it('does not attempt to delete a document for a rejected artifact-kind submission (none was ever created)', async () => {
    const supabase = createFakeSupabase({
      project_source_submissions: [
        { data: { id: 'sub-1', project_id: 'proj-1', status: 'pending', source_kind: 'artifact', document_id: null }, error: null },
        { data: [{ id: 'sub-1' }], error: null },
      ],
      project_members: [{ data: { role: 'curator' }, error: null }],
    })

    await rejectSourceSubmission(ctxWith(supabase), 'sub-1')

    expect(deleteDocumentByIdMock).not.toHaveBeenCalled()
  })
})
