import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AIProvider } from '@/lib/ai/provider'
import { enrichChunk } from './enrichment'
import { buildEnrichmentError } from './failures'

// Enriches up to `limit` not-yet-enriched chunks for a document. Each chunk's
// outcome is independent: one failure records enrichment_error + review_status
// 'failed' on that chunk and moves on, rather than aborting the batch or
// silently writing placeholder metadata (see lib/curator/failures.ts).
export async function enrichDocumentChunks(
  supabase: SupabaseClient<Database>,
  provider: AIProvider,
  documentId: string,
  docType: string,
  limit = 10
) {
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, chunk_text')
    .eq('document_id', documentId)
    .eq('review_status', 'pending')
    .is('ai_metadata', null)
    .order('chunk_index', { ascending: true })
    .limit(limit)
  if (error) throw error

  const results = { enriched: 0, failed: 0 }

  for (const chunk of chunks ?? []) {
    await supabase.from('document_chunks').update({ review_status: 'enriching' }).eq('id', chunk.id)

    try {
      const metadata = await enrichChunk(provider, chunk.chunk_text, docType)
      await supabase
        .from('document_chunks')
        .update({
          ai_metadata: metadata,
          confidence_score: metadata.confidence ?? null,
          review_status: 'pending',
          enrichment_error: null,
        })
        .eq('id', chunk.id)
      results.enriched++
    } catch (err) {
      await supabase
        .from('document_chunks')
        .update({ review_status: 'failed', enrichment_error: buildEnrichmentError(err) })
        .eq('id', chunk.id)
      results.failed++
    }
  }

  return results
}

export interface ApproveChunkInput {
  chunkId: string
  curatorNotes: string | null
  reviewedBy: string
}

// Approves a chunk, embeds it, and writes the kb_vectors row in one place so
// "approved" and "embedded" can't drift apart the way they could in the old
// app (which logged-and-ignored a failed kb_vectors insert after approving).
// Any failure here throws -- the chunk stays whatever it was before, not
// silently marked approved without a vector.
export async function approveChunk(
  supabase: SupabaseClient<Database>,
  provider: AIProvider,
  input: ApproveChunkInput
) {
  const { data: chunk, error: chunkError } = await supabase
    .from('document_chunks')
    .select('*, document:documents(doc_type, filename)')
    .eq('id', input.chunkId)
    .single()
  if (chunkError || !chunk) throw chunkError ?? new Error('Chunk not found')

  const embedding = await provider.embed({ text: chunk.chunk_text })

  const { error: vectorError } = await supabase.from('kb_vectors').insert({
    chunk_id: chunk.id,
    document_id: chunk.document_id,
    content: chunk.chunk_text,
    embedding: embedding.embedding,
    embedding_model: embedding.model,
    embedding_dim: embedding.dimensions,
    doc_type: chunk.document?.doc_type ?? '',
    topic: chunk.ai_metadata?.topic ?? null,
    subtopic: chunk.ai_metadata?.subtopic ?? null,
    use_cases: chunk.ai_metadata?.use_cases ?? null,
    key_concepts: chunk.ai_metadata?.key_concepts ?? null,
    relevance_score: chunk.ai_metadata?.relevance_score ?? null,
    curator_notes: input.curatorNotes,
    source_document: chunk.document?.filename ?? null,
    source_page: chunk.source_page,
    source_url: null,
    domain: chunk.document?.doc_type ?? null,
    curator_name: null,
    tags: null,
    chunk_index: chunk.chunk_index,
    word_count: chunk.chunk_size,
    approved_by: input.reviewedBy,
  })
  if (vectorError) throw vectorError

  const { error: updateError } = await supabase
    .from('document_chunks')
    .update({
      review_status: 'approved',
      curator_notes: input.curatorNotes,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.chunkId)
  if (updateError) throw updateError

  await supabase.rpc('increment_approved_chunks', { doc_id: chunk.document_id })
}

export interface RejectChunkInput {
  chunkId: string
  curatorNotes: string | null
  reviewedBy: string
}

export async function rejectChunk(supabase: SupabaseClient<Database>, input: RejectChunkInput) {
  const { data: chunk, error: chunkError } = await supabase
    .from('document_chunks')
    .select('document_id')
    .eq('id', input.chunkId)
    .single()
  if (chunkError || !chunk) throw chunkError ?? new Error('Chunk not found')

  const { error } = await supabase
    .from('document_chunks')
    .update({
      review_status: 'rejected',
      curator_notes: input.curatorNotes,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.chunkId)
  if (error) throw error

  await supabase.rpc('increment_rejected_chunks', { doc_id: chunk.document_id })
}

export async function saveChunkDraft(supabase: SupabaseClient<Database>, chunkId: string, curatorNotes: string | null) {
  const { error } = await supabase.from('document_chunks').update({ review_status: 'draft', curator_notes: curatorNotes }).eq('id', chunkId)
  if (error) throw error
}
