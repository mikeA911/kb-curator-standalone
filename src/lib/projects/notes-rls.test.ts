import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as workstream-rls.test.ts and
// src/lib/trending-rls.test.ts. No live database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260814120001_project_notes.sql'), 'utf-8')

describe('can_view_project_note helper', () => {
  it('requires project membership before any recipient branch is even considered', () => {
    const start = sql.indexOf('create or replace function can_view_project_note')
    const section = sql.slice(start, start + 900)
    expect(section).toMatch(/is_project_member\(n\.project_id, uid\)/)
  })

  it('covers every recipient_type branch: project_team, author, addressed user, curator, admin, plus curator/owner oversight', () => {
    const start = sql.indexOf('create or replace function can_view_project_note')
    const section = sql.slice(start, start + 900)
    expect(section).toMatch(/n\.recipient_type = 'project_team'/)
    expect(section).toMatch(/n\.author_id = uid/)
    expect(section).toMatch(/n\.recipient_type = 'user' and n\.recipient_user_id = uid/)
    expect(section).toMatch(/n\.recipient_type = 'curator' and can_curate_project\(n\.project_id, uid\)/)
    expect(section).toMatch(/n\.recipient_type = 'admin' and is_admin\(uid\)/)
    expect(section).toMatch(/can_curate_project\(n\.project_id, uid\) -- curator\/owner oversight/)
  })
})

describe('project_notes RLS', () => {
  it('select calls can_view_project_note rather than duplicating the OR-chain', () => {
    const start = sql.indexOf('"project_notes_select_visible"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(can_view_project_note\(id, auth\.uid\(\)\)\)/)
  })

  it('has a subquery-free author policy alongside can_view_project_note -- INSERT...RETURNING cannot see a row through a same-table subquery mid-statement', () => {
    const start = sql.indexOf('"project_notes_select_own"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(author_id = auth\.uid\(\)\)/)
  })

  it('insert requires author_id to match the caller, project membership, and -- when addressed to a specific user -- that user to also be a member', () => {
    const start = sql.indexOf('"project_notes_insert_member"')
    const section = sql.slice(start, start + 350)
    expect(section).toMatch(/author_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member\(project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/recipient_type != 'user' or is_project_member\(project_id, recipient_user_id\)/)
  })

  it('resolve is allowed for author, the addressed recipient, or a curator/admin -- not just the author', () => {
    const start = sql.indexOf('"project_notes_resolve"')
    const section = sql.slice(start, start + 700)
    expect(section).toMatch(/author_id = auth\.uid\(\)/)
    expect(section).toMatch(/recipient_type = 'user' and recipient_user_id = auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/is_admin\(auth\.uid\(\)\)/)
  })
})

describe('project_note_replies RLS', () => {
  it('select and insert both call can_view_project_note against the parent note, not a duplicated column', () => {
    const selectStart = sql.indexOf('"project_note_replies_select_visible"')
    const selectSection = sql.slice(selectStart, selectStart + 150)
    expect(selectSection).toMatch(/can_view_project_note\(note_id, auth\.uid\(\)\)/)

    const insertStart = sql.indexOf('"project_note_replies_insert_member"')
    const insertSection = sql.slice(insertStart, insertStart + 200)
    expect(insertSection).toMatch(/author_id = auth\.uid\(\)/)
    expect(insertSection).toMatch(/can_view_project_note\(note_id, auth\.uid\(\)\)/)
  })
})

describe('regression: helpers reused by name, no existing policy dropped', () => {
  it('never redefines is_project_member/can_curate_project/is_admin', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member/)
    expect(sql).not.toMatch(/create or replace function can_curate_project/)
    expect(sql).not.toMatch(/create or replace function is_admin\(/)
  })

  it('never drops an existing project/trending/wiki policy', () => {
    for (const policy of ['project_workstreams_manage_curator', 'trending_items_manage_curator', 'wiki_articles_manage_curator']) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })
})
