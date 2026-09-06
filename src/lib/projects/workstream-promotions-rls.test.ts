import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the migration directly -- same approach as every
// other *.rls.test.ts file in this repo (e.g. source-submissions-rls.test.ts).
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const sql = read('supabase/migrations/20260906100001_workstream_promotions_schema.sql')
// 20260906100002 fully supersedes all three of the original migration's own
// RLS policies (generalizing beyond Builder mode -- see its own top
// comment), so it, not the original file, is this suite's source of truth
// for every policy below.
const generalizedSql = read('supabase/migrations/20260906100002_workstream_promotions_generalize.sql')

describe('workstream_promotions schema', () => {
  it('constrains status to the documented value set', () => {
    expect(sql).toMatch(/status text not null default 'pending' check \(status in \('pending', 'approved', 'rejected'\)\)/)
  })

  it('enables row level security', () => {
    expect(sql).toMatch(/alter table workstream_promotions enable row level security/)
  })
})

describe('workstream_promotions RLS (generalized beyond Builder mode, 20260906100002)', () => {
  it('lets any active member of the workstream\'s Project submit, as themselves -- not owner-only', () => {
    const start = generalizedSql.indexOf('"workstream_promotions_insert_member"')
    const section = generalizedSql.slice(start, start + 350)
    expect(section).toMatch(/submitted_by = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member\(w\.project_id, auth\.uid\(\)\)/)
  })

  it('lets the submitter see their own promotions, and that Project\'s own curator (owner/curator/admin) see every promotion for their Project', () => {
    const start = generalizedSql.indexOf('"workstream_promotions_select_own_or_curator"')
    const section = generalizedSql.slice(start, start + 300)
    expect(section).toMatch(/submitted_by = auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(w\.project_id, auth\.uid\(\)\)/)
  })

  // Acceptance-criteria-critical regression guard: removing EITHER condition
  // reopens a self-approval hole -- can_curate_project alone would let a
  // Builder (the owner of their own Project) approve their own promotion;
  // submitted_by != auth.uid() alone would still exclude an ordinary
  // Enterprise team's own curator (see this migration's own top comment for
  // why platform-level is_curator_or_admin was wrong for that case).
  it('gates deciding a promotion on BOTH can_curate_project AND submitted_by != auth.uid() together', () => {
    const start = generalizedSql.indexOf('"workstream_promotions_decide_curator"')
    const section = generalizedSql.slice(start, start + 500)
    expect(section).toMatch(/submitted_by != auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(w\.project_id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/is_curator_or_admin/)
  })
})
