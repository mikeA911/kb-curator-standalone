import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChunkReviewer } from '@/components/curator/ChunkReviewer'

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
