// One-off: backfill wiki_vectors for approved articles silently skipped by
// the getActiveProvider()/getActiveEmbeddingProvider() bug (fixed in the
// same change as this script -- approveArticleAction used to resolve the
// default GENERATION provider (Groq, cannot embed) instead of the default
// EMBEDDING provider (Gemini) for the embed step, and the failure was
// swallowed by the best-effort try/catch in embedApprovedVersion).
//
// This calls the Gemini SDK directly rather than importing the app's
// GeminiProvider class -- that file (and everything else under src/lib/ai)
// starts with `import 'server-only'`, which throws unconditionally outside
// Next's bundler (it has no runtime server/client detection of its own; the
// substitution only happens inside webpack/turbopack). The request shape
// below is copied exactly from src/lib/ai/gemini-provider.ts's embed()
// method: same model (the current default embedding model, read from the
// registry) and the same pinned 1536-dim output the DB's vector(1536)
// columns require.
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

// Confirm the registry's current default embedding model actually matches
// what this script hard-codes, rather than silently embedding against the
// wrong model if an admin changes the default later.
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
  throw new Error(`Default embedding provider is "${provider.name}", not Gemini -- this script only implements the Gemini request shape. Update it before running.`)
}
console.log(`Default embedding model: ${provider.name}/${defaultEmbedModel.model_id}`)

const { data: articles, error: articlesError } = await admin
  .from('wiki_articles')
  .select('id, slug, current_version_id')
  .eq('status', 'approved')
if (articlesError) throw articlesError

const withVersion = (articles ?? []).filter((a) => a.current_version_id)
const versionIds = withVersion.map((a) => a.current_version_id)

const { data: existingVectors, error: vectorsError } = await admin.from('wiki_vectors').select('wiki_version_id').in('wiki_version_id', versionIds)
if (vectorsError) throw vectorsError
const alreadyEmbedded = new Set((existingVectors ?? []).map((v) => v.wiki_version_id))

const missing = withVersion.filter((a) => !alreadyEmbedded.has(a.current_version_id))
console.log(`${missing.length} approved article(s) missing an embedding`)

for (const article of missing) {
  const versionId = article.current_version_id
  const { data: version, error: versionError } = await admin.from('wiki_versions').select('content').eq('id', versionId).single()
  if (versionError || !version) {
    console.error(`Skipping ${article.slug} (${versionId}): version not found`)
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
    console.log(`Embedded: ${article.slug} (${embedding.length} dims)`)
  } catch (err) {
    console.error(`FAILED: ${article.slug}:`, err instanceof Error ? err.message : err)
  }
}
