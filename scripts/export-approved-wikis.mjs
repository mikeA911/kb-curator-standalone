// Export the current approved Wiki corpus as one local Markdown handbook.
// Uses the service-role client because this is an owner-operated maintenance
// script, not an application route. The output defaults to docs/commercial,
// which is gitignored, because approved articles may still be project-private.

import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const args = process.argv.slice(2)
const methodsOnly = args.includes('--methods-only')
const requestedOutput = args.find((arg) => !arg.startsWith('--'))
const outputPath = path.resolve(
  requestedOutput ??
    (methodsOnly
      ? 'docs/commercial/exports/KB-Sandbox-Workbench-Methods.md'
      : 'docs/commercial/exports/KB-Sandbox-Approved-Wiki-Handbook.md')
)
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kbsandbox.tech').replace(/\/$/, '')
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

function anchor(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function demoteHeadings(markdown, title) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  let inFence = false
  let removedTitle = false

  return lines
    .filter((line) => {
      if (/^\s*```/.test(line)) inFence = !inFence
      if (!inFence && !removedTitle && line.replace(/^#\s+/, '').trim() === title.trim() && /^#\s+/.test(line)) {
        removedTitle = true
        return false
      }
      return true
    })
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line
      return line.replace(/^(#{1,4})\s+/, (_, hashes) => `${'#'.repeat(Math.min(6, hashes.length + 2))} `)
    })
    .join('\n')
    .trim()
}

const { data: categories, error: categoryError } = await supabase
  .from('wiki_categories')
  .select('id, name, sort_order')
  .order('sort_order')
if (categoryError) throw categoryError

const { data: approvedArticles, error: articleError } = await supabase
  .from('wiki_articles')
  .select('id, title, slug, category, short_description, current_version_id, visibility_scope, is_public, updated_at')
  .eq('status', 'approved')
  .not('current_version_id', 'is', null)
  .order('title')
if (articleError) throw articleError

const articles = methodsOnly
  ? approvedArticles.filter(
      (article) => article.category === 'platform_handbook' && article.title.endsWith('(Workbench Method)')
    )
  : approvedArticles

const versionIds = articles.map((article) => article.current_version_id)
const { data: versions, error: versionError } = await supabase
  .from('wiki_versions')
  .select('id, version_number, content, verification_status, last_verified_at, approved_at')
  .in('id', versionIds)
if (versionError) throw versionError

const versionById = new Map(versions.map((version) => [version.id, version]))
const categoryById = new Map(categories.map((category) => [category.id, category]))
const grouped = new Map()

for (const article of articles) {
  const category = categoryById.get(article.category) ?? {
    id: article.category,
    name: article.category,
    sort_order: Number.MAX_SAFE_INTEGER,
  }
  const existing = grouped.get(category.id) ?? { category, articles: [] }
  existing.articles.push(article)
  grouped.set(category.id, existing)
}

const groups = [...grouped.values()].sort(
  (a, b) => a.category.sort_order - b.category.sort_order || a.category.name.localeCompare(b.category.name)
)
const generatedAt = new Date()
const lines = [
  methodsOnly ? '# KB Sandbox Workbench Methods' : '# KB Sandbox Approved Wiki Handbook',
  '',
  `**Generated:** ${generatedAt.toISOString()}`,
  `**Approved articles:** ${articles.length}`,
  '**Handling:** Local owner export. Approved does not necessarily mean public; retain each article’s visibility boundary.',
  '',
  methodsOnly
    ? 'This file contains the current approved version of every Workbench Method article. Regenerate it after Method approvals or version changes; do not treat an old export as the live source of truth.'
    : 'This file contains the current approved version of each Wiki article. Regenerate it after Wiki approvals or version changes; do not treat an old export as the live source of truth.',
  '',
  '## Contents',
  '',
]

for (const { category, articles: categoryArticles } of groups) {
  lines.push(`- [${category.name}](#${anchor(category.name)}) (${categoryArticles.length})`)
  for (const article of categoryArticles) {
    lines.push(`  - [${article.title}](#${anchor(article.title)})`)
  }
}

for (const { category, articles: categoryArticles } of groups) {
  lines.push('', '---', '', `# ${category.name}`, '')
  for (const article of categoryArticles) {
    const version = versionById.get(article.current_version_id)
    if (!version) continue
    lines.push(
      `## ${article.title}`,
      '',
      article.short_description ? `> ${article.short_description}` : '',
      '',
      `- **Live article:** ${appUrl}/wiki/${article.slug}`,
      `- **Current version:** ${version.version_number}`,
      `- **Visibility:** ${article.visibility_scope}${article.is_public ? ' (anonymous/public enabled)' : ''}`,
      `- **Verification:** ${version.verification_status}${version.last_verified_at ? `; last verified ${version.last_verified_at}` : ''}`,
      `- **Approved:** ${version.approved_at ?? 'approval timestamp unavailable'}`,
      '',
      demoteHeadings(version.content, article.title),
      ''
    )
  }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n')}\n`, 'utf8')

console.log(`Exported ${articles.length} approved Wiki articles to ${outputPath}`)
