import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions for the corrective migration -- same pattern
// as src/lib/graph/graph-runtime-rls.test.ts's fix-migration coverage. The
// original 20260810130001_public_visibility.sql is untouched and its own
// tests (public-visibility-rls.test.ts) still read that file unmodified.
const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260812100001_public_wiki_kb_scoping_fix.sql'),
  'utf-8'
)

describe('is_public_wiki_article() -- adds the platform/global-knowledge check', () => {
  it('still requires approved + is_public', () => {
    const start = sql.indexOf('function is_public_wiki_article')
    const section = sql.slice(start, start + 600)
    expect(section).toMatch(/a\.status = 'approved'/)
    expect(section).toMatch(/a\.is_public = true/)
  })

  it('additionally requires the article have no knowledge_base_id, or one belonging to a global (non-project) KB', () => {
    const start = sql.indexOf('function is_public_wiki_article')
    const section = sql.slice(start, start + 600)
    expect(section).toMatch(/a\.knowledge_base_id is null/)
    expect(section).toMatch(/kb\.id = a\.knowledge_base_id and kb\.project_id is null/)
  })
})

describe('wiki_articles_select_public -- delegates to the helper instead of duplicating the condition', () => {
  it('drops and recreates the policy to call is_public_wiki_article(id)', () => {
    expect(sql).toMatch(/drop policy "wiki_articles_select_public" on wiki_articles/)
    const start = sql.indexOf('create policy "wiki_articles_select_public"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/for select using \(is_public_wiki_article\(id\)\)/)
  })
})
