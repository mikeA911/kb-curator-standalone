import { createClient } from '../supabase'
import { processDocument, enrichChunk, embedChunk } from './flowise'
import { processDocumentWithGemini } from './gemini-processor'
import type {
  Document,
  DocumentChunk,
  DocumentStats,
  ChunkForReview,
  DocType,
  FlowiseChunk,
} from '../../types'
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../../types'

interface AIProviderSetting {
  provider: 'gemini' | 'openai'
}

interface DocumentProcessorSetting {
  processor: 'flowise' | 'direct_gemini'
}

interface KBVectorData {
  chunk_id: string
  document_id: string
  content: string
  doc_type: string | null
  topic: string | null
  subtopic: string | null
  use_cases: string[]
  key_concepts: string[]
  relevance_score: number | null
  curator_notes: string | null
  source_document: string | null
  source_url: string | null
  domain: string | null
  curator_name: string | null
  tags: string[]
  chunk_index: number | null
  word_count: number | null
  approved_by: string
  last_updated: string
}

/**
 * Upload document to Supabase Storage and create DB record
 */
export async function uploadDocument(
  file: File,
  docType: DocType,
  sourceUrl?: string
): Promise<{ storageUrl: string; documentId: string }> {
  const supabase = createClient()

  // Check for duplicates if sourceUrl is provided
  if (sourceUrl) {
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('doc_type', docType)
      .eq('source_url', sourceUrl)
      .single()

    if (existingDoc) {
      throw new Error('This document has already been uploaded for this knowledge base.')
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 50MB limit')
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    throw new Error('File type not supported. Please upload PDF, DOCX, or TXT files.')
  }

  // Sanitize filename
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filename = `${timestamp}-${sanitizedName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(`uploads/${filename}`, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('documents').getPublicUrl(`uploads/${filename}`)

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  // Create document record
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      filename,
      original_filename: file.name,
      doc_type: docType,
      storage_path: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: session.user.id,
      processing_status: 'pending',
      source_url: sourceUrl || null,
    })
    .select()
    .single()

  if (docError) {
    console.error('Database error:', docError)
    throw new Error(`Failed to create document record: ${docError.message}`)
  }

  return {
    storageUrl: publicUrl,
    documentId: docData.id,
  }
}

/**
 * Process document through Flowise and store chunks in DB
 */
export async function processAndStoreDocument(
  documentId: string,
  storageUrl: string,
  docType: DocType,
  filters: string[]
): Promise<number> {
  const supabase = createClient()

  // Update status to processing
  await supabase
    .from('documents')
    .update({
      processing_status: 'processing',
      metadata: { filters_applied: filters, processing_started: new Date().toISOString() },
    })
    .eq('id', documentId)

  try {
    // Get active document processor
    const processor = await getActiveDocumentProcessor()

    // Process document using selected provider
    let chunks: FlowiseChunk[]
    if (processor === 'direct_gemini') {
      chunks = await processDocumentWithGemini(storageUrl, docType, filters)
    } else {
      // Default to Flowise for backward compatibility
      chunks = await processDocument(storageUrl, docType, filters)
    }

    if (!chunks || chunks.length === 0) {
      throw new Error('No chunks returned from document processing')
    }

    // Get document info for metadata
    const { data: document } = await supabase
      .from('documents')
      .select('filename, original_filename, doc_type, storage_path, upload_date, uploaded_by')
      .eq('id', documentId)
      .single()

    // Get uploader profile for curator info
    let uploaderName = null
    if (document?.uploaded_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', document.uploaded_by)
        .single()
      uploaderName = profile?.full_name || null
    }

    // Insert chunks into database
    const chunkInserts = chunks.map((chunk, idx) => {
      const wordCount = chunk.text.trim().split(/\s+/).length
      const now = new Date().toISOString()

      return {
        document_id: documentId,
        chunk_index: idx,
        chunk_text: chunk.text,
        chunk_size: chunk.text.length,
        is_filtered: chunk.filtered,
        filtered_reason: chunk.filter_reason || null,
        review_status: chunk.filtered ? 'filtered' : 'pending',
        ai_metadata: {
          // Comprehensive metadata
          chunk_id: `${documentId}_${idx}`,
          source_document: document?.original_filename || document?.filename,
          source_url: document?.storage_path,
          document_type: document?.doc_type,
          domain: document?.doc_type, // Use doc_type as domain initially
          date_added: now,
          curator: uploaderName,
          tags: [], // Will be populated during enrichment
          chunk_index: idx,
          word_count: wordCount,
          last_updated: now,
        }
      }
    })

    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkInserts)

    if (chunksError) {
      throw new Error(`Failed to insert chunks: ${chunksError.message}`)
    }

    // Count non-filtered chunks
    const activeChunks = chunks.filter((c) => !c.filtered).length

    // Update document status and count
    await supabase
      .from('documents')
      .update({
        processing_status: 'review',
        total_chunks: activeChunks,
        metadata: {
          filters_applied: filters,
          processed_at: new Date().toISOString(),
          total_chunks_before_filter: chunks.length,
          filtered_chunks: chunks.filter((c) => c.filtered).length,
        },
      })
      .eq('id', documentId)

    return activeChunks
  } catch (error) {
    // Update status to indicate error
    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', documentId)

    throw error
  }
}

/**
 * Enrich a single chunk with AI metadata
 */
export async function enrichChunkMetadata(
  chunkId: string,
  chunkText: string,
  docType: string
): Promise<void> {
  const supabase = createClient()

  try {
    // Update status to enriching
    await supabase
      .from('document_chunks')
      .update({ review_status: 'enriching' })
      .eq('id', chunkId)

    // Call Flowise Flow 2 to get AI metadata
    const aiMetadata = await enrichChunk(chunkText, docType)

    // Get existing metadata
    const { data: existingChunk } = await supabase
      .from('document_chunks')
      .select('ai_metadata')
      .eq('id', chunkId)
      .single()

    // Merge AI metadata with existing comprehensive metadata
    const existingMetadata = existingChunk?.ai_metadata || {}
    const updatedMetadata = {
      ...existingMetadata,
      ...aiMetadata,
      last_updated: new Date().toISOString(),
    }

    // Update chunk with merged metadata
    await supabase
      .from('document_chunks')
      .update({
        ai_metadata: updatedMetadata,
        confidence_score: aiMetadata.confidence || aiMetadata.relevance_score || 0.5,
        review_status: 'pending', // Back to pending after enrichment
      })
      .eq('id', chunkId)
  } catch (error) {
    console.error(`Failed to enrich chunk ${chunkId}:`, error)
    // Reset status to pending on error
    await supabase
      .from('document_chunks')
      .update({ review_status: 'pending' })
      .eq('id', chunkId)
  }
}

/**
 * Batch enrich chunks for a document (rate-limited)
 */
export async function enrichDocumentChunks(
  documentId: string,
  docType: string,
  limit: number = 10
): Promise<number> {
  const supabase = createClient()

  // Get pending chunks without metadata
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, chunk_text')
    .eq('document_id', documentId)
    .eq('review_status', 'pending')
    .is('ai_metadata', null)
    .limit(limit)

  if (error || !chunks) {
    console.error('Failed to fetch chunks for enrichment:', error)
    return 0
  }

  // Enrich each chunk with rate limiting
  let enrichedCount = 0
  for (const chunk of chunks) {
    await enrichChunkMetadata(chunk.id, chunk.chunk_text, docType)
    enrichedCount++
    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return enrichedCount
}

/**
 * Get chunks pending review for a document
 */
export async function getChunksForReview(documentId: string): Promise<ChunkForReview[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_chunks')
    .select(
      `
      *,
      document:documents(filename, doc_type)
    `
    )
    .eq('document_id', documentId)
    .eq('review_status', 'pending')
    .order('confidence_score', { ascending: true }) // Low confidence first

  if (error) {
    throw new Error(`Failed to fetch chunks: ${error.message}`)
  }

  return (data || []) as ChunkForReview[]
}

/**
 * Get a single chunk by ID
 */
export async function getChunk(chunkId: string): Promise<DocumentChunk | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('id', chunkId)
    .single()

  if (error) {
    console.error('Error fetching chunk:', error)
    return null
  }

  return data as DocumentChunk
}

/**
 * Get active AI provider from settings
 */
async function getActiveProvider(): Promise<'gemini' | 'openai'> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'ai_provider')
    .single();

  if (error || !data) {
    return 'gemini'; // Default
  }

  return (data.value as AIProviderSetting).provider || 'gemini';
}

/**
 * Get active document processor from settings
 */
async function getActiveDocumentProcessor(): Promise<'flowise' | 'direct_gemini'> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'document_processor')
    .single();

  if (error || !data) {
    return 'flowise'; // Default to flowise for backward compatibility
  }

  return (data.value as DocumentProcessorSetting).processor || 'flowise';
}

/**
 * Approve a chunk and trigger embedding
 */
export async function approveChunk(
  chunkId: string,
  curatorNotes: string,
  userId: string
): Promise<void> {
  const supabase = createClient()
  const provider = await getActiveProvider()

  // Get chunk data first
  const { data: chunk, error: fetchError } = await supabase
    .from('document_chunks')
    .select('*, document:documents(doc_type, filename)')
    .eq('id', chunkId)
    .single()

  if (fetchError || !chunk) {
    throw new Error('Chunk not found')
  }

  // Update chunk status
  const { error: updateError } = await supabase
    .from('document_chunks')
    .update({
      review_status: 'approved',
      curator_notes: curatorNotes || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', chunkId)

  if (updateError) {
    throw new Error(`Failed to approve chunk: ${updateError.message}`)
  }

  // Get user profile for curator name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  // Get comprehensive metadata from document_chunks
  const comprehensiveMetadata = chunk.ai_metadata || {}

  // Insert into kb_vectors with comprehensive metadata
  const vectorData: KBVectorData = {
    chunk_id: chunkId,
    document_id: chunk.document_id,
    content: chunk.chunk_text,
    doc_type: comprehensiveMetadata.document_type || chunk.document?.doc_type,
    topic: comprehensiveMetadata.topic || null,
    subtopic: comprehensiveMetadata.subtopic || null,
    use_cases: comprehensiveMetadata.use_cases || [],
    key_concepts: comprehensiveMetadata.key_concepts || [],
    relevance_score: comprehensiveMetadata.relevance_score || null,
    curator_notes: curatorNotes || null,
    source_document: comprehensiveMetadata.source_document,
    source_url: comprehensiveMetadata.source_url,
    domain: comprehensiveMetadata.domain,
    curator_name: profile?.full_name || comprehensiveMetadata.curator,
    tags: comprehensiveMetadata.tags || [],
    chunk_index: comprehensiveMetadata.chunk_index,
    word_count: comprehensiveMetadata.word_count,
    approved_by: userId,
    last_updated: new Date().toISOString(),
  }

  const { error: vectorError } = await supabase.from('kb_vectors').insert(vectorData)

  if (vectorError) {
    console.error('Failed to insert kb_vector:', vectorError)
    // Don't throw - the chunk is approved, we'll handle vector insertion separately
  }

  // Increment approved count on document
  await supabase.rpc('increment_approved_chunks', { doc_id: chunk.document_id })

  // Trigger embedding generation (async)
  // Note: If Flowise Flow 3 is configured, call it here
  // Otherwise, embeddings can be generated in a background job
  try {
    await embedChunk(chunkId, provider, curatorNotes)
  } catch (error) {
    console.warn('Embedding generation might have failed:', error)
    // Don't fail the approval if embedding fails
  }
}

/**
 * Reject a chunk
 */
export async function rejectChunk(chunkId: string, userId: string): Promise<void> {
  const supabase = createClient()

  // Get chunk to get document_id
  const { data: chunk, error: fetchError } = await supabase
    .from('document_chunks')
    .select('document_id')
    .eq('id', chunkId)
    .single()

  if (fetchError || !chunk) {
    throw new Error('Chunk not found')
  }

  const { error } = await supabase
    .from('document_chunks')
    .update({
      review_status: 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', chunkId)

  if (error) {
    throw new Error(`Failed to reject chunk: ${error.message}`)
  }

  // Increment rejected count on document
  await supabase.rpc('increment_rejected_chunks', { doc_id: chunk.document_id })
}

/**
 * Get document statistics
 */
export async function getDocumentStats(documentId: string): Promise<DocumentStats> {
  const supabase = createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('total_chunks, approved_chunks, rejected_chunks')
    .eq('id', documentId)
    .single()

  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('review_status')
    .eq('document_id', documentId)

  const stats: DocumentStats = {
    total: doc?.total_chunks || 0,
    approved: doc?.approved_chunks || 0,
    rejected: doc?.rejected_chunks || 0,
    pending: chunks?.filter((c) => c.review_status === 'pending').length || 0,
    filtered: chunks?.filter((c) => c.review_status === 'filtered').length || 0,
  }

  return stats
}

/**
 * Save a chunk as draft
 */
export async function saveChunkDraft(
  chunkId: string,
  curatorNotes: string,
  aiMetadata: any,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('document_chunks')
    .update({
      review_status: 'draft',
      curator_notes: curatorNotes || null,
      ai_metadata: aiMetadata,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', chunkId)

  if (error) {
    throw new Error(`Failed to save draft: ${error.message}`)
  }
}

/**
 * Submit a document for admin review
 */
export async function submitDocument(documentId: string): Promise<void> {
  const supabase = createClient()

  // Check if all chunks are reviewed (approved, rejected, or filtered)
  const { data: chunks, error: fetchError } = await supabase
    .from('document_chunks')
    .select('review_status')
    .eq('document_id', documentId)

  if (fetchError) throw fetchError

  const pendingChunks = chunks?.filter(c => c.review_status === 'pending' || c.review_status === 'draft' || c.review_status === 'enriching')
  
  if (pendingChunks && pendingChunks.length > 0) {
    throw new Error(`Cannot submit: ${pendingChunks.length} chunks are still pending or in draft.`)
  }

  const { error } = await supabase
    .from('documents')
    .update({ processing_status: 'submitted' })
    .eq('id', documentId)

  if (error) {
    throw new Error(`Failed to submit document: ${error.message}`)
  }
}

/**
 * Get all documents (optionally filtered by status or user)
 */
export async function getDocuments(options?: {
  uploadedBy?: string
  status?: string
  kbIds?: string[]
}): Promise<Document[]> {
  const supabase = createClient()

  let query = supabase
    .from('documents')
    .select('*')
    .order('upload_date', { ascending: false })

  if (options?.uploadedBy) {
    query = query.eq('uploaded_by', options.uploadedBy)
  }

  if (options?.status) {
    query = query.eq('processing_status', options.status)
  }

  if (options?.kbIds && options.kbIds.length > 0) {
    query = query.in('doc_type', options.kbIds)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`)
  }

  return (data || []) as Document[]
}

/**
 * Get a single document by ID
 */
export async function getDocument(documentId: string): Promise<Document | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error) {
    console.error('Failed to fetch document:', error)
    return null
  }

  return data as Document
}

/**
 * Delete a document (admin only)
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createClient()

  // Ensure admin
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') throw new Error('Admin privileges required')

  // Get document to get storage path
  const { data: doc } = await supabase
    .from('documents')
    .select('filename')
    .eq('id', documentId)
    .single()

  if (doc) {
    // Delete from storage
    await supabase.storage.from('documents').remove([`uploads/${doc.filename}`])
  }

  // Delete document (cascades to chunks and vectors)
  const { error } = await supabase.from('documents').delete().eq('id', documentId)

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`)
  }
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats(): Promise<{
  totalDocuments: number
  completedDocuments: number
  totalChunks: number
  approvedChunks: number
  pendingReview: number
  inQueue: number
  draftDocuments: number
  submittedDocuments: number
}> {
  const supabase = createClient()

  const [
    { data: documents },
    { count: queueCount }
  ] = await Promise.all([
    supabase.from('documents').select('*'),
    supabase.from('curation_queue').select('*', { count: 'exact', head: true }).neq('status', 'completed')
  ])

  const docs = documents || []

  return {
    totalDocuments: docs.length,
    completedDocuments: docs.filter((d) => d.processing_status === 'completed').length,
    totalChunks: docs.reduce((sum, d) => sum + (d.total_chunks || 0), 0),
    approvedChunks: docs.reduce((sum, d) => sum + (d.approved_chunks || 0), 0),
    pendingReview: docs.filter((d) => d.processing_status === 'review').length,
    inQueue: queueCount || 0,
    draftDocuments: docs.filter((d) => d.processing_status === 'pending' || d.processing_status === 'processing').length,
    submittedDocuments: docs.filter((d) => d.processing_status === 'submitted').length,
  }
}
