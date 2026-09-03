import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the M3.6 migration directly -- same approach as
// every other *.rls.test.ts file in this repo. Normalized to LF since a
// literal '\n' match below would otherwise depend on the checkout's line
// endings (this repo has core.autocrlf=true).
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const sql = read('supabase/migrations/20260810120001_project_members.sql')
const fixSql = read('supabase/migrations/20260810120002_fix_projects_select_returning.sql')
const eval3RlsSql = read('supabase/migrations/20260809110004_eval_rls.sql')
const curatorMembersSql = read('supabase/migrations/20260903100001_curator_manages_project_members.sql')

describe('project_members schema', () => {
  it('enforces one membership row per user/project', () => {
    expect(sql).toMatch(/unique \(project_id, user_id\)/)
  })

  it('constrains role and status to the documented value sets', () => {
    expect(sql).toMatch(/role text not null check \(role in \('owner', 'curator', 'consultant', 'viewer'\)\)/)
    expect(sql).toMatch(/status text not null default 'active' check \(status in \('active', 'inactive'\)\)/)
  })

  it('auto-creates an owner membership whenever a project is created, and backfills existing projects', () => {
    expect(sql).toMatch(/after insert on projects/)
    expect(sql).toMatch(/values \(new\.id, new\.owner_id, 'owner', 'active'\)/)
    // The backfill insert (no `new.` prefix -- runs once at migration time,
    // not inside the trigger function).
    expect(sql).toMatch(/select id, owner_id, 'owner', 'active' from projects where owner_id is not null/)
  })
})

describe('project authorization helper functions', () => {
  it('every helper has a platform-admin bypass -- "Platform Admin -> all projects"', () => {
    for (const fn of ['is_project_member', 'can_manage_project', 'can_curate_project', 'can_run_project_evals']) {
      const start = sql.indexOf(`function ${fn}(`)
      expect(start).toBeGreaterThan(-1)
      const section = sql.slice(start, start + 400)
      expect(section).toMatch(/select is_admin\(uid\) or exists/)
    }
  })

  it('only counts active membership rows -- a deactivated membership grants nothing', () => {
    for (const fn of ['is_project_member', 'can_manage_project', 'can_curate_project', 'can_run_project_evals']) {
      const start = sql.indexOf(`function ${fn}(`)
      const section = sql.slice(start, start + 400)
      expect(section).toMatch(/pm\.status = 'active'/)
    }
  })

  it('can_manage_project requires the owner role specifically, not any membership', () => {
    const start = sql.indexOf('function can_manage_project(')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/pm\.role = 'owner'/)
  })

  it('can_run_project_evals excludes viewer -- a viewer must never be able to trigger a run', () => {
    const start = sql.indexOf('function can_run_project_evals(')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/pm\.role in \('owner', 'curator', 'consultant'\)/)
    expect(section).not.toMatch(/'viewer'/)
  })
})

describe('eval_datasets / knowledge_bases project-consistency trigger', () => {
  it('rejects an eval dataset whose KB belongs to a different project', () => {
    expect(sql).toMatch(/before insert or update on eval_datasets/)
    expect(sql).toMatch(/kb_project_id != new\.project_id/)
    expect(sql).toMatch(/raise exception/)
  })

  it('allows a global (project_id is null) KB to be attached to any project dataset', () => {
    const start = sql.indexOf('function validate_eval_dataset_project_kb_consistency')
    const section = sql.slice(start, start + 700)
    expect(section).toMatch(/if kb_project_id is not null and kb_project_id != new\.project_id then/)
  })
})

describe('project_members RLS', () => {
  it('enables row level security', () => {
    expect(sql).toMatch(/alter table project_members enable row level security/)
  })

  it('this original policy alone still gates all mutation to can_manage_project (owner or admin) -- extended, not replaced, by 20260903100001 below', () => {
    const start = sql.indexOf('"project_members_manage_owner"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/for all using \(can_manage_project\(project_id, auth\.uid\(\)\)\)/)
  })

  it('lets any active member (any role) see the roster, not just the owner', () => {
    const start = sql.indexOf('"project_members_select_member"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/for select using \(is_project_member\(project_id, auth\.uid\(\)\)\)/)
  })
})

// 2026-09-03: curator = department head (or their assistant) running their
// own project's team -- needs to invite/manage their own staff directly,
// per Mike. Additive on top of project_members_manage_owner above (multiple
// permissive policies for the same command are OR'd by Postgres), so a
// curator gains member-management without touching the owner-only policy.
describe('project_members RLS -- curator can manage non-owner rows (20260903100001)', () => {
  it('uses can_curate_project (owner or curator), not can_manage_project', () => {
    const start = curatorMembersSql.indexOf('"project_members_curate"')
    const section = curatorMembersSql.slice(start, start + 300)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
  })

  it('excludes owner rows from both the existing-row match and the new-value check -- a curator can never touch the owner row or grant owner', () => {
    const start = curatorMembersSql.indexOf('"project_members_curate"')
    const section = curatorMembersSql.slice(start, start + 300)
    expect(section).toMatch(/for all using \(can_curate_project\(project_id, auth\.uid\(\)\) and role <> 'owner'\)/)
    expect(section).toMatch(/with check \(can_curate_project\(project_id, auth\.uid\(\)\) and role <> 'owner'\)/)
  })
})

describe('projects RLS replaced with membership scoping', () => {
  it('drops the old "every non-anonymous user sees every project" policy', () => {
    expect(sql).toMatch(/drop policy "projects_select_staff_or_consultant" on projects/)
  })

  it('replaces select with is_project_member and update with can_manage_project', () => {
    const selectStart = sql.indexOf('"projects_select_members"')
    expect(sql.slice(selectStart, selectStart + 150)).toMatch(/for select using \(is_project_member\(id, auth\.uid\(\)\)\)/)

    const updateStart = sql.indexOf('"projects_update_managers"')
    expect(sql.slice(updateStart, updateStart + 150)).toMatch(/for update using \(can_manage_project\(id, auth\.uid\(\)\)\)/)
  })
})

describe('knowledge_bases RLS closes the project-visibility gap', () => {
  it('drops the blanket "any authenticated user sees every KB" policy', () => {
    expect(sql).toMatch(/drop policy "kb_select_authenticated" on knowledge_bases/)
  })

  it('global KBs (project_id is null) stay visible to everyone; project KBs require membership', () => {
    const start = sql.indexOf('"kb_select_global_or_member"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/project_id is null or is_project_member\(project_id, auth\.uid\(\)\)/)
  })

  it('lets a project curator/owner manage their own project KB without needing the platform curator role', () => {
    const start = sql.indexOf('"kb_manage_project_curator"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
  })
})

describe('eval consultant policies gain project scoping', () => {
  it('select policies use is_project_member (viewers included -- read-only access is allowed)', () => {
    for (const policy of ['eval_datasets_select_active_consultant', 'eval_cases_select_active_consultant', 'eval_runs_select_active_consultant', 'eval_results_select_active_consultant']) {
      const occurrences = sql.split(`"${policy}"`).length - 1
      // Each of these appears twice: once in the `drop policy` statement and
      // once in the `create policy` statement that replaces it.
      expect(occurrences).toBeGreaterThanOrEqual(2)
    }
    const start = sql.indexOf('"eval_datasets_select_active_consultant" on eval_datasets\n  for select')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/project_id is null or is_project_member\(project_id, auth\.uid\(\)\)/)
  })

  it('insert (run-triggering) policies use can_run_project_evals, not is_project_member -- excludes viewers', () => {
    const start = sql.indexOf('"eval_runs_insert_active_consultant" on eval_runs')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/d\.project_id is null or can_run_project_evals\(d\.project_id, auth\.uid\(\)\)/)
  })
})

describe('projects_select_members fix -- INSERT ... RETURNING must not depend on the AFTER INSERT trigger', () => {
  it('checks owner_id directly, not only is_project_member, so a fresh creator can see their own just-created row', () => {
    expect(fixSql).toMatch(/drop policy "projects_select_members" on projects/)
    const start = fixSql.indexOf('create policy "projects_select_members"')
    const section = fixSql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(owner_id = auth\.uid\(\) or is_project_member\(id, auth\.uid\(\)\)\)/)
  })
})

describe('regression: Milestone 3 platform-wide curator/admin policies are untouched by this migration', () => {
  it('this migration file never drops or alters the original staff-wide eval policies', () => {
    for (const policy of ['eval_datasets_select_staff', 'eval_datasets_insert_staff', 'eval_cases_select_staff']) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })

  it('the original Milestone 3 policy file still gates staff access by role only, not project membership', () => {
    const start = eval3RlsSql.indexOf('eval_datasets_select_staff')
    const section = eval3RlsSql.slice(start, start + 150)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
    expect(section).not.toMatch(/project_id/)
  })
})
