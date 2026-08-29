// Seed script for the "KB Sandbox Vocabulary" Handbook article, per Mike's
// request 2026-08-28 (attached About.docx / "KBS vocabulary.docx"). Mirrors
// scripts/seed-mcp-architecture-handbook-article.mjs's approach, with one
// difference: is_public is set true on insert, since the public
// (public)/about page links to it for anonymous visitors -- most Handbook
// articles default to platform-only (is_public false), but a glossary has
// nothing sensitive in it and is meant to be a shareable reference.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const SLUG = 'kb-sandbox-vocabulary'

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
const sourcePath = path.join(scriptDir, '..', 'docs', 'workbench-handbook-kb-sandbox-vocabulary.md')
const raw = readFileSync(sourcePath, 'utf8')

const splitIndex = raw.indexOf('## What it is')
if (splitIndex === -1) throw new Error(`Could not find "## What it is" in ${sourcePath}`)
const content = raw.slice(splitIndex).trim()

const { data: article, error: articleError } = await admin
  .from('wiki_articles')
  .insert({
    slug: SLUG,
    title: 'KB Sandbox Vocabulary',
    category: 'platform_handbook',
    short_description:
      'Canonical definitions for the terms KB Sandbox uses -- Organization, Project, Workstream, Method, Agent, External Agent, Wiki, Ember, and more -- so everyone means the same thing by the same word.',
    status: 'draft',
    is_public: true,
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
    quick_help: 'The canonical KB Sandbox glossary -- Organization, Project, Workstream, Method, Agent, External Agent, Ember, and the rest, defined once so everyone uses the same words consistently.',
    content,
    verification_status: 'unverified',
    generated_by: 'human',
    created_by: owner.id,
  })
  .select('id')
  .single()
if (versionError || !version) throw versionError ?? new Error('Failed to create version')

console.log(`Created article ${article.id} (slug: ${article.slug}, status: ${article.status}, is_public: true) with version ${version.id}`)
console.log('Review and approve it through the admin Wiki queue when ready.')
