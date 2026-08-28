// Same as approve-showcase-handbook-articles.mjs but DB-only: marks each of
// the 8 new articles approved (status + current_version_id), with no
// external API call. Embeddings are a separate, explicit follow-up step --
// see scripts/backfill-wiki-embeddings.mjs (needs GEMINI_API_KEY set).
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

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

const { data: approver, error: approverError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (approverError || !approver) throw approverError ?? new Error('Approver profile not found')

const { data: articles, error: articlesError } = await admin.from('wiki_articles').select('id, slug, status').in('slug', SLUGS)
if (articlesError) throw articlesError

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
  console.log(`Approved (not yet embedded): ${article.slug}`)
}
