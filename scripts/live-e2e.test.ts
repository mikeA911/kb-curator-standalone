// Manual live-integration check against the REAL Supabase project configured
// in .env.local -- creates real data, uses real auth sessions, real storage,
// real AI provider calls. Not part of `npm test` (that glob is src/**/*.test.ts
// only); run explicitly with:
//   npx vitest run scripts/live-e2e.test.ts
// Requires .env.local to be loaded, e.g. via `node --env-file=.env.local
// $(npm bin)/vitest run scripts/live-e2e.test.ts` or an env-aware shell.

import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { parseDocument } from '@/lib/parsing'
import { chunkDocument } from '@/lib/chunking'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveProvider } from '@/lib/ai'
import { enrichDocumentChunks, approveChunk } from '@/lib/curator/chunks'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function signIn(email: string, password: string) {
  const client = createSupabaseClient<Database>(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`)
  return { client, userId: data.user.id }
}

describe.sequential('live E2E against the real Supabase project', () => {
  let curator: Awaited<ReturnType<typeof signIn>>
  let userAccount: Awaited<ReturnType<typeof signIn>>
  let documentId: string
  let storagePath: string
  let approvedChunkId: string

  beforeAll(async () => {
    curator = await signIn('test-curator@kbsandbox.local', process.env.TEST_CURATOR_PASSWORD!)
    userAccount = await signIn('test-user@kbsandbox.local', process.env.TEST_USER_PASSWORD!)
  })

  it('uploads a real PDF to private storage as the curator (real RLS storage policy)', async () => {
    const buffer = fs.readFileSync(path.join(process.cwd(), 'scripts/test-fixtures/chunking-strategies.pdf'))
    storagePath = `uploads/${Date.now()}-chunking-strategies.pdf`

    const { error } = await curator.client.storage.from('documents').upload(storagePath, buffer, {
      contentType: 'application/pdf',
    })
    expect(error).toBeNull()
  })

  it('rejects an unauthenticated fetch of the same storage object (private bucket, no public URL)', async () => {
    const { data } = curator.client.storage.from('documents').getPublicUrl(storagePath)
    const res = await fetch(data.publicUrl)
    expect(res.status).not.toBe(200)
  })

  it('inserts the documents row as the curator via real RLS (documents_insert_staff)', async () => {
    const { data, error } = await curator.client
      .from('documents')
      .insert({
        filename: storagePath.split('/').pop()!,
        original_filename: 'chunking-strategies.pdf',
        doc_type: 'fhir',
        storage_path: storagePath,
        file_size: 0,
        mime_type: 'application/pdf',
        source_url: `test-e2e://${Date.now()}`,
        uploaded_by: curator.userId,
        processing_status: 'pending',
        processing_stage: 'upload',
        processing_error: null,
        total_chunks: null,
        metadata: {},
      })
      .select()
      .single()
    expect(error).toBeNull()
    documentId = data!.id
  })

  it('a plain "user" role cannot see the document (RLS: not curator/admin, not the uploader)', async () => {
    const { data, error } = await userAccount.client.from('documents').select('id').eq('id', documentId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('parses the real PDF and writes real chunks with page provenance', async () => {
    const buffer = fs.readFileSync(path.join(process.cwd(), 'scripts/test-fixtures/chunking-strategies.pdf'))
    const parsed = await parseDocument(buffer, 'application/pdf')
    const chunks = chunkDocument(parsed)
    expect(chunks.length).toBeGreaterThan(0)

    const { error } = await curator.client.from('document_chunks').insert(
      chunks.map((c) => ({
        document_id: documentId,
        chunk_index: c.chunkIndex,
        chunk_text: c.text,
        chunk_size: c.wordCount,
        source_page: c.sourcePage,
        source_section: c.sourceSection,
        parser: c.parser,
        char_start: c.charStart,
        char_end: c.charEnd,
        ai_metadata: null,
        confidence_score: null,
        review_status: 'pending' as const,
        enrichment_error: null,
        curator_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        is_filtered: false,
        filtered_reason: null,
        metadata_edited: false,
        metadata_edited_by: null,
        metadata_edited_at: null,
      }))
    )
    expect(error).toBeNull()

    await curator.client
      .from('documents')
      .update({ processing_status: 'review', processing_stage: 'review', total_chunks: chunks.length })
      .eq('id', documentId)
  }, 30000)

  it('enriches chunks via the real active AI provider (Gemini)', async () => {
    const provider = await getActiveProvider(curator.client, { documentId, requestedBy: curator.userId })
    expect(provider.name).toBe('gemini')

    const result = await enrichDocumentChunks(curator.client, provider, documentId, 'fhir', 5)
    // Deliberately not `enriched + failed > 0` -- that passes even when every
    // chunk fails, which is exactly the shape of bug this live check exists
    // to catch (it did: gemini-2.0-flash silently failed 100% of calls after
    // Google shut the model down, and this assertion would have hidden it).
    expect(result.failed).toBe(0)
    expect(result.enriched).toBeGreaterThan(0)

    const { data: chunks } = await curator.client
      .from('document_chunks')
      .select('id, review_status, ai_metadata')
      .eq('document_id', documentId)
      .limit(1)
    approvedChunkId = chunks![0].id
  }, 60000)

  it('approves a chunk for real: writes kb_vectors with a real embedding and increments the counter', async () => {
    const provider = await getActiveProvider(curator.client, { documentId, chunkId: approvedChunkId, requestedBy: curator.userId })
    await approveChunk(curator.client, provider, {
      chunkId: approvedChunkId,
      curatorNotes: 'live e2e check',
      reviewedBy: curator.userId,
    })

    const { data: vector } = await curator.client.from('kb_vectors').select('*').eq('chunk_id', approvedChunkId).single()
    expect(vector).not.toBeNull()
    expect(vector!.embedding_model).toBeTruthy()
    expect(vector!.embedding_dim).toBeGreaterThan(0)

    const { data: doc } = await curator.client.from('documents').select('approved_chunks').eq('id', documentId).single()
    expect(doc!.approved_chunks).toBeGreaterThanOrEqual(1)
  }, 30000)

  it('match_documents RPC has a working signature against the real pgvector column', async () => {
    const admin = createAdminClient()
    const zeroVector = new Array(1536).fill(0)
    const { data, error } = await admin.rpc('match_documents', {
      query_embedding: zeroVector,
      match_threshold: 0,
      match_count: 3,
    })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('RLS blocks a non-admin session from directly setting wiki_versions.approved_by (no client UPDATE policy)', async () => {
    const admin = createAdminClient()
    const { data: anyVersion } = await admin.from('wiki_versions').select('id, approved_by').limit(1).single()

    const { data: updated, error } = await curator.client
      .from('wiki_versions')
      .update({ approved_by: curator.userId })
      .eq('id', anyVersion!.id)
      .select()

    // RLS silently filters rather than erroring: the update matches zero rows.
    expect(error).toBeNull()
    expect(updated).toHaveLength(0)
  })
})
