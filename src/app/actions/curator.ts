'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { getActiveEmbeddingProvider, getActiveStructuredOutputProvider } from '@/lib/ai'
import {
  createUploadedDocument,
  processDocument,
  submitDocument,
  deleteDocumentById,
} from '@/lib/curator/documents'
import { enrichDocumentChunks, approveChunk, rejectChunk, saveChunkDraft } from '@/lib/curator/chunks'
import { requireActiveKnowledgeBase } from '@/lib/knowledge-bases'

export async function uploadAndProcessDocument(formData: FormData) {
  const { user, supabase } = await requireRole('curator')

  const file = formData.get('file') as File | null
  const docType = formData.get('docType') as string | null
  const sourceUrl = (formData.get('sourceUrl') as string | null) || undefined

  if (!file || file.size === 0) throw new Error('No file provided')
  if (!docType) throw new Error('No knowledge base selected')
  await requireActiveKnowledgeBase(supabase, docType)

  const doc = await createUploadedDocument(supabase, { file, docType, sourceUrl, uploadedBy: user.id })

  await processDocument(supabase, doc.id)

  const provider = await getActiveStructuredOutputProvider(supabase, { documentId: doc.id, requestedBy: user.id })
  await enrichDocumentChunks(supabase, provider, doc.id, docType, 10)

  revalidatePath('/dashboard')
  return { documentId: doc.id }
}

export async function enrichMoreChunks(documentId: string, docType: string) {
  const { user, supabase } = await requireRole('curator')
  const provider = await getActiveStructuredOutputProvider(supabase, { documentId, requestedBy: user.id })
  const result = await enrichDocumentChunks(supabase, provider, documentId, docType, 10)
  revalidatePath(`/review/${documentId}`)
  return result
}

export async function approveChunkAction(chunkId: string, documentId: string, curatorNotes: string | null) {
  const { user, supabase } = await requireRole('curator')
  const provider = await getActiveEmbeddingProvider(supabase, { documentId, chunkId, requestedBy: user.id })
  await approveChunk(supabase, provider, { chunkId, curatorNotes, reviewedBy: user.id })
  revalidatePath(`/review/${documentId}`)
}

export async function rejectChunkAction(chunkId: string, documentId: string, curatorNotes: string | null) {
  const { user, supabase } = await requireRole('curator')
  await rejectChunk(supabase, { chunkId, curatorNotes, reviewedBy: user.id })
  revalidatePath(`/review/${documentId}`)
}

export async function saveChunkDraftAction(chunkId: string, documentId: string, curatorNotes: string | null) {
  const { supabase } = await requireRole('curator')
  await saveChunkDraft(supabase, chunkId, curatorNotes)
  revalidatePath(`/review/${documentId}`)
}

export async function submitDocumentAction(documentId: string) {
  const { supabase } = await requireRole('curator')
  await submitDocument(supabase, documentId)
  revalidatePath(`/review/${documentId}`)
  revalidatePath('/dashboard')
}

export async function deleteDocumentAction(documentId: string) {
  const { user, profile, supabase } = await requireRole('consultant')
  await deleteDocumentById(supabase, documentId, { id: user.id, role: profile.role })
  revalidatePath('/dashboard')
}
