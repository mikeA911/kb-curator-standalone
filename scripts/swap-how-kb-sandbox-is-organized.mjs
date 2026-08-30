// Swaps the stale "How KB Sandbox Is Organized: Projects, Workstreams, and
// Knowledge" article (created 2026-08-18 by the test-admin seed account,
// leftover from building the Wiki Handbook feature itself -- confirmed not
// a colleague's real contribution) with Mike's current draft covering the
// organization/naming-convention model (docs/dev-request-ember-onboarding-
// capability-gaps.md, item 3). Same slug is kept so the existing URL and any
// inbound links (including the Vocabulary article's own reference) keep
// working -- this is a content swap, not a new article.
//
// Creates version 2 on the existing article, approves it immediately (per
// Mike's explicit instruction -- this is his own reviewed content, not an
// AI-synthesized draft needing separate human review), and re-embeds so
// search_wiki can actually retrieve it. Mirrors
// scripts/seed-kb-sandbox-vocabulary.mjs + scripts/approve-kb-sandbox-vocabulary.mjs's
// combined shape.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
if (!googleApiKey) throw new Error('Missing GOOGLE_API_KEY / GEMINI_API_KEY')

const EMBED_DIMENSIONS = 1536
const SLUG = 'how-kb-sandbox-is-organized-projects-workstreams-and-knowledge'

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const gemini = new GoogleGenAI({ apiKey: googleApiKey })

const { data: approver, error: approverError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (approverError || !approver) throw approverError ?? new Error('Approver profile not found')

const { data: article, error: articleError } = await admin
  .from('wiki_articles')
  .select('id, slug, status, current_version_id')
  .eq('slug', SLUG)
  .single()
if (articleError || !article) throw articleError ?? new Error(`Article not found for slug ${SLUG}`)

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptDir, '..', 'docs', 'workbench-handbook-how-kb-sandbox-is-organized.md')
const raw = readFileSync(sourcePath, 'utf8')

const splitIndex = raw.indexOf('## What this article explains')
if (splitIndex === -1) throw new Error(`Could not find "## What this article explains" in ${sourcePath}`)
const content = raw.slice(splitIndex).trim()

const TITLE = 'How KB Sandbox Is Organized: Organization, Projects and Knowledge'
const SHORT_DESCRIPTION =
  'How to represent a client organization, name and structure Projects, attach shared vs. specialized knowledge bases, and apply the two access layers (membership + resource policy) plus AI-processing sensitivity -- the naming-convention reference Ember needs for enterprise onboarding.'
const QUICK_HELP =
  'One KB Sandbox instance represents one client organization. Projects organize departments/capabilities/engagements using an <Organization>-<Purpose> naming convention. Knowledge bases hold reusable evidence attachable to several Projects. Access is enforced by Project membership, then resource-level policy, then AI-processing sensitivity -- three separate, independent controls.'

const { error: articleUpdateError } = await admin
  .from('wiki_articles')
  .update({ title: TITLE, short_description: SHORT_DESCRIPTION })
  .eq('id', article.id)
if (articleUpdateError) throw articleUpdateError

const { data: latestVersion } = await admin
  .from('wiki_versions')
  .select('version_number')
  .eq('wiki_article_id', article.id)
  .order('version_number', { ascending: false })
  .limit(1)
  .single()
const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1

const now = new Date().toISOString()
const { data: version, error: versionError } = await admin
  .from('wiki_versions')
  .insert({
    wiki_article_id: article.id,
    version_number: nextVersionNumber,
    quick_help: QUICK_HELP,
    content,
    verification_status: 'unverified',
    generated_by: 'human',
    created_by: approver.id,
    approved_by: approver.id,
    approved_at: now,
  })
  .select('id, content')
  .single()
if (versionError || !version) throw versionError ?? new Error('Failed to create version')

const { error: statusUpdateError } = await admin
  .from('wiki_articles')
  .update({ status: 'approved', current_version_id: version.id })
  .eq('id', article.id)
if (statusUpdateError) throw statusUpdateError

// Re-embed with the new content; the old version's wiki_vectors row is now
// unreachable via RLS (wiki_vectors_select_scoped requires
// wiki_version_id = the article's current_version_id) but delete it anyway
// to avoid an orphaned row.
const { data: defaultEmbedModel, error: modelError } = await admin
  .from('ai_models')
  .select('model_id, provider_id')
  .eq('model_type', 'embedding')
  .eq('is_default', true)
  .single()
if (modelError || !defaultEmbedModel) throw modelError ?? new Error('No default embedding model configured')

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

if (article.current_version_id) {
  await admin.from('wiki_vectors').delete().eq('wiki_version_id', article.current_version_id)
}

console.log(`Swapped ${SLUG}: version ${nextVersionNumber} approved and embedded (old version ${article.current_version_id} superseded).`)
