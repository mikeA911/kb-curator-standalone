'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireRole, AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createManualDraftArticle, createNextDraftVersion, submitArticleForReview } from '@/lib/wiki/articles'
import type { WikiCategoryId } from '@/types/database'

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function submitTrendingItemAction(input: {
  title: string
  sourceUrl: string
  sourceName: string | null
  description: string
  tags: string[]
  projectId: string | null
}) {
  const { user, profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to submit to Trending')

  const { data, error } = await supabase
    .from('trending_items')
    .insert({
      title: input.title,
      source_url: input.sourceUrl,
      source_name: input.sourceName,
      description: input.description,
      tags: input.tags,
      submitted_by: user.id,
      project_id: input.projectId,
      visibility: input.projectId ? 'project' : 'platform',
    })
    .select()
    .single()
  if (error) throw error

  revalidatePath('/trending')
  return { id: data.id }
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
