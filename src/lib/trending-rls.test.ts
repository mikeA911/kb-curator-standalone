import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as every other *-rls.test.ts
// in this repo (e.g. src/lib/projects/workstream-rls.test.ts). No live
// database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260814110001_trending_knowledge.sql'), 'utf-8')

describe('trending_items RLS', () => {
  it('select allows platform-visibility items to any authenticated user, project items only to members, and public items to anyone', () => {
    const start = sql.indexOf('"trending_items_select_visible"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/visibility = 'platform'/)
    expect(section).toMatch(/visibility = 'project' and is_project_member\(project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/or is_public/)
  })

  it('insert requires submitted_by to match the caller and project membership when project-scoped', () => {
    const start = sql.indexOf('"trending_items_insert_authenticated"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/submitted_by = auth\.uid\(\)/)
    expect(section).toMatch(/project_id is null or is_project_member\(project_id, auth\.uid\(\)\)/)
  })

  it('manage (status/is_public updates) uses can_curate_project for project items, is_curator_or_admin for platform items', () => {
    const start = sql.indexOf('"trending_items_manage_curator"')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })
})

describe('trending_comments RLS', () => {
  it('select and insert both follow the parent item visibility via an exists-subquery, not a duplicated column', () => {
    const selectStart = sql.indexOf('"trending_comments_select_visible"')
    const selectSection = sql.slice(selectStart, selectStart + 350)
    expect(selectSection).toMatch(/from trending_items t/)
    expect(selectSection).toMatch(/t\.visibility = 'platform'/)

    const insertStart = sql.indexOf('"trending_comments_insert_authenticated"')
    const insertSection = sql.slice(insertStart, insertStart + 350)
    expect(insertSection).toMatch(/author_id = auth\.uid\(\)/)
    expect(insertSection).toMatch(/from trending_items t/)
  })
})

describe('trending_wiki_links RLS', () => {
  it('insert allows any consultant+ who can see the item to link -- not curator-only', () => {
    const start = sql.indexOf('"trending_wiki_links_insert_authenticated"')
    const section = sql.slice(start, start + 350)
    expect(section).toMatch(/linked_by = auth\.uid\(\)/)
    expect(section).not.toMatch(/is_curator_or_admin/)
  })

  it('delete allows the linker themself or a curator/admin -- not just the linker', () => {
    const start = sql.indexOf('"trending_wiki_links_delete_own_or_curator"')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/linked_by = auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(t\.project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })
})

describe('wiki_versions provenance column', () => {
  it('adds promoted_from_trending_item_id as a nullable FK, not a required column', () => {
    expect(sql).toMatch(
      /alter table wiki_versions add column if not exists promoted_from_trending_item_id uuid references trending_items\(id\) on delete set null;/
    )
  })
})

describe('regression: helpers reused by name, no existing policy dropped', () => {
  it('never redefines is_project_member/can_curate_project/is_curator_or_admin', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member/)
    expect(sql).not.toMatch(/create or replace function can_curate_project/)
    expect(sql).not.toMatch(/create or replace function is_curator_or_admin/)
  })

  it('never drops an existing project/wiki/eval policy', () => {
    for (const policy of ['project_workstreams_manage_curator', 'wiki_articles_manage_curator', 'eval_datasets_manage_project_curator']) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })
})
