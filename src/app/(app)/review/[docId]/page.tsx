import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChunkReviewer } from '@/components/curator/ChunkReviewer'

// Chunk enrichment (enrichMoreChunks -> enrichDocumentChunks) calls one AI
// request per chunk, sequentially -- Vercel's default serverless function
// timeout can be too short for more than a handful of chunks. Raise the
// ceiling here rather than building a job queue (out of scope for this
// milestone/scale); if a document has enough chunks to exceed even this,
// re-run enrichment in smaller batches for now.
export const maxDuration = 60

export default async function ReviewPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
  const supabase = await createClient()

  const { data: document } = await supabase.from('documents').select('*').eq('id', docId).single()
  if (!document) notFound()

  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('document_id', docId)
    .order('chunk_index', { ascending: true })

  return <ChunkReviewer document={document} chunks={chunks ?? []} />
}
