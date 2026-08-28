import { describe, it, expect } from 'vitest'
import { approveChunk, rejectChunk } from './chunks'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { AIProvider } from '@/lib/ai/provider'

const fakeProvider: AIProvider = {
  name: 'fake',
  async generateText() {
    throw new Error('not used')
  },
  async generateStructured() {
    throw new Error('not used')
  },
  async generateChat() {
    throw new Error('not used')
  },
  async embed() {
    return { embedding: [0.1, 0.2, 0.3], model: 'fake-embed', dimensions: 3, usage: { inputTokens: 5, outputTokens: null } }
  },
}

describe('approveChunk', () => {
  it('writes a kb_vectors row and marks the chunk approved with an audit trail', async () => {
    const supabase = createFakeSupabase({
      document_chunks: [
        {
          data: {
            id: 'chunk-1',
            document_id: 'doc-1',
            chunk_text: 'some text',
            chunk_index: 0,
            chunk_size: 2,
            source_page: 3,
            ai_metadata: { topic: 'Billing', use_cases: [], key_concepts: [] },
            document: { doc_type: 'billing', filename: 'a.pdf' },
          },
          error: null,
        },
        { data: null, error: null }, // the update() call
      ],
      kb_vectors: [{ data: null, error: null }],
    }) as never

    await approveChunk(supabase, fakeProvider, { chunkId: 'chunk-1', curatorNotes: 'looks good', reviewedBy: 'curator-1' })

    expect((supabase as ReturnType<typeof createFakeSupabase>)._rpcCalls).toEqual([
      { name: 'increment_approved_chunks', args: { doc_id: 'doc-1' } },
    ])
  })
})

describe('rejectChunk', () => {
  it('records the rejection and deletes any existing kb_vectors row for the chunk', async () => {
    const supabase = createFakeSupabase({
      document_chunks: [{ data: { document_id: 'doc-1' }, error: null }, { data: null, error: null }],
      kb_vectors: [{ data: null, error: null }],
    }) as never

    await rejectChunk(supabase, { chunkId: 'chunk-1', curatorNotes: null, reviewedBy: 'curator-1' })

    const typedSupabase = supabase as ReturnType<typeof createFakeSupabase>
    expect(typedSupabase._rpcCalls).toEqual([{ name: 'increment_rejected_chunks', args: { doc_id: 'doc-1' } }])
    // A chunk can be re-reviewed after already being approved -- rejecting it
    // must delete any kb_vectors row approveChunk already wrote, or match_documents
    // (the RAG search RPC) would keep surfacing "rejected" content to Ember.
    const vectorDelete = typedSupabase._calls.find((c) => c.table === 'kb_vectors' && c.method === 'delete')
    expect(vectorDelete).toBeDefined()
  })
})
