import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the migration directly -- same approach as every
// other *-rls.test.ts file in this repo.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const sql = read('supabase/migrations/20260904140001_project_join_requests.sql')
// project_join_requests_insert_self's original raw `exists (select ... from
// projects ...)` subquery ran under the caller's own RLS on `projects`, so a
// genuinely new non-member -- exactly who this feature is for -- could never
// see the row it was checking, and every insert failed with a raw Postgres
// 42501. Fixed same-day with a security definer helper, same shape as
// is_project_member/can_manage_project/can_curate_project themselves. The
// *final* insert policy (superseding the one in the base migration) lives in
// this follow-up file.
const fixSql = read('supabase/migrations/20260904150001_fix_project_join_requests_insert_rls.sql')

describe('projects discoverability/is_organization_home schema', () => {
  it('constrains discoverability to platform/members_only, default members_only', () => {
    expect(sql).toMatch(/discoverability text not null default 'members_only'\s*\n\s*check \(discoverability in \('platform', 'members_only'\)\)/)
  })

  it('adds is_organization_home as a boolean defaulting to false', () => {
    expect(sql).toMatch(/is_organization_home boolean not null default false/)
  })
})

describe('project_join_requests schema', () => {
  it('constrains status to the documented value set, default pending', () => {
    expect(sql).toMatch(/status text not null default 'pending' check \(status in \('pending', 'approved', 'declined', 'cancelled'\)\)/)
  })
})

describe('project_join_requests RLS', () => {
  it('enables row level security', () => {
    expect(sql).toMatch(/alter table project_join_requests enable row level security/)
  })

  it('the discoverability check bypasses RLS on projects via a security definer helper, not a raw subquery', () => {
    expect(fixSql).toMatch(/create or replace function is_project_discoverable\(pid uuid\)/)
    expect(fixSql).toMatch(/language sql stable security definer set search_path = public/)
    expect(fixSql).toMatch(/select exists \(select 1 from projects p where p\.id = pid and p\.discoverability = 'platform'\)/)
  })

  it('lets a user insert a request for themselves only when already a member or the project is discoverable', () => {
    const start = fixSql.indexOf('"project_join_requests_insert_self"')
    const section = fixSql.slice(start, start + 400)
    expect(section).toMatch(/requester_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member\(project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/is_project_discoverable\(project_id\)/)
  })

  it('does not require is_project_member for insert unconditionally -- discoverability is an alternative, not an addition', () => {
    const start = fixSql.indexOf('"project_join_requests_insert_self"')
    const section = fixSql.slice(start, start + 400)
    // The membership check and the discoverability check must be joined by
    // "or", not "and" -- a non-member must still be able to insert when the
    // project is discoverable.
    expect(section).toMatch(/is_project_member\(project_id, auth\.uid\(\)\)\s*\n\s*or is_project_discoverable/)
  })

  it('lets the requester see their own request, and the project curator/owner/admin see all of them', () => {
    const start = sql.indexOf('"project_join_requests_select_own_or_manager"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/requester_id = auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
  })

  it('gates deciding a request on can_curate_project (owner-or-curator), not can_manage_project (owner-only)', () => {
    const start = sql.indexOf('"project_join_requests_update_manager"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/using \(can_curate_project\(project_id, auth\.uid\(\)\)\)/)
    expect(section).toMatch(/with check \(can_curate_project\(project_id, auth\.uid\(\)\)\)/)
    expect(section).not.toMatch(/can_manage_project/)
  })
})

describe('Sandz Organization Home seed', () => {
  it('creates the org-home project as discoverable and flagged is_organization_home', () => {
    expect(sql).toMatch(/'Sandz — Organization Home'/)
    expect(sql).toMatch(/'platform',\s*\n\s*true,/)
  })

  it('attaches the sandz-general knowledge base to it', () => {
    expect(sql).toMatch(/insert into project_knowledge_bases/)
    expect(sql).toMatch(/proj\.is_organization_home = true/)
  })

  it('marks the five pilot-facing projects discoverable, matching the dev request', () => {
    const start = sql.indexOf("update projects set discoverability = 'platform' where name in")
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/Sandz Pilot Feedback and Q&A/)
    expect(section).toMatch(/Sandz HR Knowledge Base/)
    expect(section).toMatch(/Sandz–Zadara Pilot — Sales Proposals/)
    expect(section).toMatch(/Sandz–Zadara Pilot — Governance and Evaluation/)
    expect(section).toMatch(/Sandz–Zadara Pilot — Call Center Support/)
  })
})
