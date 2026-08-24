import 'server-only'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { resolveNavigationTarget } from './navigation-resolver'
import { resolveDocumentArtifact } from './document-resolver'
import type { AssistantResponseEnvelope, PersistedAssistantEnvelope, VerifiedAssistantEnvelope } from './response-envelope'

// Stage 3: which knowledge layer a retrieved hit came from, and (for a
// knowledge_source hit) which specific document version was actually
// retrieved -- captured once at retrieval time in loop.ts, since neither
// fact can be reconstructed later from just a sourceId/slug.
export interface RetrievedHitInfo {
  layer: 'project' | 'platform'
  documentVersionId: string | null
}

// This turn's real retrieval provenance, keyed by citation sourceType --
// citations are checked against this, never against what the model merely
// asserts. wikiArticleSlugs covers both search_wiki and
// search_project_knowledge's wiki-layer hits; knowledgeSourceIds covers
// search_project_knowledge's source-layer hits (Stage 2).
export interface RetrievedProvenance {
  wikiArticleSlugs: ReadonlyMap<string, RetrievedHitInfo>
  knowledgeSourceIds: ReadonlyMap<string, RetrievedHitInfo>
}

// Turns a model-submitted, schema-validated envelope into what actually
// gets persisted: citations permanently filtered to this turn's real
// retrieval provenance (a point-in-time fact -- see the caller in loop.ts),
// and links/documents reduced to only the references that resolve at least
// once right now (a completely bogus id is dropped for good; one that
// resolves today but becomes inaccessible later is kept as a raw reference
// and re-checked on every future read by resolveEnvelopeForDisplay below).
export async function buildPersistedEnvelope(
  ctx: WorkbenchCallerContext,
  parsed: AssistantResponseEnvelope,
  retrieved: RetrievedProvenance
): Promise<PersistedAssistantEnvelope> {
  const [links, documents] = await Promise.all([
    Promise.all(
      (parsed.links ?? []).map(async (link) => ((await resolveNavigationTarget(ctx, link.target)) ? link : null))
    ),
    Promise.all(
      (parsed.documents ?? []).map(async (doc) => ((await resolveDocumentArtifact(ctx, doc.artifactId)) ? doc : null))
    ),
  ])

  const persisted: PersistedAssistantEnvelope = { message: parsed.message }
  if (parsed.quickSummary) persisted.quickSummary = parsed.quickSummary
  if (parsed.requirements?.length) persisted.requirements = parsed.requirements
  if (parsed.nextSteps?.length) persisted.nextSteps = parsed.nextSteps
  if (parsed.suggestedPrompts?.length) persisted.suggestedPrompts = parsed.suggestedPrompts

  const resolvedLinks = links.filter((l): l is NonNullable<typeof l> => l !== null)
  if (resolvedLinks.length) persisted.links = resolvedLinks

  const resolvedDocuments = documents.filter((d): d is NonNullable<typeof d> => d !== null)
  if (resolvedDocuments.length) persisted.documents = resolvedDocuments

  // Stage 3: layer/documentVersionId are attached here from this turn's own
  // retrieval, never from the model -- same "don't trust the model with a
  // fact it might hallucinate" principle as the sourceId verification
  // itself.
  const verifiedCitations = (parsed.citations ?? [])
    .map((c) => {
      const info = c.sourceType === 'knowledge_source' ? retrieved.knowledgeSourceIds.get(c.sourceId) : retrieved.wikiArticleSlugs.get(c.sourceId)
      if (!info) return null
      return { ...c, layer: info.layer, documentVersionId: info.documentVersionId ?? undefined }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
  if (verifiedCitations.length) persisted.citations = verifiedCitations

  return persisted
}

// Re-derives display-ready routes/labels from a persisted envelope's raw
// references. Called both right after a turn completes (for that turn's
// live render) and again every time conversation history is loaded --
// never trusts a previously resolved route, since access to the underlying
// records can change between those two moments.
export async function resolveEnvelopeForDisplay(
  ctx: WorkbenchCallerContext,
  persisted: PersistedAssistantEnvelope
): Promise<VerifiedAssistantEnvelope> {
  const [resolvedLinks, resolvedDocuments, resolvedCitations] = await Promise.all([
    Promise.all(
      (persisted.links ?? []).map(async (link) => {
        const resolved = await resolveNavigationTarget(ctx, link.target)
        return resolved ? { label: link.label, route: resolved.route } : null
      })
    ),
    Promise.all(
      (persisted.documents ?? []).map(async (doc) => {
        const resolved = await resolveDocumentArtifact(ctx, doc.artifactId)
        return resolved
          ? { label: doc.label, documentType: doc.documentType, artifactId: doc.artifactId, title: resolved.title, route: resolved.route }
          : null
      })
    ),
    Promise.all(
      (persisted.citations ?? []).map(async (citation) => {
        const resolved = await resolveNavigationTarget(ctx, { kind: citation.sourceType, id: citation.sourceId })
        if (!resolved) return null
        // Stage 3 staleness: only meaningful for a knowledge_source citation
        // that recorded which version was actually retrieved -- compare
        // against the source's *current* version, re-checked on every
        // display (never cached), same as the route/access-check above.
        let stale: boolean | undefined
        if (citation.sourceType === 'knowledge_source' && citation.documentVersionId) {
          const { data: source } = await ctx.supabase
            .from('knowledge_sources')
            .select('current_version_id')
            .eq('id', citation.sourceId)
            .maybeSingle()
          if (source?.current_version_id && source.current_version_id !== citation.documentVersionId) stale = true
        }
        return {
          label: citation.label,
          sourceType: citation.sourceType,
          sourceId: citation.sourceId,
          route: resolved.route,
          layer: citation.layer,
          ...(stale !== undefined ? { stale } : {}),
        }
      })
    ),
  ])

  const verified: VerifiedAssistantEnvelope = { message: persisted.message }
  if (persisted.quickSummary) verified.quickSummary = persisted.quickSummary
  if (persisted.requirements?.length) verified.requirements = persisted.requirements
  if (persisted.nextSteps?.length) verified.nextSteps = persisted.nextSteps
  if (persisted.suggestedPrompts?.length) verified.suggestedPrompts = persisted.suggestedPrompts

  const links = resolvedLinks.filter((l): l is NonNullable<typeof l> => l !== null)
  if (links.length) verified.links = links

  const documents = resolvedDocuments.filter((d): d is NonNullable<typeof d> => d !== null)
  if (documents.length) verified.documents = documents

  const citations = resolvedCitations.filter((c): c is NonNullable<typeof c> => c !== null)
  if (citations.length) verified.citations = citations

  return verified
}
