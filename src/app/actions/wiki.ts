'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveProvider } from '@/lib/ai'
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
import { synthesizeWikiDraft } from '@/lib/wiki/synthesis'
import type { WikiCategoryId, WikiSourceType } from '@/types/database'

// Any authenticated user can resolve Quick Help -- it's app-wide contextual
// help, not a curator-only feature. Only ever returns approved content (see
// getQuickHelpBySlug).
export async function getQuickHelpAction(slug: string) {
  const { supabase } = await requireUser()
  return getQuickHelpBySlug(supabase, slug)
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
    knowledgeBaseId: input.knowledgeBaseId,
    createdBy: user.id,
  })

  revalidatePath('/wiki')
  return { articleId: article.id, slug: article.slug }
}

export async function createAIAssistedDraftAction(input: {
  topic: string
  category: WikiCategoryId
  chunkIds: string[]
}) {
  const { user, supabase } = await requireRole('curator')

  if (input.chunkIds.length === 0) throw new WikiValidationError('Select at least one source chunk')

  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, document_id, chunk_text, source_page, review_status')
    .in('id', input.chunkIds)
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

  const provider = await getActiveProvider(supabase, { requestedBy: user.id })

  const draft = await synthesizeWikiDraft(provider, {
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
    aiModel: 'active-provider-default',
    sourceChunkIds: input.chunkIds,
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

export async function editDraftAction(
  articleId: string,
  input: { quickHelp: string; content: string; implementationNotes: string; limitations: string }
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

  const { data: version } = await admin.from('wiki_versions').select('content').eq('id', versionId).single()
  if (version) {
    const provider = await getActiveProvider(admin, { requestedBy: user.id })
    await embedApprovedVersion(admin, provider, versionId, version.content)
  }

  revalidatePath('/wiki')
}

export async function rejectArticleAction(articleId: string) {
  await requireRole('admin')
  const admin = createAdminClient()
  await rejectWikiVersionToDraft(admin, articleId)
  revalidatePath('/wiki')
}
