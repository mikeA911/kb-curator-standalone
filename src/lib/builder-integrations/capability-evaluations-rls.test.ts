import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the migration directly -- same approach as every
// other *.rls.test.ts file in this repo.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const sql = read('supabase/migrations/20260906110001_capability_evaluations_schema.sql')

describe('capability_evaluations schema', () => {
  it('constrains template_id to the documented six templates', () => {
    expect(sql).toMatch(/'scope_evidence', 'functional_contract', 'identity_permissions',/)
    expect(sql).toMatch(/'human_decision', 'customer_acceptance', 'production_readiness'/)
  })

  it('constrains status to draft/ready_for_review plus the four terminal decisions', () => {
    expect(sql).toMatch(/check \(status in \('draft', 'ready_for_review', 'pass', 'conditional_pass', 'fail', 'not_applicable'\)\)/)
  })

  it('is unique per (version, template) -- one evidence row per template per version', () => {
    expect(sql).toMatch(/unique \(builder_integration_version_id, template_id\)/)
  })

  it('enables row level security', () => {
    expect(sql).toMatch(/alter table capability_evaluations enable row level security/)
  })
})

describe('capability_evaluations RLS', () => {
  it('select is any authenticated non-anonymous user, same bar as builder_integration_versions', () => {
    const start = sql.indexOf('"capability_evaluations_select_authenticated"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/p\.role <> 'anonymous' and p\.is_active/)
  })

  it('insert requires the caller to be the parent integration\'s registering builder or staff', () => {
    const start = sql.indexOf('"capability_evaluations_insert_owner_or_staff"')
    const section = sql.slice(start, start + 500)
    expect(section).toMatch(/created_by = auth\.uid\(\)/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
    expect(section).toMatch(/bi\.created_by = auth\.uid\(\)/)
  })

  // Acceptance-criteria-critical: Postgres RLS has no column-level
  // enforcement, so the owner's own update policy's WITH CHECK must itself
  // exclude the four terminal decision values -- otherwise a raw API call
  // (bypassing the service layer's own convention) could let a Builder
  // self-decide their own evaluation.
  it('the owner-evidence update policy\'s WITH CHECK restricts status to draft/ready_for_review only -- never a terminal decision', () => {
    const start = sql.indexOf('"capability_evaluations_update_owner_evidence"')
    const section = sql.slice(start, start + 700)
    expect(section).toMatch(/with check \(\s*status in \('draft', 'ready_for_review'\)/)
  })

  it('gates the terminal decision fields on is_curator_or_admin, matching updateCertificationStatus\'s own bar', () => {
    const start = sql.indexOf('"capability_evaluations_decide_staff"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/using \(is_curator_or_admin\(auth\.uid\(\)\)\)/)
    expect(section).toMatch(/with check \(is_curator_or_admin\(auth\.uid\(\)\)\)/)
  })
})
