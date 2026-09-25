import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as methods-rls.test.ts and
// every other *-rls.test.ts in this repo. No live database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260928100001_workstream_knowledge_bases.sql'), 'utf-8')

describe('workstream_knowledge_bases RLS', () => {
  it('select uses is_project_member_strict (no admin bypass), matching project_knowledge_bases\' own hardened shape', () => {
    const start = sql.indexOf('"workstream_knowledge_bases_select_member"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/is_project_member_strict\(w\.project_id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/is_project_member\(/)
  })

  it('insert and delete are separate curator-gated policies, not a single FOR ALL (no incidental SELECT leak)', () => {
    expect(sql).toMatch(/create policy "workstream_knowledge_bases_insert_curator" on workstream_knowledge_bases\s+for insert/)
    expect(sql).toMatch(/create policy "workstream_knowledge_bases_delete_curator" on workstream_knowledge_bases\s+for delete/)
    expect(sql).not.toMatch(/for all using/)
  })

  it('insert/delete both join through project_workstreams with can_curate_project, no denormalized project_id column', () => {
    const insertStart = sql.indexOf('"workstream_knowledge_bases_insert_curator"')
    const insertSection = sql.slice(insertStart, insertStart + 300)
    expect(insertSection).toMatch(/can_curate_project\(w\.project_id, auth\.uid\(\)\)/)
    expect(sql).not.toMatch(/workstream_knowledge_bases\.project_id/)
  })

  it('has no update policy -- only ever inserted or deleted, never updated in place', () => {
    expect(sql).not.toMatch(/for update/)
  })
})

describe('workstream_knowledge_bases schema', () => {
  it('mirrors project_knowledge_bases\' own shape: text FK to knowledge_bases, unique (workstream_id, knowledge_base_id)', () => {
    expect(sql).toMatch(/knowledge_base_id text not null references knowledge_bases\(id\) on delete cascade/)
    expect(sql).toMatch(/unique \(workstream_id, knowledge_base_id\)/)
  })

  it('reuses is_project_member_strict/can_curate_project by name, never redefines them', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member_strict\(/)
    expect(sql).not.toMatch(/create or replace function can_curate_project\(/)
  })
})
