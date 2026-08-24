// One-off seed script for the MCP Architecture Workbench Handbook article,
// mirroring scripts/seed-agent-harnesses-handbook-article.mjs exactly. Reads
// the article body straight from docs/workbench-handbook-mcp-architecture.md
// at run time (stripping only its top proposal meta-block, which is
// instructions for this delivery, not article content) rather than
// duplicating that content here, so the two can never drift apart.
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

const SLUG = 'mcp-architecture-evidence-led-development'

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
const sourcePath = path.join(scriptDir, '..', 'docs', 'workbench-handbook-mcp-architecture.md')
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
    title: 'MCP Architecture: Evidence-Led Development for an Existing Application',
    category: 'platform_handbook',
    short_description:
      'How to design an MCP server for an existing application without assuming its OpenAPI specification represents the whole business system -- capability discovery, exposure classification, and phased delivery.',
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
      'OpenAPI describes the callable surface; capability discovery describes the business system. Start from intent, build a Business Capability Register from evidence beyond the API spec, classify each capability into one of eight permitted agency levels, and deliver incrementally starting with read-only access.',
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
