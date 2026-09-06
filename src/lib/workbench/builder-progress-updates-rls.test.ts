import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the migration directly -- same approach as every
// other *-rls.test.ts file in this repo (e.g. workstream-promotions-rls.test.ts).
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const sql = read('supabase/migrations/20260906120001_builder_progress_updates_schema.sql')

describe('builder_progress_updates schema', () => {
  it('constrains confidence and status to the documented value sets', () => {
    expect(sql).toMatch(/confidence text not null check \(confidence in \('on_track', 'at_risk', 'blocked'\)\)/)
    expect(sql).toMatch(/status text not null default 'active' check \(status in \('active', 'withdrawn'\)\)/)
  })

  it('is one row per workstream, not a history table', () => {
    expect(sql).toMatch(/unique \(workstream_id\)/)
  })

  it('enables row level security', () => {
    expect(sql).toMatch(/alter table builder_progress_updates enable row level security/)
  })
})

describe('builder_progress_updates RLS', () => {
  it('restricts insert to the workstream\'s own Project owner, as themselves', () => {
    const start = sql.indexOf('"builder_progress_updates_insert_owner"')
    const section = sql.slice(start, start + 350)
    expect(section).toMatch(/submitted_by = auth\.uid\(\)/)
    expect(section).toMatch(/can_manage_project\(w\.project_id, auth\.uid\(\)\)/)
  })

  it('restricts update to the workstream\'s own Project owner', () => {
    const start = sql.indexOf('"builder_progress_updates_update_owner"')
    const section = sql.slice(start, start + 350)
    expect(section).toMatch(/can_manage_project\(w\.project_id, auth\.uid\(\)\)/)
  })

  it('lets the submitter see their own update, and lets any platform curator/admin see it too -- a consent-based exception, not a leak', () => {
    const start = sql.indexOf('"builder_progress_updates_select_own_or_operator"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/submitted_by = auth\.uid\(\)/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })
})
