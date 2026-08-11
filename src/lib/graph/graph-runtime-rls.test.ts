import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as every other *.rls.test.ts
// in this repo (e.g. src/lib/projects/membership-rls.test.ts). No live
// database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260811100001_graph_runtime.sql'), 'utf-8')
const updateFixSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260811100002_fix_graph_runs_update_rls.sql'), 'utf-8')
const eval3RlsSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260809110004_eval_rls.sql'), 'utf-8')
const membershipSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260810120001_project_members.sql'), 'utf-8')

describe('graph_versions immutability', () => {
  it('has no UPDATE policy at all -- the absence of one is the immutability enforcement, same mechanism as wiki_versions', () => {
    expect(sql).not.toMatch(/for update/i)
  })

  it('activation is modeled as graphs.active_version_id, never a graph_versions row edit', () => {
    expect(sql).toMatch(/active_version_id uuid/)
    expect(sql).toMatch(/graphs_active_version_id_fkey/)
  })
})

describe('graphs / graph_versions two-tier RLS (mirrors kb_select_global_or_member / kb_manage_project_curator)', () => {
  it('select is global-or-member', () => {
    const start = sql.indexOf('"graphs_select_global_or_member"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(project_id is null or is_project_member\(project_id, auth\.uid\(\)\)\)/)
  })

  it('manage is split: platform staff for global graphs, project owner (not just curator) for project-scoped graphs', () => {
    const staffStart = sql.indexOf('"graphs_manage_staff"')
    expect(sql.slice(staffStart, staffStart + 250)).toMatch(/project_id is null and is_curator_or_admin\(auth\.uid\(\)\)/)

    const ownerStart = sql.indexOf('"graphs_manage_project_owner"')
    const ownerSection = sql.slice(ownerStart, ownerStart + 250)
    expect(ownerSection).toMatch(/project_id is not null and can_manage_project\(project_id, auth\.uid\(\)\)/)
    // Explicitly owner-gated (can_manage_project), not curator-gated
    // (can_curate_project) -- the design brief is specific: "Only admin/
    // project owner ... should change active configurations."
    expect(ownerSection).not.toMatch(/can_curate_project/)
  })
})

describe('graph_runs / graph_steps -- mirrors eval_runs staff-unscoped + consultant project-or-global-active shape', () => {
  it('graph_runs has an unscoped staff select policy and a consultant policy scoped by project membership', () => {
    expect(sql).toMatch(/"graph_runs_select_staff" on graph_runs\s+for select using \(is_curator_or_admin\(auth\.uid\(\)\)\)/)
    const start = sql.indexOf('"graph_runs_select_consultant"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/project_id is null or is_project_member\(project_id, auth\.uid\(\)\)/)
  })

  it('graph_runs insert for consultants requires can_run_project_evals for project-scoped runs (excludes viewer, matches eval_runs precedent)', () => {
    const start = sql.indexOf('"graph_runs_insert_consultant"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/project_id is null or can_run_project_evals\(project_id, auth\.uid\(\)\)/)
  })

  it('graph_steps visibility follows its parent graph_run via a join, not a direct project_id column', () => {
    const start = sql.indexOf('"graph_steps_select_consultant"')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/from graph_runs r/)
    expect(section).toMatch(/r\.id = graph_steps\.graph_run_id/)
  })
})

describe('graph_runs_update RLS fix (20260811100002) -- live-verified regression: runs were stuck at status=running without this', () => {
  it('the original migration has no UPDATE policy on graph_runs at all -- confirms the bug existed', () => {
    expect(sql).not.toMatch(/graph_runs_update/)
  })

  it('the fix adds staff (unrestricted) and consultant (own-run-only) update policies, mirroring eval_runs_update_staff / eval_runs_update_own_consultant', () => {
    expect(updateFixSql).toMatch(/"graph_runs_update_staff" on graph_runs\s+for update using \(is_curator_or_admin\(auth\.uid\(\)\)\)/)
    const start = updateFixSql.indexOf('"graph_runs_update_own_consultant"')
    const section = updateFixSql.slice(start, start + 400)
    expect(section).toMatch(/created_by = auth\.uid\(\)/)
    expect(section).toMatch(/p\.role = 'consultant' and p\.is_active/)
  })
})

describe('ai_operation_logs / eval_results linkage', () => {
  it('adds graph_run_id and graph_step_id to ai_operation_logs, mirroring the exact eval_run_id/eval_case_id pattern', () => {
    expect(sql).toMatch(/alter table ai_operation_logs add column if not exists graph_run_id uuid references graph_runs\(id\) on delete set null;/)
    expect(sql).toMatch(/alter table ai_operation_logs add column if not exists graph_step_id uuid references graph_steps\(id\) on delete set null;/)
  })

  it('adds graph_run_id and iteration_count to eval_results so a graph-mode result carries its trace link and retry count', () => {
    expect(sql).toMatch(/alter table eval_results add column if not exists graph_run_id uuid references graph_runs\(id\) on delete set null;/)
    expect(sql).toMatch(/alter table eval_results add column if not exists iteration_count integer;/)
  })
})

describe('RAG Retry seed', () => {
  it('seeds a platform-global (project_id null), active graph with a v1 definition including maxIterations', () => {
    const start = sql.indexOf("insert into graphs")
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/'rag-retry'/)
    expect(section).toMatch(/'rag_retry'/)
    expect(section).toMatch(/'active'/)

    const versionStart = sql.indexOf('insert into graph_versions')
    const versionSection = sql.slice(versionStart, versionStart + 900)
    expect(versionSection).toMatch(/'maxIterations', 2/)
  })

  it('activates the seeded v1 version via graphs.active_version_id, not graph_versions.activated_at alone', () => {
    expect(sql).toMatch(/update graphs set active_version_id = \(/)
  })
})

describe('regression: no Milestone 3/3.6 policy was dropped or narrowed by this migration', () => {
  it('this migration never drops an eval_* or project_members policy', () => {
    for (const policy of [
      'eval_datasets_select_staff',
      'eval_runs_select_staff',
      'eval_results_select_staff',
      'project_members_manage_owner',
      'project_members_select_member',
    ]) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })

  it('the M3 eval_runs staff policy is still unscoped (is_curator_or_admin, no project_id condition), confirming graph_runs mirrors an untouched precedent', () => {
    const start = eval3RlsSql.indexOf('eval_runs_select_staff')
    const section = eval3RlsSql.slice(start, start + 150)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })

  it('the M3.6 project-scoping helper functions are reused by name, not redefined in this migration', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member/)
    expect(sql).not.toMatch(/create or replace function can_manage_project/)
    expect(membershipSql).toMatch(/function is_project_member/)
    expect(membershipSql).toMatch(/function can_manage_project/)
  })
})
