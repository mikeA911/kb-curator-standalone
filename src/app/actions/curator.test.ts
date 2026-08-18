import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireRoleMock = vi.fn()
const getActiveEmbeddingProviderMock = vi.fn()
const getActiveStructuredOutputProviderMock = vi.fn()
const enrichDocumentChunksMock = vi.fn()
const approveChunkMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireRole: (...args: unknown[]) => requireRoleMock(...args),
  }
})
vi.mock('@/lib/ai', () => ({
  getActiveEmbeddingProvider: (...args: unknown[]) => getActiveEmbeddingProviderMock(...args),
  getActiveStructuredOutputProvider: (...args: unknown[]) => getActiveStructuredOutputProviderMock(...args),
}))
vi.mock('@/lib/curator/documents', () => ({
  createUploadedDocument: vi.fn(),
  processDocument: vi.fn(),
  submitDocument: vi.fn(),
  deleteDocumentById: vi.fn(),
}))
vi.mock('@/lib/curator/chunks', async () => {
  const actual = await vi.importActual<typeof import('@/lib/curator/chunks')>('@/lib/curator/chunks')
  return {
    ...actual,
    enrichDocumentChunks: (...args: unknown[]) => enrichDocumentChunksMock(...args),
    approveChunk: (...args: unknown[]) => approveChunkMock(...args),
  }
})

const { enrichMoreChunks, approveChunkAction } = await import('./curator')

beforeEach(() => {
  requireRoleMock.mockReset()
  getActiveEmbeddingProviderMock.mockReset()
  getActiveStructuredOutputProviderMock.mockReset()
  enrichDocumentChunksMock.mockReset()
  approveChunkMock.mockReset()
})

describe('approveChunkAction', () => {
  it('resolves the embedding provider, not generation or structured-output -- some generation-only providers (e.g. Groq) cannot embed at all', async () => {
    const supabase = {}
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })
    const embeddingProvider = { name: 'embedding-provider' }
    getActiveEmbeddingProviderMock.mockResolvedValue(embeddingProvider)

    await approveChunkAction('chunk-1', 'doc-1', 'looks good')

    expect(getActiveEmbeddingProviderMock).toHaveBeenCalled()
    expect(getActiveStructuredOutputProviderMock).not.toHaveBeenCalled()
    expect(approveChunkMock).toHaveBeenCalledWith(supabase, embeddingProvider, {
      chunkId: 'chunk-1',
      curatorNotes: 'looks good',
      reviewedBy: 'curator-1',
    })
  })
})

describe('enrichMoreChunks', () => {
  it('resolves the structured-output provider, not plain generation or embedding -- enrichment extracts topic/key_concepts as JSON', async () => {
    const supabase = {}
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })
    const structuredProvider = { name: 'structured-output-provider' }
    getActiveStructuredOutputProviderMock.mockResolvedValue(structuredProvider)
    enrichDocumentChunksMock.mockResolvedValue({ enriched: 0 })

    await enrichMoreChunks('doc-1', 'billing')

    expect(getActiveStructuredOutputProviderMock).toHaveBeenCalled()
    expect(getActiveEmbeddingProviderMock).not.toHaveBeenCalled()
    expect(enrichDocumentChunksMock).toHaveBeenCalledWith(supabase, structuredProvider, 'doc-1', 'billing', 10)
  })
})
