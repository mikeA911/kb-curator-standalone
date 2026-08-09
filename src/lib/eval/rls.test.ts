import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the policy file directly -- same approach as
// src/lib/wiki/rls.test.ts. Two guarantees matter here: (1) every eval table
// is gated to curator/admin, not any authenticated user, and (2) an active
// dataset's cases genuinely cannot be mutated -- enforced by RLS, not by
// convention in the Server Actions layer.
const rlsSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260809110004_eval_rls.sql'), 'utf-8')

describe('Evaluation RLS policy file', () => {
  it('enables row level security on every eval table', () => {
    for (const table of ['eval_datasets', 'eval_cases', 'eval_runs', 'eval_results']) {
      expect(rlsSql).toMatch(new RegExp(`alter table ${table} enable row level security`))
    }
  })

  it('gates every eval table to curator/admin, not any authenticated user', () => {
    const markers = ['-- eval_datasets ', '-- eval_cases ', '-- eval_runs ', '-- eval_results ']
    const sections = markers.map((marker, i) => {
      const start = rlsSql.indexOf(marker)
      expect(start).toBeGreaterThan(-1)
      const end = i + 1 < markers.length ? rlsSql.indexOf(markers[i + 1]) : rlsSql.length
      return rlsSql.slice(start, end)
    })
    for (const section of sections) {
      expect(section).toMatch(/for select using \(is_curator_or_admin\(auth\.uid\(\)\)\)/)
      expect(section).toMatch(/for insert with check \(\s*is_curator_or_admin\(auth\.uid\(\)\)/)
    }
  })

  it('blocks inserting a case into a dataset that is not draft', () => {
    const section = rlsSql.slice(rlsSql.indexOf('eval_cases_insert_staff_draft_only'), rlsSql.indexOf('eval_cases_update_staff_draft_only'))
    expect(section).toMatch(/d\.status = 'draft'/)
  })

  it('blocks updating or deleting a case once the dataset leaves draft', () => {
    const updateSection = rlsSql.slice(rlsSql.indexOf('eval_cases_update_staff_draft_only'), rlsSql.indexOf('eval_cases_delete_staff_draft_only'))
    const deleteSection = rlsSql.slice(rlsSql.indexOf('eval_cases_delete_staff_draft_only'), rlsSql.indexOf('-- eval_runs'))
    expect(updateSection).toMatch(/d\.status = 'draft'/)
    expect(deleteSection).toMatch(/d\.status = 'draft'/)
  })
})
