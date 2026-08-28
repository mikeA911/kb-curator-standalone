'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveEmbeddingProvider, getActiveStructuredOutputProvider, AIProviderError } from '@/lib/ai'
import { getQuickHelpBySlug } from '@/lib/wiki/help'
import {
  createManualDraftArticle,
  createAIAssistedArticle,
  createNextDraftVersion,
  submitArticleForReview,
  archiveArticle,
  WikiValidationError,
} from '@/lib/wiki/articles'
import { approveWikiVersion, rejectWikiVersionToDraft, embedApprovedVersion } from '@/lib/wiki/review'
import { linkSource, unlinkSource } from '@/lib/wiki/sources'
import { linkRelatedArticle, unlinkRelatedArticle } from '@/lib/wiki/relations'
import { linkProjectArticle, unlinkProjectArticle } from '@/lib/wiki/project-links'
import { synthesizeWikiDraft, type WikiDraftProposal, type SourceChunkInput } from '@/lib/wiki/synthesis'
import type { AIProvider } from '@/lib/ai/provider'
import type { WikiCategoryId, WikiSourceType, WikiVisibilityScope } from '@/types/database'

// Any authenticated user can resolve Quick Help -- it's app-wide contextual
// help, not a curator-only feature. Only ever returns approved content (see
// getQuickHelpBySlug).
export async function getQuickHelpAction(slug: string) {
  const { supabase } = await requireUser()
  return getQuickHelpBySlug(supabase, slug)
}

// Caught live: React error #441 -- a provider failure (or truncated/
// malformed structured-output response, more likely with a large evidence
// set) throws a raw AIProviderError whose message embeds the full raw model
// output and whose .cause is the underlying SDK error object, non-plain and
// not guaranteed serializable across the Server Action boundary. Neither
// call site had a try/catch, so that raw error crossed straight to the
// client instead of the WikiValidationError-style message this file already
// uses elsewhere for a recoverable failure (see chunkIds.length === 0
// above). synthesis.ts's own MAX_CHUNK_CHARS cap is the actual root-cause
// fix (bounds the prompt so this failure mode is rare); this is the
// backstop for whatever that doesn't prevent.
async function synthesizeWikiDraftSafely(
  provider: AIProvider,
  input: { topic: string; category: string; chunks: SourceChunkInput[] }
): Promise<WikiDraftProposal> {
  try {
    return await synthesizeWikiDraft(provider, input)
  } catch (err) {
    const detail = err instanceof AIProviderError ? `${err.provider}: ${err.errorCode}` : err instanceof Error ? err.message.slice(0, 200) : String(err)
    throw new WikiValidationError(`AI-assisted draft generation failed (${detail}) -- try again, or with fewer/shorter sources.`)
  }
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function createManualArticleAction(input: {
  title: string
  slug?: string
  category: WikiCategoryId
  shortDescription: string
  quickHelp: string
  content: string
  implementationNotes: string
  limitations: string
  knowledgeBaseId: string | null
  applicableRoles?: string[]
  relatedRoutes?: string[]
  applicableVersion?: string | null
}) {
  const { user, supabase } = await requireRole('curator')

  const { article } = await createManualDraftArticle(supabase, {
    slug: input.slug || slugify(input.title),
    title: input.title,
    category: input.category,
    shortDescription: input.shortDescription || null,
    quickHelp: input.quickHelp,
    content: input.content,
    implementationNotes: input.implementationNotes || null,
    limitations: input.limitations || null,
    applicableRoles: input.applicableRoles?.length ? input.applicableRoles : null,
    relatedRoutes: input.relatedRoutes?.length ? input.relatedRoutes : null,
    applicableVersion: input.applicableVersion || null,
    knowledgeBaseId: input.knowledgeBaseId,
    createdBy: user.id,
  })

  revalidatePath('/wiki')
  return { articleId: article.id, slug: article.slug }
}

export async function createAIAssistedDraftAction(
  input:
    | { topic: string; category: WikiCategoryId; chunkIds: string[]; workstreamArtifactId?: undefined }
    | { topic: string; category: WikiCategoryId; workstreamArtifactId: string; chunkIds?: undefined }
) {
  const { user, supabase } = await requireRole('curator')

  if (input.workstreamArtifactId) {
    return createAIAssistedDraftFromArtifact(supabase, user.id, {
      topic: input.topic,
      category: input.category,
      workstreamArtifactId: input.workstreamArtifactId,
    })
  }

  const chunkIds = input.chunkIds ?? []
  if (chunkIds.length === 0) throw new WikiValidationError('Select at least one source chunk')

  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, document_id, chunk_text, source_page, review_status')
    .in('id', chunkIds)
  if (error) throw error

  const unapproved = (chunks ?? []).filter((c) => c.review_status !== 'approved')
  if (unapproved.length > 0) {
    throw new WikiValidationError('AI-assisted drafts can only be generated from approved chunks')
  }

  const documentIds = [...new Set((chunks ?? []).map((c) => c.document_id))]
  const { data: sourceDocuments, error: docsError } = await supabase
    .from('documents')
    .select('id, original_filename')
    .in('id', documentIds)
  if (docsError) throw docsError
  const documentNameById = new Map((sourceDocuments ?? []).map((d) => [d.id, d.original_filename]))

  const provider = await getActiveStructuredOutputProvider(supabase, { requestedBy: user.id })

  const draft = await synthesizeWikiDraftSafely(provider, {
    topic: input.topic,
    category: input.category,
    chunks: (chunks ?? []).map((c) => ({
      id: c.id,
      text: c.chunk_text,
      sourcePage: c.source_page,
      documentName: documentNameById.get(c.document_id) ?? null,
    })),
  })

  const { article, version } = await createAIAssistedArticle(supabase, {
    slug: slugify(draft.title),
    title: draft.title,
    category: input.category,
    shortDescription: draft.short_description,
    quickHelp: draft.quick_help,
    content: draft.content,
    implementationNotes: draft.implementation_notes ?? null,
    limitations: draft.limitations ?? null,
    aiProvider: provider.name,
    aiModel: draft.model,
    sourceChunkIds: chunkIds,
    createdBy: user.id,
  })

  for (const chunk of chunks ?? []) {
    await linkSource(supabase, {
      wikiVersionId: version.id,
      chunkId: chunk.id,
      sourceType: 'chunk',
      relationship: 'ai_synthesis_input',
    })
  }

  revalidatePath('/wiki')
  return { articleId: article.id, slug: article.slug }
}

// Second source mode for AI-assisted drafts: synthesize from a single
// workstream_artifacts row (e.g. a project's self-analysis output) instead
// of document_chunks -- the primary path for Handbook articles grounded in
// implementation evidence (M5F Phase A). Fetched with the caller's own
// RLS-scoped client, so workstream_artifacts_select_member naturally
// restricts this to artifacts the caller can actually see.
async function createAIAssistedDraftFromArtifact(
  supabase: Awaited<ReturnType<typeof requireRole>>['supabase'],
  userId: string,
  input: { topic: string; category: WikiCategoryId; workstreamArtifactId: string }
) {
  const { data: artifact, error } = await supabase
    .from('workstream_artifacts')
    .select('id, title, content')
    .eq('id', input.workstreamArtifactId)
    .single()
  if (error || !artifact) throw error ?? new WikiValidationError('Artifact not found')
  if (!artifact.content) throw new WikiValidationError('This artifact has no content to synthesize from (it is a link-only artifact)')

  const provider = await getActiveStructuredOutputProvider(supabase, { requestedBy: userId })

  const draft = await synthesizeWikiDraftSafely(provider, {
    topic: input.topic,
    category: input.category,
    chunks: [{ id: artifact.id, text: artifact.content, documentName: artifact.title }],
  })

  const { article, version } = await createAIAssistedArticle(supabase, {
    slug: slugify(draft.title),
    title: draft.title,
    category: input.category,
    shortDescription: draft.short_description,
    quickHelp: draft.quick_help,
    content: draft.content,
    implementationNotes: draft.implementation_notes ?? null,
    limitations: draft.limitations ?? null,
    aiProvider: provider.name,
    aiModel: draft.model,
    sourceChunkIds: null,
    createdBy: userId,
  })

  await linkSource(supabase, {
    wikiVersionId: version.id,
    workstreamArtifactId: artifact.id,
    sourceType: 'workstream_artifact',
    relationship: 'ai_synthesis_input',
  })

  revalidatePath('/wiki')
  return { articleId: article.id, slug: article.slug }
}

export async function editDraftAction(
  articleId: string,
  input: {
    quickHelp: string
    content: string
    implementationNotes: string
    limitations: string
    applicableRoles?: string[]
    relatedRoutes?: string[]
    applicableVersion?: string | null
  }
) {
  const { user, supabase } = await requireRole('curator')
  await createNextDraftVersion(
    supabase,
    articleId,
    {
      quickHelp: input.quickHelp,
      content: input.content,
      implementationNotes: input.implementationNotes || null,
      limitations: input.limitations || null,
      applicableRoles: input.applicableRoles?.length ? input.applicableRoles : null,
      relatedRoutes: input.relatedRoutes?.length ? input.relatedRoutes : null,
      applicableVersion: input.applicableVersion || null,
    },
    user.id
  )
  revalidatePath('/wiki')
}

export async function linkSourceAction(input: {
  wikiVersionId: string
  documentId?: string
  chunkId?: string
  sourceType: WikiSourceType
  relationship?: string
  notes?: string
}) {
  const { supabase } = await requireRole('curator')
  await linkSource(supabase, {
    wikiVersionId: input.wikiVersionId,
    documentId: input.documentId ?? null,
    chunkId: input.chunkId ?? null,
    sourceType: input.sourceType,
    relationship: input.relationship ?? null,
    notes: input.notes ?? null,
  })
  revalidatePath('/wiki')
}

export async function unlinkSourceAction(sourceId: string) {
  const { supabase } = await requireRole('curator')
  await unlinkSource(supabase, sourceId)
  revalidatePath('/wiki')
}

export async function linkRelatedArticleAction(fromArticleId: string, toArticleId: string) {
  const { supabase } = await requireRole('curator')
  await linkRelatedArticle(supabase, fromArticleId, toArticleId)
  revalidatePath('/wiki')
}

export async function linkRelatedArticleBySlugAction(fromArticleId: string, toSlug: string) {
  const { supabase } = await requireRole('curator')
  const { data: target, error } = await supabase.from('wiki_articles').select('id').eq('slug', toSlug).maybeSingle()
  if (error) throw error
  if (!target) throw new WikiValidationError(`No article found with slug "${toSlug}"`)
  if (target.id === fromArticleId) throw new WikiValidationError('An article cannot be related to itself')
  await linkRelatedArticle(supabase, fromArticleId, target.id)
  revalidatePath('/wiki')
}

export async function unlinkRelatedArticleAction(relationId: string) {
  const { supabase } = await requireRole('curator')
  await unlinkRelatedArticle(supabase, relationId)
  revalidatePath('/wiki')
}

// Project-Aware Knowledge and Assistant Context, Stage 1. can_curate_project
// (via project_wiki_articles_manage_curator RLS) is the real gate -- a
// platform curator who isn't a member of the target project can't attach to
// it, matching listProjectsForLinking's own scoping.
export async function linkProjectArticleAction(projectId: string, wikiArticleId: string) {
  const { user, supabase } = await requireRole('curator')
  await linkProjectArticle(supabase, projectId, wikiArticleId, user.id)
  revalidatePath('/wiki')
  revalidatePath(`/projects/${projectId}`)
}

export async function unlinkProjectArticleAction(linkId: string, projectId: string) {
  const { supabase } = await requireRole('curator')
  await unlinkProjectArticle(supabase, linkId)
  revalidatePath('/wiki')
  revalidatePath(`/projects/${projectId}`)
}

// One-step version of "attach a project, then narrow visibility" for the
// common case (an article with no attached projects yet): doing it as two
// separate actions let a non-member curator/admin strand themselves between
// steps -- narrowing visibility before attaching left the article
// unreadable (see setArticleVisibilityScopeAction's own comment), so the UI
// only offers project_private/selected_projects once a project is already
// attached. This is that attach, done together with the scope change in one
// request instead of relying on the user to get the order right.
export async function attachProjectAndSetVisibilityAction(projectId: string, wikiArticleId: string, scope: WikiVisibilityScope) {
  const { user, supabase } = await requireRole('curator')
  await linkProjectArticle(supabase, projectId, wikiArticleId, user.id)
  const admin = createAdminClient()
  const { error } = await admin.from('wiki_articles').update({ visibility_scope: scope }).eq('id', wikiArticleId)
  if (error) throw error
  revalidatePath('/wiki')
  revalidatePath(`/projects/${projectId}`)
}

// Separate from approve/public, same shape as setArticlePublicAction --
// visibility is its own dimension, not implied by approval status. Unlike
// setArticlePublicAction, this runs on the service-role client: PostgREST
// always evaluates an UPDATE's RETURNING against the table's SELECT policy
// (regardless of the client's return=minimal preference), and
// wiki_articles_select_approved_or_staff intentionally denies staff-without-
// membership read access to an approved project_private/selected_projects
// article -- so a non-member curator/admin narrowing an article's own
// visibility would otherwise be unable to see the very row they just wrote,
// and the write itself would fail with a spurious RLS error. Same class of
// issue as approveArticleAction/rejectArticleAction above. Authorization is
// unchanged: still gated on requireRole('curator') before the write.
export async function setArticleVisibilityScopeAction(articleId: string, scope: WikiVisibilityScope) {
  await requireRole('curator')
  const admin = createAdminClient()
  const { error } = await admin.from('wiki_articles').update({ visibility_scope: scope }).eq('id', articleId)
  if (error) throw error
  revalidatePath('/wiki')
}

export async function submitArticleForReviewAction(articleId: string) {
  const { supabase } = await requireRole('curator')
  await submitArticleForReview(supabase, articleId)
  revalidatePath('/wiki')
}

export async function archiveArticleAction(articleId: string) {
  const { supabase } = await requireRole('admin')
  await archiveArticle(supabase, articleId)
  revalidatePath('/wiki')
}

// Approval is the one Wiki action gated to admin specifically (matching the
// document-approval pattern), and it runs on the service-role client since
// wiki_versions has no client-side UPDATE policy at all -- see the RLS
// comment in supabase/migrations/20260808220006_wiki_rls.sql.
export async function approveArticleAction(articleId: string, versionId: string) {
  const { user } = await requireRole('admin')
  const admin = createAdminClient()

  await approveWikiVersion(admin, articleId, versionId, user.id)

  // Embedding is best-effort and must never turn a successful approval into
  // a failed request -- see the comment on embedApprovedVersion. That
  // guarantee previously only covered the embed call itself; getActiveEmbeddingProvider()
  // sits before it and can throw AIConfigError (no default model, missing API
  // key) just as easily, so it has to be inside the same try/catch.
  try {
    const { data: version } = await admin.from('wiki_versions').select('content').eq('id', versionId).single()
    if (version) {
      const provider = await getActiveEmbeddingProvider(admin, { requestedBy: user.id })
      await embedApprovedVersion(admin, provider, versionId, version.content)
    }
  } catch (err) {
    console.error(`Wiki embedding skipped for version ${versionId}:`, err)
  }

  revalidatePath('/wiki')
}

export async function rejectArticleAction(articleId: string) {
  await requireRole('admin')
  const admin = createAdminClient()
  await rejectWikiVersionToDraft(admin, articleId)
  revalidatePath('/wiki')
}

// Separate from approval -- approved means "trusted canonical knowledge",
// public means "safe for anonymous disclosure" (see the migration comment
// in 20260810130001_public_visibility.sql). Admin-only, same bar as
// approve/archive. Uses the regular RLS-scoped client, unlike
// approveArticleAction/rejectArticleAction -- wiki_articles already has a
// client-side UPDATE policy (wiki_articles_update_staff), the service-role
// requirement only applies to wiki_versions.
export async function setArticlePublicAction(articleId: string, isPublic: boolean) {
  const { supabase } = await requireRole('admin')
  const { error } = await supabase.from('wiki_articles').update({ is_public: isPublic }).eq('id', articleId)
  if (error) throw error
  revalidatePath('/wiki')
  revalidatePath('/knowledge')
}
