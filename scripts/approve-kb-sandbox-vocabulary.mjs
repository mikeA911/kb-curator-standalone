// Approve + embed the KB Sandbox Vocabulary article. Mirrors
// scripts/approve-showcase-handbook-articles.mjs, scoped to this one slug.
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
if (!googleApiKey) throw new Error('Missing GOOGLE_API_KEY / GEMINI_API_KEY')

const EMBED_DIMENSIONS = 1536
const SLUG = 'kb-sandbox-vocabulary'

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const gemini = new GoogleGenAI({ apiKey: googleApiKey })

const { data: approver, error: approverError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (approverError || !approver) throw approverError ?? new Error('Approver profile not found')

const { data: defaultEmbedModel, error: modelError } = await admin
  .from('ai_models')
  .select('model_id, provider_id')
  .eq('model_type', 'embedding')
  .eq('is_default', true)
  .single()
if (modelError || !defaultEmbedModel) throw modelError ?? new Error('No default embedding model configured')

const { data: article, error: articleError } = await admin.from('wiki_articles').select('id, slug, status, current_version_id').eq('slug', SLUG).single()
if (articleError || !article) throw articleError ?? new Error('Article not found')
if (article.status === 'approved') {
  console.log(`${SLUG} already approved`)
  process.exit(0)
}

const { data: version, error: versionError } = await admin
  .from('wiki_versions')
  .select('id, content')
  .eq('wiki_article_id', article.id)
  .is('approved_at', null)
  .single()
if (versionError || !version) throw versionError ?? new Error('No unapproved version found')

const now = new Date().toISOString()
const { error: versionUpdateError } = await admin.from('wiki_versions').update({ approved_by: approver.id, approved_at: now }).eq('id', version.id)
if (versionUpdateError) throw versionUpdateError

const { error: articleUpdateError } = await admin.from('wiki_articles').update({ status: 'approved', current_version_id: version.id }).eq('id', article.id)
if (articleUpdateError) throw articleUpdateError

const res = await gemini.models.embedContent({
  model: defaultEmbedModel.model_id,
  contents: [version.content],
  config: { outputDimensionality: EMBED_DIMENSIONS },
})
const embedding = res.embeddings?.[0]?.values ?? []
const { error: upsertError } = await admin.from('wiki_vectors').upsert({
  wiki_version_id: version.id,
  content: version.content,
  embedding,
  embedding_model: defaultEmbedModel.model_id,
  embedding_dim: embedding.length,
})
if (upsertError) throw upsertError

console.log(`Approved + embedded: ${SLUG}`)
