import 'server-only'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { resolveNavigationTarget } from './navigation-resolver'
import { resolveDocumentArtifact } from './document-resolver'
import type { AssistantResponseEnvelope, PersistedAssistantEnvelope, VerifiedAssistantEnvelope } from './response-envelope'

// This turn's real retrieval provenance, keyed by citation sourceType --
// citations are checked against this, never against what the model merely
// asserts. wikiArticleSlugs covers both search_wiki and
// search_project_knowledge's wiki-layer hits; knowledgeSourceIds covers
// search_project_knowledge's source-layer hits (Stage 2).
export interface RetrievedProvenance {
  wikiArticleSlugs: ReadonlySet<string>
  knowledgeSourceIds: ReadonlySet<string>
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

  const verifiedCitations = (parsed.citations ?? []).filter((c) =>
    c.sourceType === 'knowledge_source' ? retrieved.knowledgeSourceIds.has(c.sourceId) : retrieved.wikiArticleSlugs.has(c.sourceId)
  )
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
        return resolved ? { label: citation.label, sourceType: citation.sourceType, sourceId: citation.sourceId, route: resolved.route } : null
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
