import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as every other *-rls.test.ts
// in this repo. No live database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260930100001_workstream_presentations.sql'), 'utf-8')

describe('presentation_slide_comments RLS -- the real one-reply enforcement', () => {
  it("the reply policy's USING clause requires builder_reply is null, so a second reply attempt matches zero rows", () => {
    const start = sql.indexOf('"presentation_slide_comments_reply_curator"')
    const section = sql.slice(start, start + 500)
    expect(section).toMatch(/using \(\s*builder_reply is null/)
    expect(section).toMatch(/with check \(builder_reply is not null\)/)
  })

  it('select/insert policies join through presentation_versions -> presentations -> project_workstreams, no denormalized project_id shortcut', () => {
    const start = sql.indexOf('"presentation_slide_comments_select_member"')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/from presentation_versions v join presentations p on p\.id = v\.presentation_id/)
    expect(section).toMatch(/join project_workstreams w on w\.id = p\.workstream_id/)
    expect(sql).not.toMatch(/presentation_slide_comments\.project_id/)
  })

  it('insert requires author_id = self', () => {
    const start = sql.indexOf('"presentation_slide_comments_insert_member"')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/author_id = auth\.uid\(\)/)
  })
})

describe('presentation_versions RLS -- immutable once written', () => {
  it('has select and insert policies but no update or delete policy at all', () => {
    expect(sql).toMatch(/create policy "presentation_versions_select_member"/)
    expect(sql).toMatch(/create policy "presentation_versions_insert_curator"/)
    expect(sql).not.toMatch(/create policy "presentation_versions_update/)
    expect(sql).not.toMatch(/create policy "presentation_versions_delete/)
  })
})

describe('presentation_status_history RLS -- written only via the admin client', () => {
  it('has a select policy but no insert policy at all', () => {
    expect(sql).toMatch(/create policy "presentation_status_history_select_member"/)
    expect(sql).not.toMatch(/create policy "presentation_status_history_insert/)
  })
})

describe('presentations RLS', () => {
  it('select is scoped through project_workstreams to any project member', () => {
    const start = sql.indexOf('"presentations_select_member"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/is_project_member\(w\.project_id, auth\.uid\(\)\)/)
  })

  it('insert/update are curator-gated via can_curate_project, not can_manage_project', () => {
    const insertStart = sql.indexOf('"presentations_insert_curator"')
    const insertSection = sql.slice(insertStart, insertStart + 300)
    expect(insertSection).toMatch(/can_curate_project\(w\.project_id, auth\.uid\(\)\)/)
    const updateStart = sql.indexOf('"presentations_update_curator"')
    const updateSection = sql.slice(updateStart, updateStart + 400)
    expect(updateSection).toMatch(/can_curate_project\(w\.project_id, auth\.uid\(\)\)/)
    expect(updateSection).not.toMatch(/can_manage_project/)
  })
})

describe('presentation_actions RLS', () => {
  it('update allows the action\'s own owner or a curator, not any project member', () => {
    const start = sql.indexOf('"presentation_actions_update_owner_or_curator"')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/owner_id = auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(w\.project_id, auth\.uid\(\)\)/)
  })
})

describe('regression: reuses existing helper functions by name, never redefines them', () => {
  it('never redefines is_project_member/can_curate_project', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member\(/)
    expect(sql).not.toMatch(/create or replace function can_curate_project\(/)
  })
})
