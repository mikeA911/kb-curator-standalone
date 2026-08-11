import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as every other *.rls.test.ts
// in this repo (e.g. src/lib/graph/graph-runtime-rls.test.ts). No live
// database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260811100003_agent_framework.sql'), 'utf-8')
const graphRuntimeSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260811100001_graph_runtime.sql'), 'utf-8')

describe('agent_templates -- ordinary mutable table, unlike agent_versions', () => {
  it('has an UPDATE policy (agent_templates_manage_staff), unlike the immutable-version tables', () => {
    expect(sql).toMatch(/create policy "agent_templates_manage_staff" on agent_templates\s+for all using \(is_curator_or_admin\(auth\.uid\(\)\)\)/)
  })

  it('select is open to any authenticated, active, non-anonymous session -- same bar as ai_providers/ai_models', () => {
    const start = sql.indexOf('"agent_templates_select_staff_or_consultant"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/p\.role != 'anonymous' and p\.is_active/)
  })

  it('a template has no runs of its own -- default_graph_version_id references an immutable graph_versions snapshot, not graphs.active_version_id', () => {
    expect(sql).toMatch(/default_graph_version_id uuid not null references graph_versions\(id\)/)
  })
})

describe('agents.template_id', () => {
  it('is nullable -- "do not require every agent to have a template"', () => {
    expect(sql).toMatch(/template_id uuid references agent_templates\(id\) on delete set null/)
    expect(sql).not.toMatch(/template_id uuid not null/)
  })
})

describe('agent_versions immutability', () => {
  it('has no UPDATE policy at all -- the absence of one is the immutability enforcement, same mechanism as graph_versions/wiki_versions', () => {
    const versionsSection = sql.slice(sql.indexOf('create table agent_versions'), sql.indexOf('-- Extend graph_runs'))
    expect(versionsSection).not.toMatch(/for update/i)
  })

  it('activation is modeled as agents.active_version_id, never an agent_versions row edit', () => {
    expect(sql).toMatch(/active_version_id uuid/)
    expect(sql).toMatch(/agents_active_version_id_fkey/)
  })
})

describe('agents / agent_versions two-tier RLS (mirrors graphs/graph_versions from 20260811100001)', () => {
  it('select is global-or-member', () => {
    const start = sql.indexOf('"agents_select_global_or_member"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(project_id is null or is_project_member\(project_id, auth\.uid\(\)\)\)/)
  })

  it('manage is split: platform staff for global agents, project owner (not just curator) for project-scoped agents', () => {
    const staffStart = sql.indexOf('"agents_manage_staff"')
    expect(sql.slice(staffStart, staffStart + 250)).toMatch(/project_id is null and is_curator_or_admin\(auth\.uid\(\)\)/)

    const ownerStart = sql.indexOf('"agents_manage_project_owner"')
    const ownerSection = sql.slice(ownerStart, ownerStart + 250)
    expect(ownerSection).toMatch(/project_id is not null and can_manage_project\(project_id, auth\.uid\(\)\)/)
    expect(ownerSection).not.toMatch(/can_curate_project/)
  })
})

describe('graph_runs.agent_id/agent_version_id -- extends the M4 execution spine rather than a parallel agent_runs table', () => {
  it('adds nullable agent_id and agent_version_id columns to graph_runs', () => {
    expect(sql).toMatch(/alter table graph_runs add column if not exists agent_id uuid references agents\(id\) on delete set null;/)
    expect(sql).toMatch(/alter table graph_runs add column if not exists agent_version_id uuid references agent_versions\(id\) on delete set null;/)
  })

  it('no agent_runs table is created', () => {
    expect(sql).not.toMatch(/create table agent_runs/)
  })
})

describe('seed: RAG Answer template + RAG Answer Agent created from it', () => {
  it('seeds a "RAG Answer" template referencing the active rag-retry graph version', () => {
    const start = sql.indexOf('insert into agent_templates')
    const section = sql.slice(start, start + 2100)
    expect(section).toMatch(/'RAG Answer'/)
    expect(section).toMatch(/'rag-answer'/)
    expect(section).toMatch(/'knowledge'/)
    expect(section).toMatch(/gv\.id = g\.active_version_id/)
    expect(section).toMatch(/where g\.slug = 'rag-retry'/)
  })

  it('seeds the RAG Answer Agent with template_id set (not hand-authored independently)', () => {
    const start = sql.indexOf('insert into agents (name, slug, description, agent_type, template_id, project_id, status)')
    expect(start).toBeGreaterThan(-1)
    const section = sql.slice(start, start + 500)
    expect(section).toMatch(/'rag-answer-agent'/)
    expect(section).toMatch(/from agent_templates t where t\.slug = 'rag-answer'/)
  })

  it('the v1 agent_versions row copies the template defaults verbatim (t.default_*), not independently authored values', () => {
    const start = sql.indexOf('insert into agent_versions')
    const section = sql.slice(start, start + 900)
    expect(section).toMatch(/t\.default_purpose/)
    expect(section).toMatch(/t\.default_instructions/)
    expect(section).toMatch(/t\.default_graph_version_id/)
    expect(section).toMatch(/t\.default_generation_provider_id, t\.default_generation_model_id/)
    expect(section).toMatch(/join agent_templates t on t\.id = a\.template_id/)
  })

  it('activates the seeded v1 version via agents.active_version_id, not agent_versions.activated_at alone', () => {
    expect(sql).toMatch(/update agents set active_version_id = \(/)
  })
})

describe('regression: no Milestone 3/4 policy was dropped or narrowed by this migration', () => {
  it('this migration never drops an eval_*, graph_*, or project_members policy', () => {
    for (const policy of [
      'eval_datasets_select_staff',
      'graphs_select_global_or_member',
      'graphs_manage_staff',
      'graph_runs_select_staff',
      'project_members_manage_owner',
    ]) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })

  it('the M4 graph_runs staff policy is still unscoped, confirming agents/agent_versions mirrors an untouched precedent', () => {
    const start = graphRuntimeSql.indexOf('graph_runs_select_staff')
    const section = graphRuntimeSql.slice(start, start + 150)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })

  it('the project-scoping and staff helper functions are reused by name, not redefined in this migration', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member/)
    expect(sql).not.toMatch(/create or replace function can_manage_project/)
    expect(sql).not.toMatch(/create or replace function is_curator_or_admin/)
  })
})
