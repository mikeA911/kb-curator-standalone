// One-off seed script for the Agent Harnesses Workbench Handbook article
// (docs/dev-request-workbench-assistant-agent-flow-visibility.md Phase 1
// delivery item: "Add the matching Agent Harnesses article to the Workbench
// Handbook as a draft for human review and approval"). Reads the article
// body straight from docs/workbench-handbook-agent-harnesses.md at run time
// (stripping only its top proposal meta-block, which is instructions for
// this delivery, not article content) rather than duplicating that content
// here, so the two can never drift apart.
//
// Mirrors what src/lib/wiki/articles.ts's createManualDraftArticle() does
// (wiki_articles row with status='draft' and current_version_id left null
// + one wiki_versions row, generated_by='human') rather than importing that
// module directly -- it starts with `import 'server-only'`, which throws
// outside Next's server bundling, and these scripts run under plain Node
// (see package.json's `node --env-file=.env.local scripts/*.mjs`), same
// reason seed-carecall-project.mjs also does raw inserts instead of
// importing src/app/actions/projects.ts.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const SLUG = 'agent-harnesses-operating-and-governing-enterprise-ai-agents'

const { data: owner, error: ownerError } = await admin
  .from('profiles')
  .select('id, email')
  .eq('email', 'test-curator@kbsandbox.local')
  .single()
if (ownerError || !owner) throw ownerError ?? new Error('test-curator profile not found -- run npm run db:seed-users first')

const { data: existingArticle } = await admin.from('wiki_articles').select('id').eq('slug', SLUG).maybeSingle()
if (existingArticle) {
  console.log(`Article already exists (${existingArticle.id}), skipping. Delete it first to reseed.`)
  process.exit(0)
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptDir, '..', 'docs', 'workbench-handbook-agent-harnesses.md')
const raw = readFileSync(sourcePath, 'utf8')

// The source doc's own top block (title + "Proposed Wiki category/slug/
// status/Audience" lines) is delivery meta-instruction, not article
// content -- the real title/category/slug are passed explicitly below, and
// the article body starts at its first real section, "## Overview".
const overviewIndex = raw.indexOf('## Overview')
if (overviewIndex === -1) throw new Error(`Could not find "## Overview" in ${sourcePath} -- has the article's structure changed?`)
const content = raw.slice(overviewIndex).trim()

const { data: article, error: articleError } = await admin
  .from('wiki_articles')
  .insert({
    slug: SLUG,
    title: 'Agent Harnesses: Operating and Governing Enterprise AI Agents',
    category: 'platform_handbook',
    short_description:
      'How AI agents are operated and governed in KB Sandbox, and the shared vocabulary -- agent, model, workflow, harness -- used across the platform.',
    status: 'draft',
    created_by: owner.id,
  })
  .select('id, slug, status')
  .single()
if (articleError || !article) throw articleError ?? new Error('Failed to create article')

const { data: version, error: versionError } = await admin
  .from('wiki_versions')
  .insert({
    wiki_article_id: article.id,
    version_number: 1,
    quick_help:
      'An agent harness is the operating and governance environment around an AI agent -- identity, context, tools, guardrails, traces, and evidence -- not just the model.',
    content,
    verification_status: 'unverified',
    generated_by: 'human',
    created_by: owner.id,
  })
  .select('id')
  .single()
if (versionError || !version) throw versionError ?? new Error('Failed to create version')

console.log(`Created article ${article.id} (slug: ${article.slug}, status: ${article.status}) with version ${version.id}`)
console.log('Review and approve it through the admin Wiki queue when ready.')
