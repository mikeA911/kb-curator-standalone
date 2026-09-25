import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as every other *-rls.test.ts
// in this repo (e.g. workstream-rls.test.ts). No live database in this suite.
const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260925100001_project_objects_and_workstream_structure.sql'),
  'utf-8'
)

describe('project_objects RLS', () => {
  it('select is scoped to project members', () => {
    const start = sql.indexOf('"project_objects_select_member"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(is_project_member\(project_id, auth\.uid\(\)\)\)/)
  })

  it('manage uses can_curate_project, not can_manage_project -- same bar as project_workstreams itself', () => {
    const start = sql.indexOf('"project_objects_manage_curator"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/can_manage_project/)
  })
})

describe('workstream_object_links RLS -- child of workstream via subquery, no denormalized project_id', () => {
  it('select follows the parent workstream to project membership via join', () => {
    const start = sql.indexOf('"workstream_object_links_select_member"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/from project_workstreams w/)
    expect(section).toMatch(/is_project_member\(w\.project_id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/workstream_object_links\.project_id/)
  })

  it('manage uses can_curate_project via the same subquery shape', () => {
    const start = sql.indexOf('"workstream_object_links_manage_curator"')
    const section = sql.slice(start, start + 500)
    expect(section).toMatch(/can_curate_project\(w\.project_id, auth\.uid\(\)\)/)
  })

  it('access_modes is constrained to reads/writes/creates', () => {
    expect(sql).toMatch(/access_modes <@ array\['reads', 'writes', 'creates'\]::text\[\]/)
  })

  it('a link\'s workstream and object are validated to belong to the same project (trigger, not just RLS)', () => {
    expect(sql).toMatch(/create trigger workstream_object_links_validate_project_match/)
    expect(sql).toMatch(/workstream_object_links: workstream and object must belong to the same project/)
  })
})

describe('workstream_flow RLS -- DAG, both sides checked on insert', () => {
  it('select checks only the upstream side (the trigger already guarantees both sides share a project)', () => {
    const start = sql.indexOf('"workstream_flow_select_member"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/upstream_workstream_id and is_project_member/)
  })

  it('manage\'s with check verifies BOTH upstream and downstream sides -- a caller can\'t wire in a workstream from a project they can\'t curate', () => {
    const start = sql.indexOf('"workstream_flow_manage_curator"')
    const section = sql.slice(start, start + 800)
    expect(section).toMatch(/upstream_workstream_id and can_curate_project/)
    expect(section).toMatch(/downstream_workstream_id and can_curate_project/)
  })

  it('rejects a self-loop and enforces uniqueness on the edge pair', () => {
    expect(sql).toMatch(/constraint workstream_flow_no_self_loop check \(upstream_workstream_id != downstream_workstream_id\)/)
    expect(sql).toMatch(/unique \(upstream_workstream_id, downstream_workstream_id\)/)
  })

  it('has a recursive-CTE cycle guard, distinct from the simple parent-walk triggers on the tree tables', () => {
    const start = sql.indexOf('prevent_workstream_flow_cycle')
    const section = sql.slice(start, start + 800)
    expect(section).toMatch(/with recursive downstream_closure/)
  })
})

describe('cycle-guard triggers exist on every self-referencing table', () => {
  it('project_workstreams.parent_workstream_id', () => {
    expect(sql).toMatch(/create trigger project_workstreams_prevent_cycle before insert or update of parent_workstream_id on project_workstreams/)
  })
  it('project_objects.parent_object_id', () => {
    expect(sql).toMatch(/create trigger project_objects_prevent_cycle before insert or update of parent_object_id on project_objects/)
  })
  it('workstream_flow (the DAG cycle guard)', () => {
    expect(sql).toMatch(/create trigger workstream_flow_prevent_cycle before insert on workstream_flow/)
  })
})

describe('regression: no existing policy dropped, helpers reused by name', () => {
  it('never drops a project_workstreams, workstream_artifacts, eval_datasets, or project_members policy', () => {
    for (const policy of [
      'project_workstreams_select_member',
      'project_workstreams_manage_curator',
      'workstream_artifacts_select_member',
      'workstream_artifacts_insert_consultant',
      'eval_datasets_manage_project_curator',
      'project_members_manage_owner',
    ]) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })

  it('reuses is_project_member/can_curate_project by name, never redefines them', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member\(/)
    expect(sql).not.toMatch(/create or replace function can_curate_project\(/)
  })

  it('extends project_workstreams and eval_runs additively (alter table add column), no existing column touched', () => {
    expect(sql).toMatch(/alter table project_workstreams\s+add column parent_workstream_id/)
    expect(sql).toMatch(/alter table eval_runs add column workstream_id/)
    expect(sql).not.toMatch(/alter table project_workstreams[\s\S]*?drop column/)
  })
})
