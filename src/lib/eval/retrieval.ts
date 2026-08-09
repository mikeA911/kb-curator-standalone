import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EvidenceSource, RetrievedEvidenceItem } from '@/types/database'
import type { AIProvider } from '@/lib/ai/provider'

export interface RetrievalConfig {
  evidenceSource: EvidenceSource
  topK: number
  threshold?: number
}

export interface RetrievalResult {
  evidence: RetrievedEvidenceItem[]
  queryEmbedding: number[]
  embeddingModel: string
}

// The one place evaluation touches vector search. chunk and wiki evidence
// come from two separate tables/RPCs (kb_vectors via match_documents,
// wiki_vectors via match_wiki_vectors) and are never merged into one -- each
// item keeps an explicit `type: 'chunk' | 'wiki'` so a run's evidence origin
// is never ambiguous, which is the whole point of comparing "Chunks Only"
// vs "Wiki Only" vs "Wiki + Chunks" as different retrieval configurations.
export async function retrieveEvidence(
  supabase: SupabaseClient<Database>,
  provider: AIProvider,
  question: string,
  config: RetrievalConfig
): Promise<RetrievalResult> {
  const embedding = await provider.embed({ text: question })
  const threshold = config.threshold ?? 0

  const [chunkItems, wikiItems] = await Promise.all([
    config.evidenceSource === 'chunks' || config.evidenceSource === 'both'
      ? fetchChunkEvidence(supabase, embedding.embedding, config.topK, threshold)
      : Promise.resolve([]),
    config.evidenceSource === 'wiki' || config.evidenceSource === 'both'
      ? fetchWikiEvidence(supabase, embedding.embedding, config.topK, threshold)
      : Promise.resolve([]),
  ])

  const merged = [...chunkItems, ...wikiItems]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, config.topK)
    .map((item, index) => ({ ...item, rank: index + 1 }))

  return { evidence: merged, queryEmbedding: embedding.embedding, embeddingModel: embedding.model }
}

async function fetchChunkEvidence(
  supabase: SupabaseClient<Database>,
  queryEmbedding: number[],
  topK: number,
  threshold: number
): Promise<RetrievedEvidenceItem[]> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: topK,
  })
  if (error) throw error

  type Row = Database['public']['Functions']['match_documents']['Returns'][number]
  return (data ?? []).map((row: Row) => ({
    type: 'chunk' as const,
    id: row.chunk_id,
    rank: 0, // reassigned after merge
    similarity: row.similarity,
    title: (row.metadata as { source_document?: string })?.source_document ?? 'Document chunk',
    content: row.content,
  }))
}

async function fetchWikiEvidence(
  supabase: SupabaseClient<Database>,
  queryEmbedding: number[],
  topK: number,
  threshold: number
): Promise<RetrievedEvidenceItem[]> {
  const { data, error } = await supabase.rpc('match_wiki_vectors', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: topK,
  })
  if (error) throw error

  type Row = Database['public']['Functions']['match_wiki_vectors']['Returns'][number]
  return (data ?? []).map((row: Row) => ({
    type: 'wiki' as const,
    id: row.wiki_article_id,
    rank: 0,
    similarity: row.similarity,
    title: row.article_title,
    content: row.content,
  }))
}
