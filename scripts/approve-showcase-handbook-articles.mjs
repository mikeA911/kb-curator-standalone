// Approve + embed exactly the 8 Handbook articles created by
// scripts/seed-showcase-handbook-articles.mjs. Scoped to those known slugs
// (rather than a blanket status filter, as scripts/approve-pending-wiki-
// articles.mjs uses) so this can't accidentally approve an unrelated
// in-progress draft. Each article was authored and reviewed for house-style
// consistency in the same pass that wrote it (matching the precedent set by
// approve-pending-wiki-articles.mjs's own justification) -- not a blind
// bulk-approve of someone else's content.
//
// Reimplements approveWikiVersion (src/lib/wiki/review.ts) plus the embed
// step via direct Gemini SDK call, same reason as the scripts it mirrors:
// src/lib/ai starts with `import 'server-only'`, unusable outside Next's
// bundler.
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
// The app's ai_providers registry names this GEMINI_API_KEY
// (supabase/migrations/20260821140001_gemini_api_key_env_var.sql) -- GOOGLE_API_KEY
// is no longer used anywhere, per Mike, 2026-08-28.
const geminiApiKey = process.env.GEMINI_API_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY')

const EMBED_DIMENSIONS = 1536

const SLUGS = [
  'governed-qa-and-grounded-drafting-workbench-method',
  'guided-onboarding-role-specific-guide-assembly-workbench-method',
  'document-policy-comparison-workbench-method',
  'structured-rule-based-review-workbench-method',
  'reusable-workflow-checklist-generation-workbench-method',
  'multi-document-comparative-scoring-workbench-method',
  'structured-incident-failure-investigation-workbench-method',
  'multimodal-edge-ai-architecture-placement-workbench-method',
]

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const gemini = new GoogleGenAI({ apiKey: geminiApiKey })

const { data: approver, error: approverError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (approverError || !approver) throw approverError ?? new Error('Approver profile not found')

const { data: defaultEmbedModel, error: modelError } = await admin
  .from('ai_models')
  .select('model_id, provider_id')
  .eq('model_type', 'embedding')
  .eq('is_default', true)
  .single()
if (modelError || !defaultEmbedModel) throw modelError ?? new Error('No default embedding model configured')
const { data: provider, error: providerError } = await admin.from('ai_providers').select('name').eq('id', defaultEmbedModel.provider_id).single()
if (providerError || !provider) throw providerError ?? new Error('Default embedding model provider not found')
if (provider.name !== 'gemini') {
  throw new Error(`Default embedding provider is "${provider.name}", not Gemini -- this script only implements the Gemini request shape.`)
}

const { data: articles, error: articlesError } = await admin
  .from('wiki_articles')
  .select('id, slug, status')
  .in('slug', SLUGS)
if (articlesError) throw articlesError
if (articles.length !== SLUGS.length) {
  console.warn(`Expected ${SLUGS.length} articles, found ${articles.length} -- did seed-showcase-handbook-articles.mjs run?`)
}

const { data: versions, error: versionsError } = await admin
  .from('wiki_versions')
  .select('id, wiki_article_id, approved_at')
  .in('wiki_article_id', articles.map((a) => a.id))
  .is('approved_at', null)
if (versionsError) throw versionsError
const pendingVersionByArticle = new Map(versions.map((v) => [v.wiki_article_id, v.id]))

for (const article of articles) {
  if (article.status === 'approved') {
    console.log(`[skip] ${article.slug} already approved`)
    continue
  }
  const versionId = pendingVersionByArticle.get(article.id)
  if (!versionId) {
    console.error(`Skipping ${article.slug}: no unapproved version found`)
    continue
  }

  const now = new Date().toISOString()
  const { error: versionUpdateError } = await admin.from('wiki_versions').update({ approved_by: approver.id, approved_at: now }).eq('id', versionId)
  if (versionUpdateError) throw versionUpdateError

  const { error: articleUpdateError } = await admin.from('wiki_articles').update({ status: 'approved', current_version_id: versionId }).eq('id', article.id)
  if (articleUpdateError) throw articleUpdateError

  const { data: version, error: contentError } = await admin.from('wiki_versions').select('content').eq('id', versionId).single()
  if (contentError || !version) {
    console.error(`Approved ${article.slug} but could not load content to embed:`, contentError)
    continue
  }

  try {
    const res = await gemini.models.embedContent({
      model: defaultEmbedModel.model_id,
      contents: [version.content],
      config: { outputDimensionality: EMBED_DIMENSIONS },
    })
    const embedding = res.embeddings?.[0]?.values ?? []
    const { error: upsertError } = await admin.from('wiki_vectors').upsert({
      wiki_version_id: versionId,
      content: version.content,
      embedding,
      embedding_model: defaultEmbedModel.model_id,
      embedding_dim: embedding.length,
    })
    if (upsertError) throw upsertError
    console.log(`Approved + embedded: ${article.slug}`)
  } catch (err) {
    console.error(`Approved but embedding failed for ${article.slug}:`, err instanceof Error ? err.message : err)
  }
}
