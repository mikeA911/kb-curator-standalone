// Seeds the Client Knowledge Workspace Onboarding Workbench Method from
// docs/dev-request-client-knowledge-workspace-onboarding-method.md, using
// docs/workbench-method-client-knowledge-workspace-onboarding.md as content.
// Mirrors scripts/seed-showcase-handbook-articles.mjs's approach (wiki_
// articles row + one wiki_versions row via the service-role client) but for
// a single article, plus wiki_relations links to the 3 named Related Methods
// -- linking is additive to a separate table, so it doesn't touch or
// destabilize those already-approved articles' own content/status.
//
// Deliberately left status='draft', per the dev request: "Do not approve or
// publish it automatically." No embedding step is run -- only approved
// versions get embedded (see src/lib/wiki/review.ts / scripts/backfill-wiki-
// embeddings.mjs), so there's nothing to do here beyond creating the row;
// approveArticleAction's embed step runs automatically once Mike approves it
// through the normal Wiki UI.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const SLUG = 'client-knowledge-workspace-onboarding-workbench-method'
const TITLE = 'Client Knowledge Workspace Onboarding (Workbench Method)'
const SHORT_DESCRIPTION =
  'Decide which Projects and knowledge bases a client, department, or programme needs -- shared, specialized, or isolated -- before large volumes of material are uploaded.'
const QUICK_HELP =
  'Use this Method when onboarding a client, department, programme, or business capability into KB Sandbox and deciding which Projects and knowledge bases should be shared, specialized, or isolated.'

const RELATED_TITLES = ['Organization Knowledge Base (Workbench Method)', 'Legacy System Understanding (Workbench Method)', 'Security Review (Workbench Method)']

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const docPath = path.join(scriptDir, '..', 'docs', 'workbench-method-client-knowledge-workspace-onboarding.md')
const raw = readFileSync(docPath, 'utf8')

const splitIndex = raw.indexOf('## Goal')
if (splitIndex === -1) throw new Error('Could not find "## Goal" in the source doc -- has it changed shape?')
let content = raw.slice(splitIndex).trim()

// Requirement #6: the recommended-next-action link must resolve to the real
// stable route, not a placeholder/example or hardcoded production hostname
// -- the doc as authored (from a live test against https://kbsandbox.tech)
// hardcodes that origin; rewritten to a relative route so it resolves
// correctly regardless of which deployment renders it.
const HARDCODED_LINK = '[Projects](https://kbsandbox.tech/projects)'
const RELATIVE_LINK = '[Projects](/projects)'
if (!content.includes(HARDCODED_LINK)) throw new Error(`Expected to find "${HARDCODED_LINK}" in the source doc -- has it changed?`)
content = content.replace(HARDCODED_LINK, RELATIVE_LINK)

const { data: existingArticle } = await admin.from('wiki_articles').select('id').eq('slug', SLUG).maybeSingle()
if (existingArticle) {
  console.log(`[skip] ${SLUG} already exists (${existingArticle.id})`)
  process.exit(0)
}

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('Owner profile not found')

const { data: article, error: articleError } = await admin
  .from('wiki_articles')
  .insert({
    slug: SLUG,
    title: TITLE,
    category: 'platform_handbook',
    short_description: SHORT_DESCRIPTION,
    status: 'draft',
    created_by: owner.id,
  })
  .select('id, slug, status')
  .single()
if (articleError || !article) throw articleError ?? new Error(`Failed to create article ${SLUG}`)

const { data: version, error: versionError } = await admin
  .from('wiki_versions')
  .insert({
    wiki_article_id: article.id,
    version_number: 1,
    quick_help: QUICK_HELP,
    content,
    verification_status: 'unverified',
    generated_by: 'human',
    created_by: owner.id,
  })
  .select('id')
  .single()
if (versionError || !version) throw versionError ?? new Error(`Failed to create version for ${SLUG}`)

console.log(`[created] ${article.slug} (article ${article.id}, version ${version.id}, status: ${article.status})`)

for (const relatedTitle of RELATED_TITLES) {
  const { data: related, error: relatedError } = await admin.from('wiki_articles').select('id').eq('title', relatedTitle).maybeSingle()
  if (relatedError) throw relatedError
  if (!related) {
    console.warn(`  [warn] related article not found, skipping link: ${relatedTitle}`)
    continue
  }
  const { error: relationError } = await admin.from('wiki_relations').insert({ from_article_id: article.id, to_article_id: related.id })
  if (relationError) throw relationError
  console.log(`  [linked] -> ${relatedTitle}`)
}

console.log('\nDone. Article is unapproved (status: draft) -- review and approve it through the admin Wiki review queue.')
