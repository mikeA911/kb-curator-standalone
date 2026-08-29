// One-off: approve the 17 Wiki articles left in review after seeding,
// following an explicit user request ("approve the rest of the wikis...
// I trust you") to skip the human-review step this once. Each was read in
// full before this ran (house-style consistency, no fabricated specifics,
// no safety issues) -- this is not a blind bulk-approve.
//
// Reimplements approveWikiVersion (src/lib/wiki/review.ts) exactly -- same
// two updates, same field names -- plus the embed step via direct Gemini
// SDK call (src/lib/ai starts with `import 'server-only'`, unusable outside
// Next's bundler; see scripts/backfill-wiki-embeddings.mjs for why).
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiApiKey = process.env.GEMINI_API_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY')

const EMBED_DIMENSIONS = 1536

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

const { data: pending, error: pendingError } = await admin
  .from('wiki_articles')
  .select('id, slug, current_version_id, status')
  .eq('status', 'review')
if (pendingError) throw pendingError

// Each in-review article's pending version is whichever wiki_version has
// no approved_at yet -- current_version_id (if set) points at the OLD
// approved version for articles being re-reviewed after an edit, not the
// pending one.
const { data: versions, error: versionsError } = await admin
  .from('wiki_versions')
  .select('id, wiki_article_id, approved_at')
  .in(
    'wiki_article_id',
    pending.map((a) => a.id)
  )
  .is('approved_at', null)
if (versionsError) throw versionsError
const pendingVersionByArticle = new Map(versions.map((v) => [v.wiki_article_id, v.id]))

console.log(`${pending.length} article(s) to approve`)

for (const article of pending) {
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
