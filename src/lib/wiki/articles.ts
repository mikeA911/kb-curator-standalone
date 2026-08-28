import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WikiArticleStatus, WikiGeneratedBy, WikiCategoryId } from '@/types/database'

export class WikiValidationError extends Error {}

export interface DraftContentInput {
  quickHelp: string
  content: string
  implementationNotes?: string | null
  limitations?: string | null
  applicableRoles?: string[] | null
  relatedRoutes?: string[] | null
  applicableVersion?: string | null
}

export interface CreateManualArticleInput extends DraftContentInput {
  slug: string
  title: string
  category: WikiCategoryId
  shortDescription?: string | null
  knowledgeBaseId?: string | null
  createdBy: string
}

interface CreateArticleShellInput {
  slug: string
  title: string
  category: WikiCategoryId
  shortDescription?: string | null
  knowledgeBaseId?: string | null
  createdBy: string
}

// Creates the wiki_articles row only (status='draft', no current_version_id
// yet -- nothing is canonical until something is approved). Callers insert
// version 1 themselves via insertVersion, so a single creation path (manual
// or AI-assisted) produces exactly one version, correctly labeled.
async function createArticleShell(supabase: SupabaseClient<Database>, input: CreateArticleShellInput) {
  const { data: existing } = await supabase.from('wiki_articles').select('id').eq('slug', input.slug).maybeSingle()
  if (existing) throw new WikiValidationError(`Slug "${input.slug}" is already in use`)

  const { data: article, error: articleError } = await supabase
    .from('wiki_articles')
    .insert({
      knowledge_base_id: input.knowledgeBaseId ?? null,
      slug: input.slug,
      title: input.title,
      category: input.category,
      short_description: input.shortDescription ?? null,
      status: 'draft',
      created_by: input.createdBy,
    })
    .select()
    .single()
  if (articleError || !article) throw articleError ?? new Error('Failed to create article')
  return article
}

// Manual article creation: shell + first version, generated_by='human'.
export async function createManualDraftArticle(supabase: SupabaseClient<Database>, input: CreateManualArticleInput) {
  const article = await createArticleShell(supabase, input)
  const version = await insertVersion(supabase, article.id, 1, {
    ...input,
    generatedBy: 'human',
    createdBy: input.createdBy,
  })
  return { article, version }
}

export interface CreateAIAssistedArticleInput extends DraftContentInput {
  slug: string
  title: string
  category: WikiCategoryId
  shortDescription?: string | null
  aiProvider: string
  aiModel: string
  sourceChunkIds?: string[] | null
  createdBy: string
}

// AI-assisted article creation: shell + first version, generated_by='ai_assisted'
// with provenance. Still lands as status='draft' -- no AI path can publish
// canonical knowledge (see review.ts for the only path that can).
export async function createAIAssistedArticle(supabase: SupabaseClient<Database>, input: CreateAIAssistedArticleInput) {
  const article = await createArticleShell(supabase, input)
  const version = await insertVersion(supabase, article.id, 1, {
    ...input,
    generatedBy: 'ai_assisted',
    createdBy: input.createdBy,
    aiGeneratedAt: new Date().toISOString(),
  })
  return { article, version }
}

interface InsertVersionInput extends DraftContentInput {
  generatedBy: WikiGeneratedBy
  createdBy: string
  aiProvider?: string | null
  aiModel?: string | null
  aiGeneratedAt?: string | null
  sourceChunkIds?: string[] | null
}

async function insertVersion(
  supabase: SupabaseClient<Database>,
  articleId: string,
  versionNumber: number,
  input: InsertVersionInput
) {
  const { data: version, error } = await supabase
    .from('wiki_versions')
    .insert({
      wiki_article_id: articleId,
      version_number: versionNumber,
      quick_help: input.quickHelp,
      content: input.content,
      implementation_notes: input.implementationNotes ?? null,
      limitations: input.limitations ?? null,
      applicable_roles: input.applicableRoles ?? null,
      related_routes: input.relatedRoutes ?? null,
      applicable_version: input.applicableVersion ?? null,
      verification_status: 'unverified',
      last_verified_at: null,
      generated_by: input.generatedBy,
      ai_provider: input.aiProvider ?? null,
      ai_model: input.aiModel ?? null,
      ai_generated_at: input.aiGeneratedAt ?? null,
      source_chunk_ids: input.sourceChunkIds ?? null,
      created_by: input.createdBy,
      approved_by: null,
      approved_at: null,
    })
    .select()
    .single()
  if (error || !version) throw error ?? new Error('Failed to create version')
  return version
}

// Creates a new draft version on top of an EXISTING article -- used both for
// "edit this draft further" and "edit approved content" (the brief's "a
// modification to approved content creates a new draft version"). Never
// touches current_version_id: that only ever changes on approval (see
// approveArticle in review.ts), so an approved article keeps showing its
// last-approved content while a new edit is in review.
export async function createNextDraftVersion(
  supabase: SupabaseClient<Database>,
  articleId: string,
  input: DraftContentInput,
  createdBy: string
) {
  const { data: latest, error: latestError } = await supabase
    .from('wiki_versions')
    .select('version_number')
    .eq('wiki_article_id', articleId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) throw latestError

  const nextVersionNumber = (latest?.version_number ?? 0) + 1

  const version = await insertVersion(supabase, articleId, nextVersionNumber, {
    ...input,
    generatedBy: 'human',
    createdBy,
  })

  const { error: statusError } = await supabase.from('wiki_articles').update({ status: 'draft' }).eq('id', articleId)
  if (statusError) throw statusError

  return version
}

export async function submitArticleForReview(supabase: SupabaseClient<Database>, articleId: string) {
  const { data: article, error } = await supabase.from('wiki_articles').select('status').eq('id', articleId).single()
  if (error || !article) throw error ?? new Error('Article not found')
  if (article.status !== 'draft') {
    throw new WikiValidationError(`Cannot submit an article with status "${article.status}" for review`)
  }

  const { error: updateError } = await supabase.from('wiki_articles').update({ status: 'review' }).eq('id', articleId)
  if (updateError) throw updateError
}

export async function archiveArticle(supabase: SupabaseClient<Database>, articleId: string) {
  const { error } = await supabase.from('wiki_articles').update({ status: 'archived' as WikiArticleStatus }).eq('id', articleId)
  if (error) throw error
}
