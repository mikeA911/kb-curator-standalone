import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the migration directly -- same approach as every
// other *.rls.test.ts file in this repo.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const sql = read('supabase/migrations/20260904100001_project_source_submissions.sql')

describe('project_source_submissions schema', () => {
  it('constrains source_kind and status to the documented value sets', () => {
    expect(sql).toMatch(/source_kind text not null check \(source_kind in \('file', 'artifact'\)\)/)
    expect(sql).toMatch(/status text not null default 'pending' check \(status in \('pending', 'approved', 'rejected'\)\)/)
  })

  it('requires workstream_artifact_id exactly for artifact-kind submissions, never for file-kind', () => {
    expect(sql).toMatch(/source_kind = 'file' and workstream_artifact_id is null/)
    expect(sql).toMatch(/source_kind = 'artifact' and workstream_artifact_id is not null/)
  })
})

describe('project_source_submissions RLS', () => {
  it('enables row level security', () => {
    expect(sql).toMatch(/alter table project_source_submissions enable row level security/)
  })

  it('lets any active project member submit, but only as themselves', () => {
    const start = sql.indexOf('"project_source_submissions_insert_member"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/submitted_by = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member\(project_id, auth\.uid\(\)\)/)
  })

  it('lets the submitter see their own submissions, and the project curator/owner/admin see all of them', () => {
    const start = sql.indexOf('"project_source_submissions_select_own_or_curator"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/submitted_by = auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
  })

  it('gates deciding a submission on can_curate_project (owner-or-curator), not can_manage_project (owner-only)', () => {
    const start = sql.indexOf('"project_source_submissions_decide_curator"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/using \(can_curate_project\(project_id, auth\.uid\(\)\)\)/)
    expect(section).toMatch(/with check \(can_curate_project\(project_id, auth\.uid\(\)\)\)/)
    expect(section).not.toMatch(/can_manage_project/)
  })
})
