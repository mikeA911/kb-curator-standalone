import 'server-only'
import { z } from 'zod'
import type { ToolSpec } from '@/lib/ai'
import { getActiveEmbeddingProvider } from '@/lib/ai'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type { Database } from '@/types/database'

// Project-Aware Knowledge and Assistant Context, Stage 2. Not registered in
// src/lib/mcp/tools.ts's general registry: this tool only exists, and is
// only ever offered to the model, when runAssistantTurn has a project_id
// resolved server-side from the conversation row -- never from model input
// (the request's own "never trust a model-supplied project_id" principle).
// Same "defined here, intercepted in loop.ts before reaching callTool"
// pattern as PRESENT_RESPONSE_TOOL in response-envelope.ts, for the same
// reason: this tool's behavior depends on context callTool()'s generic
// dispatch doesn't carry.

export const SEARCH_PROJECT_KNOWLEDGE_TOOL_NAME = 'search_project_knowledge'

const InputSchema = z.object({ query: z.string(), limit: z.number().int().min(1).max(10).default(5) })

export const SEARCH_PROJECT_KNOWLEDGE_TOOL: ToolSpec = {
  name: SEARCH_PROJECT_KNOWLEDGE_TOOL_NAME,
  description:
    "Semantic search over THIS project's own approved knowledge -- its attached knowledge base source documents and any Wiki articles attached specifically to it. Results are tagged layer:'project' (this project's own evidence, prefer this) or layer:'platform' (general shared knowledge, used only to fill gaps). The project is fixed for this conversation -- there is no project parameter to set. Prefer this over search_wiki when it's available.",
  parameters: z.toJSONSchema(InputSchema),
}

export interface ProjectKnowledgeHit {
  layer: 'project' | 'platform'
  sourceType: 'wiki_article' | 'knowledge_source'
  sourceId: string
  title: string
  route: string
  similarity: number
  content: string
}

// Capped, matching search_wiki's own MAX_CONTENT_CHARS rationale -- bounds
// worst-case context size without truncating a normal-length chunk/article.
const MAX_CONTENT_CHARS = 4000

export async function runSearchProjectKnowledge(
  ctx: WorkbenchCallerContext,
  projectId: string,
  rawInput: unknown
): Promise<{ results: ProjectKnowledgeHit[] }> {
  const input = InputSchema.parse(rawInput)
  const embeddingProvider = await getActiveEmbeddingProvider(ctx.supabase, { requestedBy: ctx.user.id })
  const { embedding } = await embeddingProvider.embed({ text: input.query })

  const [{ data: kbLinks }, { data: articleLinks }] = await Promise.all([
    ctx.supabase.from('project_knowledge_bases').select('knowledge_base_id').eq('project_id', projectId),
    ctx.supabase.from('project_wiki_articles').select('wiki_article_id').eq('project_id', projectId),
  ])
  const projectKbIds = new Set((kbLinks ?? []).map((l) => l.knowledge_base_id))
  const projectArticleIds = new Set((articleLinks ?? []).map((l) => l.wiki_article_id))

  const [{ data: docHits, error: docError }, { data: wikiHits, error: wikiError }] = await Promise.all([
    ctx.supabase.rpc('match_documents', { query_embedding: embedding, match_threshold: 0, match_count: input.limit * 2 }),
    ctx.supabase.rpc('match_wiki_vectors', { query_embedding: embedding, match_threshold: 0, match_count: input.limit * 2 }),
  ])
  if (docError) throw docError
  if (wikiError) throw wikiError

  type DocRow = Database['public']['Functions']['match_documents']['Returns'][number]
  type WikiRow = Database['public']['Functions']['match_wiki_vectors']['Returns'][number]
  const docRows: DocRow[] = docHits ?? []
  const wikiRows: WikiRow[] = wikiHits ?? []

  // match_documents doesn't return knowledge_source_id -- enrich via
  // kb_vectors -> documents -> knowledge_sources, same "RPC stays generic,
  // enrich with a follow-up query" pattern search_wiki uses for category.
  const vectorIds = docRows.map((r) => r.id)
  const { data: vectorRows } = vectorIds.length
    ? await ctx.supabase.from('kb_vectors').select('id, document_id').in('id', vectorIds)
    : { data: [] as { id: string; document_id: string }[] }
  const documentIdByVectorId = new Map((vectorRows ?? []).map((v) => [v.id, v.document_id]))

  const documentIds = [...new Set((vectorRows ?? []).map((v) => v.document_id))]
  const { data: documentRows } = documentIds.length
    ? await ctx.supabase.from('documents').select('id, knowledge_source_id').in('id', documentIds)
    : { data: [] as { id: string; knowledge_source_id: string }[] }
  const sourceIdByDocumentId = new Map((documentRows ?? []).map((d) => [d.id, d.knowledge_source_id]))

  const sourceIds = [...new Set((documentRows ?? []).map((d) => d.knowledge_source_id))]
  const { data: sourceRows } = sourceIds.length
    ? await ctx.supabase.from('knowledge_sources').select('id, title, knowledge_base_id').in('id', sourceIds)
    : { data: [] as { id: string; title: string; knowledge_base_id: string }[] }
  const sourceById = new Map((sourceRows ?? []).map((s) => [s.id, s]))

  const docResults: ProjectKnowledgeHit[] = docRows
    .map((row): ProjectKnowledgeHit | null => {
      const documentId = documentIdByVectorId.get(row.id)
      const source = documentId ? sourceById.get(sourceIdByDocumentId.get(documentId) ?? '') : undefined
      if (!source) return null
      return {
        layer: projectKbIds.has(source.knowledge_base_id) ? 'project' : 'platform',
        sourceType: 'knowledge_source',
        sourceId: source.id,
        title: source.title,
        route: `/sources/${source.id}`,
        similarity: row.similarity,
        content: row.content.length > MAX_CONTENT_CHARS ? `${row.content.slice(0, MAX_CONTENT_CHARS)}…` : row.content,
      }
    })
    .filter((r): r is ProjectKnowledgeHit => r !== null)

  const wikiResults: ProjectKnowledgeHit[] = wikiRows.map((row) => ({
    layer: projectArticleIds.has(row.wiki_article_id) ? 'project' : 'platform',
    sourceType: 'wiki_article',
    sourceId: row.article_slug,
    title: row.article_title,
    route: `/wiki/${row.article_slug}`,
    similarity: row.similarity,
    content: row.content.length > MAX_CONTENT_CHARS ? `${row.content.slice(0, MAX_CONTENT_CHARS)}…` : row.content,
  }))

  // Project layer first, platform layer after -- explicit, code-enforced
  // precedence rather than relying on embedding-similarity ranking, per
  // "Project evidence wins when it conflicts with generic platform guidance."
  const merged = [...docResults, ...wikiResults].sort((a, b) => (a.layer === b.layer ? 0 : a.layer === 'project' ? -1 : 1))

  return { results: merged.slice(0, input.limit) }
}
