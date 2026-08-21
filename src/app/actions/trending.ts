'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireRole, AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createManualDraftArticle, createNextDraftVersion, submitArticleForReview } from '@/lib/wiki/articles'
import { validateSharedLinkUrl, normalizeUrlForDuplicateDetection } from '@/lib/trending/url-safety'
import type { WikiCategoryId } from '@/types/database'

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export type SubmitTrendingItemResult =
  | { status: 'created'; id: string }
  | { status: 'duplicate'; existingItemId: string; existingTitle: string }

export async function submitTrendingItemAction(input: {
  title: string
  sourceUrl: string
  sourceName: string | null
  description: string
  tags: string[]
  projectId: string | null
  // Set once the caller has seen a 'duplicate' result and chosen to submit
  // anyway (doc: "allow an... exception if genuinely necessary").
  confirmDuplicate?: boolean
}): Promise<SubmitTrendingItemResult> {
  const { user, profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to submit to Trending')

  const sourceUrl = validateSharedLinkUrl(input.sourceUrl)
  const normalizedSourceUrl = normalizeUrlForDuplicateDetection(sourceUrl)
  const visibility = input.projectId ? 'project' : 'platform'

  // A found duplicate is returned, not thrown -- a thrown custom error's
  // extra fields (like the existing item's id) don't reliably survive
  // Server Action serialization to the client, only Error.message does.
  if (!input.confirmDuplicate) {
    let duplicateQuery = supabase
      .from('trending_items')
      .select('id, title')
      .eq('normalized_source_url', normalizedSourceUrl)
      .eq('status', 'active')
      .limit(1)
    duplicateQuery = input.projectId ? duplicateQuery.eq('project_id', input.projectId) : duplicateQuery.eq('visibility', 'platform')
    const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle()
    if (duplicateError) throw duplicateError
    if (duplicate) {
      return { status: 'duplicate', existingItemId: duplicate.id, existingTitle: duplicate.title }
    }
  }

  const { data, error } = await supabase
    .from('trending_items')
    .insert({
      title: input.title,
      source_url: sourceUrl,
      source_name: input.sourceName,
      description: input.description,
      tags: input.tags,
      submitted_by: user.id,
      project_id: input.projectId,
      visibility,
      normalized_source_url: normalizedSourceUrl,
    })
    .select()
    .single()
  if (error) throw error

  revalidatePath('/trending')
  revalidatePath('/dashboard')
  return { status: 'created', id: data.id }
}

export async function commentOnTrendingItemAction(trendingItemId: string, body: string) {
  const { user, profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to comment')
  if (!body.trim()) throw new Error('Comment cannot be empty')

  const { error } = await supabase.from('trending_comments').insert({
    trending_item_id: trendingItemId,
    author_id: user.id,
    body: body.trim(),
  })
  if (error) throw error

  revalidatePath(`/trending/${trendingItemId}`)
}

export async function linkTrendingToWikiAction(trendingItemId: string, wikiArticleId: string) {
  const { user, profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to link Wiki articles')
  const { error } = await supabase.from('trending_wiki_links').insert({
    trending_item_id: trendingItemId,
    wiki_article_id: wikiArticleId,
    linked_by: user.id,
  })
  if (error) throw error

  revalidatePath(`/trending/${trendingItemId}`)
}

export async function unlinkTrendingWikiAction(linkId: string, trendingItemId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('trending_wiki_links').delete().eq('id', linkId)
  if (error) throw error

  revalidatePath(`/trending/${trendingItemId}`)
}

export async function markUnderReviewAction(trendingItemId: string) {
  const { supabase } = await requireRole('curator')
  const { error } = await supabase.from('trending_items').update({ status: 'under_review' }).eq('id', trendingItemId)
  if (error) throw error

  revalidatePath('/trending')
  revalidatePath(`/trending/${trendingItemId}`)
}

export async function archiveTrendingItemAction(trendingItemId: string) {
  const { supabase } = await requireRole('curator')
  const { error } = await supabase.from('trending_items').update({ status: 'archived' }).eq('id', trendingItemId)
  if (error) throw error

  revalidatePath('/trending')
  revalidatePath(`/trending/${trendingItemId}`)
}

// The dashboard's Shared Links "Remove" control -- deliberately
// admin-only, stricter than archiveTrendingItemAction above (curator+),
// which stays untouched for the existing Trending curation workflow.
// Recoverable (sets status='archived', same as archive) but stamps a
// moderation audit trail so the removal itself -- who, when, why -- is
// never lost, per the doc's "recoverable archive, not physical deletion".
export async function removeSharedLinkAction(trendingItemId: string, reason?: string) {
  const { user, supabase } = await requireRole('admin')
  const { error } = await supabase
    .from('trending_items')
    .update({
      status: 'archived',
      archived_by: user.id,
      archived_at: new Date().toISOString(),
      moderation_reason: reason?.trim() || null,
    })
    .eq('id', trendingItemId)
  if (error) throw error

  revalidatePath('/dashboard')
  revalidatePath('/trending')
  revalidatePath(`/trending/${trendingItemId}`)
}

// Separate from status, same "canonical != public" split as
// setArticlePublicAction (src/app/actions/wiki.ts) -- publishing a
// Trending item anonymously is a deliberate, distinct decision.
export async function setTrendingPublicAction(trendingItemId: string, isPublic: boolean) {
  const { supabase } = await requireRole('curator')
  const { error } = await supabase
    .from('trending_items')
    .update({ is_public: isPublic, published_at: isPublic ? new Date().toISOString() : null })
    .eq('id', trendingItemId)
  if (error) throw error

  revalidatePath('/trending')
  revalidatePath(`/trending/${trendingItemId}`)
}

type PromoteInput =
  | {
      mode: 'new'
      title: string
      slug?: string
      category: WikiCategoryId
      shortDescription: string
      quickHelp: string
      content: string
      implementationNotes: string
      limitations: string
    }
  | {
      mode: 'update'
      articleId: string
      quickHelp: string
      content: string
      implementationNotes: string
      limitations: string
    }

// Curator/admin only. Produces a new Wiki DRAFT version through the
// existing, unmodified Wiki lifecycle (createManualDraftArticle /
// createNextDraftVersion + submitArticleForReview) -- the approved Wiki
// content never changes until the normal admin approval step runs
// afterward, same as every other Wiki edit path in this app. Uses the
// service-role client because stamping provenance onto wiki_versions
// requires it (wiki_versions has no client-side UPDATE policy -- see
// approveArticleAction for the same reasoning).
export async function promoteTrendingToWikiAction(trendingItemId: string, input: PromoteInput) {
  const { user } = await requireRole('curator')
  const admin = createAdminClient()

  let articleId: string
  let versionId: string

  if (input.mode === 'new') {
    const { article, version } = await createManualDraftArticle(admin, {
      slug: input.slug || slugify(input.title),
      title: input.title,
      category: input.category,
      shortDescription: input.shortDescription || null,
      quickHelp: input.quickHelp,
      content: input.content,
      implementationNotes: input.implementationNotes || null,
      limitations: input.limitations || null,
      knowledgeBaseId: null,
      createdBy: user.id,
    })
    articleId = article.id
    versionId = version.id
  } else {
    const version = await createNextDraftVersion(
      admin,
      input.articleId,
      {
        quickHelp: input.quickHelp,
        content: input.content,
        implementationNotes: input.implementationNotes || null,
        limitations: input.limitations || null,
      },
      user.id
    )
    articleId = input.articleId
    versionId = version.id
  }

  const { error: provenanceError } = await admin
    .from('wiki_versions')
    .update({ promoted_from_trending_item_id: trendingItemId })
    .eq('id', versionId)
  if (provenanceError) throw provenanceError

  await submitArticleForReview(admin, articleId)

  const { error: statusError } = await admin.from('trending_items').update({ status: 'promoted' }).eq('id', trendingItemId)
  if (statusError) throw statusError

  revalidatePath('/trending')
  revalidatePath(`/trending/${trendingItemId}`)
  revalidatePath('/wiki')

  return { articleId }
}
