import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as every other *.rls.test.ts
// in this repo (e.g. src/lib/graph/graph-runtime-rls.test.ts). No live
// database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260811100004_project_workstreams.sql'), 'utf-8')

describe('project_workstreams RLS', () => {
  it('select is scoped to project members', () => {
    const start = sql.indexOf('"project_workstreams_select_member"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(is_project_member\(project_id, auth\.uid\(\)\)\)/)
  })

  it('manage uses can_curate_project, not can_manage_project -- curators, not just owners, can define scope and mark deliverables complete', () => {
    const start = sql.indexOf('"project_workstreams_manage_curator"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/can_manage_project/)
  })
})

describe('workstream_artifacts -- insert-only evidence trail', () => {
  it('has no update or delete policy at all', () => {
    const artifactsSection = sql.slice(sql.indexOf('create table workstream_artifacts'), sql.length)
    expect(artifactsSection).not.toMatch(/for update/i)
    expect(artifactsSection).not.toMatch(/for delete/i)
  })

  it('select follows the parent workstream to project membership via join, not a direct project_id column', () => {
    const start = sql.indexOf('"workstream_artifacts_select_member"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/from project_workstreams w/)
    expect(section).toMatch(/is_project_member\(w\.project_id, auth\.uid\(\)\)/)
  })

  it('insert uses can_run_project_evals -- broader than curator, so a consultant can attach their own evidence', () => {
    const start = sql.indexOf('"workstream_artifacts_insert_consultant"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/can_run_project_evals\(w\.project_id, auth\.uid\(\)\)/)
  })

  it('requires at least content or an external_url -- the evidence-required check constraint', () => {
    expect(sql).toMatch(/constraint workstream_artifacts_evidence_required check \(content is not null or external_url is not null\)/)
  })
})

describe('regression: no existing policy dropped, helpers reused by name', () => {
  it('never drops an eval_*, project_members, agents, or graph_* policy', () => {
    for (const policy of [
      'eval_datasets_manage_project_curator',
      'project_members_manage_owner',
      'agents_manage_staff',
      'graph_runs_select_staff',
    ]) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })

  it('reuses is_project_member/can_curate_project/can_run_project_evals by name, never redefines them', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member/)
    expect(sql).not.toMatch(/create or replace function can_curate_project/)
    expect(sql).not.toMatch(/create or replace function can_run_project_evals/)
  })
})
