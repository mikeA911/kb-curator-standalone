import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EvidenceSource, RetrievedEvidenceItem } from '@/types/database'
import type { AIProvider } from '@/lib/ai/provider'
import { getProjectKnowledgeScopeIds } from '@/lib/chat/project-knowledge-tool'

export interface RetrievalConfig {
  evidenceSource: EvidenceSource
  topK: number
  threshold?: number
  // Stage 3: when set, retrieved evidence is tagged layer:'project' |
  // 'platform' using the exact same project-knowledge-base/article
  // membership check as chat's search_project_knowledge tool
  // (getProjectKnowledgeScopeIds) -- lets a case's expected evidence be
  // scored on whether it actually came from the project's own attached
  // knowledge, not just whether it was retrieved at all. Absent = today's
  // exact unscoped behavior, no extra queries.
  projectId?: string
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
  embeddingProvider: AIProvider,
  embeddingModel: string,
  question: string,
  config: RetrievalConfig
): Promise<RetrievalResult> {
  const embedding = await embeddingProvider.embed({ text: question, model: embeddingModel })
  const threshold = config.threshold ?? 0

  const scopeIds = config.projectId ? await getProjectKnowledgeScopeIds(supabase, config.projectId) : null

  const [chunkItems, wikiItems] = await Promise.all([
    config.evidenceSource === 'chunks' || config.evidenceSource === 'both'
      ? fetchChunkEvidence(supabase, embedding.embedding, config.topK, threshold, scopeIds?.kbIds ?? null)
      : Promise.resolve([]),
    config.evidenceSource === 'wiki' || config.evidenceSource === 'both'
      ? fetchWikiEvidence(supabase, embedding.embedding, config.topK, threshold, scopeIds?.articleIds ?? null)
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
  threshold: number,
  projectKbIds: Set<string> | null
): Promise<RetrievedEvidenceItem[]> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: topK,
  })
  if (error) throw error

  type Row = Database['public']['Functions']['match_documents']['Returns'][number]
  const rows: Row[] = data ?? []

  const layerByVectorId = projectKbIds ? await resolveChunkLayers(supabase, rows, projectKbIds) : null

  return rows.map((row) => ({
    type: 'chunk' as const,
    id: row.chunk_id,
    rank: 0, // reassigned after merge
    similarity: row.similarity,
    title: (row.metadata as { source_document?: string })?.source_document ?? 'Document chunk',
    content: row.content,
    layer: layerByVectorId?.get(row.id),
  }))
}

// Same kb_vectors -> documents -> knowledge_sources enrichment
// project-knowledge-tool.ts uses to tag a chat hit's layer, reused here so
// eval scores against the identical membership logic the Assistant actually
// retrieves with. Only run when the config carries a projectId (projectKbIds
// non-null) -- a project-agnostic run pays none of these extra queries.
async function resolveChunkLayers(
  supabase: SupabaseClient<Database>,
  rows: { id: string }[],
  projectKbIds: Set<string>
): Promise<Map<string, 'project' | 'platform'>> {
  const vectorIds = rows.map((r) => r.id)
  const { data: vectorRows } = vectorIds.length
    ? await supabase.from('kb_vectors').select('id, document_id').in('id', vectorIds)
    : { data: [] as { id: string; document_id: string }[] }
  const documentIdByVectorId = new Map((vectorRows ?? []).map((v) => [v.id, v.document_id]))

  const documentIds = [...new Set((vectorRows ?? []).map((v) => v.document_id))]
  const { data: documentRows } = documentIds.length
    ? await supabase.from('documents').select('id, knowledge_source_id').in('id', documentIds)
    : { data: [] as { id: string; knowledge_source_id: string }[] }
  const sourceIdByDocumentId = new Map((documentRows ?? []).map((d) => [d.id, d.knowledge_source_id]))

  const sourceIds = [...new Set((documentRows ?? []).map((d) => d.knowledge_source_id))]
  const { data: sourceRows } = sourceIds.length
    ? await supabase.from('knowledge_sources').select('id, knowledge_base_id').in('id', sourceIds)
    : { data: [] as { id: string; knowledge_base_id: string }[] }
  const kbIdBySourceId = new Map((sourceRows ?? []).map((s) => [s.id, s.knowledge_base_id]))

  return new Map(
    rows.map((r) => {
      const documentId = documentIdByVectorId.get(r.id)
      const sourceId = documentId ? sourceIdByDocumentId.get(documentId) : undefined
      const kbId = sourceId ? kbIdBySourceId.get(sourceId) : undefined
      return [r.id, kbId && projectKbIds.has(kbId) ? ('project' as const) : ('platform' as const)]
    })
  )
}

async function fetchWikiEvidence(
  supabase: SupabaseClient<Database>,
  queryEmbedding: number[],
  topK: number,
  threshold: number,
  projectArticleIds: Set<string> | null
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
    layer: projectArticleIds ? (projectArticleIds.has(row.wiki_article_id) ? ('project' as const) : ('platform' as const)) : undefined,
  }))
}
