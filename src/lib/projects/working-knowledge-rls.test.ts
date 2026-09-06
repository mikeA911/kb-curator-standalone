import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the migration directly -- same approach as every
// other *.rls.test.ts file in this repo (e.g. source-submissions-rls.test.ts).
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const schemaSql = read('supabase/migrations/20260905100001_working_knowledge_schema.sql')
// Live-verified gap (disposable-persona RLS check against the real database,
// not just this file's own SQL-shape assertions): every owner-only policy
// below originally checked only owner_id/granted_by = auth.uid(), never
// whether that owner was STILL a currently active Project member -- since
// Postgres OR-combines permissive policies, a removed member could still
// select/update their own item and manage its sources/shares through these
// owner-branch policies even though can_view_working_knowledge_item (the
// *_select_visible policies) already required is_project_member_strict on
// every branch. This second follow-up fully supersedes 100002's version of
// working_knowledge_shares_manage_owner (re-adding the granted_by owner's own
// membership check alongside the recipient one), so it -- not shareFixSql --
// is this suite's source of truth for that policy's final text.
const ownerMembershipFixSql = read('supabase/migrations/20260905100003_working_knowledge_owner_policies_require_active_membership.sql')

describe('working_knowledge_items schema', () => {
  it('constrains visibility and trust_status to the documented value sets', () => {
    expect(schemaSql).toMatch(/visibility text not null default 'private' check \(visibility in \('private', 'shared_selected', 'shared_project'\)\)/)
    expect(schemaSql).toMatch(
      /trust_status text not null default 'working' check \(trust_status in \('working', 'submitted', 'returned', 'promoted', 'superseded', 'archived'\)\)/
    )
  })

  it('enables row level security on all three tables', () => {
    expect(schemaSql).toMatch(/alter table working_knowledge_items enable row level security/)
    expect(schemaSql).toMatch(/alter table working_knowledge_sources enable row level security/)
    expect(schemaSql).toMatch(/alter table working_knowledge_shares enable row level security/)
  })
})

describe('can_view_working_knowledge_item', () => {
  const start = schemaSql.indexOf('create or replace function can_view_working_knowledge_item')
  const section = schemaSql.slice(start, start + 800)

  // Acceptance-criteria-critical: is_project_member_strict, never plain
  // is_project_member (which silently grants any admin true via its own
  // "is_admin(uid) or exists(...)" body) -- a platform admin must never see
  // private/shared_project content just by holding that role, and removing
  // the creator's own Project membership must immediately revoke even their
  // own access.
  it('requires is_project_member_strict (no admin bypass), never plain is_project_member', () => {
    expect(section).toMatch(/is_project_member_strict\(i\.project_id, p_uid\)/)
    expect(section).not.toMatch(/[^_]is_project_member\(/)
  })

  it('grants access to the owner, a project-wide share, or an active named share -- and nothing else', () => {
    expect(section).toMatch(/i\.owner_id = p_uid/)
    expect(section).toMatch(/i\.visibility = 'shared_project'/)
    expect(section).toMatch(/s\.recipient_user_id = p_uid and s\.status = 'active'/)
  })
})

describe('working_knowledge_items RLS', () => {
  it('select_visible uses the shared visibility helper', () => {
    const start = schemaSql.indexOf('"working_knowledge_items_select_visible"')
    const section = schemaSql.slice(start, start + 150)
    expect(section).toMatch(/can_view_working_knowledge_item\(id, auth\.uid\(\)\)/)
  })

  it('select_own is a subquery-free (never calling can_view_working_knowledge_item) owner fallback for the insert-then-select race -- but per the 100003 fix, still requires active Project membership', () => {
    const start = ownerMembershipFixSql.indexOf('"working_knowledge_items_select_own"')
    const section = ownerMembershipFixSql.slice(start, start + 250)
    expect(section).toMatch(/owner_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member_strict\(project_id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/can_view_working_knowledge_item/)
  })

  it('insert requires the owner to currently be an active project member (strict)', () => {
    const start = schemaSql.indexOf('"working_knowledge_items_insert_owner"')
    const section = schemaSql.slice(start, start + 250)
    expect(section).toMatch(/owner_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member_strict\(project_id, auth\.uid\(\)\)/)
  })

  // The 100003 fix supersedes this policy's original schemaSql definition
  // (which, like select_own above, checked owner_id alone) -- a removed
  // member must lose edit/archive access to their own notebook exactly like
  // read access, both being "direct access" per acceptance criterion 7.
  it('update is owner-only -- no curator/admin bypass -- and (per the 100003 fix) requires active project membership too', () => {
    const start = ownerMembershipFixSql.indexOf('"working_knowledge_items_update_owner"')
    const section = ownerMembershipFixSql.slice(start, start + 350)
    expect(section).toMatch(/owner_id = auth\.uid\(\) and is_project_member_strict\(project_id, auth\.uid\(\)\)/)
  })
})

describe('working_knowledge_shares RLS', () => {
  it('lets a recipient see their own grant, or the parent item\'s owner see all of its shares', () => {
    const start = schemaSql.indexOf('"working_knowledge_shares_select_owner_or_recipient"')
    const section = schemaSql.slice(start, start + 350)
    expect(section).toMatch(/recipient_user_id = auth\.uid\(\)/)
    expect(section).toMatch(/i\.owner_id = auth\.uid\(\)/)
  })

  // The 100003 fix supersedes this policy's original schemaSql definition
  // (owner_id alone, no membership check) -- an ex-member must lose the
  // ability to revoke their own now-inaccessible notebook's shares too.
  it('revoke is restricted to the parent item\'s owner, and (per the 100003 fix) requires that owner to still be an active project member', () => {
    const start = ownerMembershipFixSql.indexOf('"working_knowledge_shares_revoke_owner"')
    const section = ownerMembershipFixSql.slice(start, start + 400)
    expect(section).toMatch(/i\.owner_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member_strict\(i\.project_id, auth\.uid\(\)\)/)
  })

  // Recipient-membership check was a first follow-up migration (20260905100002),
  // applied because the recipient must be a currently active member of the
  // item's own Project at share time -- dev request invariant 5, "Sharing is
  // explicit, revocable and restricted to active members of the same
  // Project," matching project_notes_insert_member's own precedent. A second
  // follow-up (20260905100003) then fully superseded that definition again,
  // additionally requiring the granting owner to still be an active member
  // themselves -- so ownerMembershipFixSql, not shareFixSql, is this policy's
  // final live text.
  it('insert requires both the recipient AND the granting owner to be currently active members of the item\'s project', () => {
    const start = ownerMembershipFixSql.lastIndexOf('"working_knowledge_shares_manage_owner"')
    const section = ownerMembershipFixSql.slice(start, start + 500)
    expect(section).toMatch(/granted_by = auth\.uid\(\)/)
    expect(section).toMatch(/i\.owner_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member_strict\(i\.project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/is_project_member_strict\(i\.project_id, recipient_user_id\)/)
  })
})

describe('working_knowledge_sources RLS', () => {
  it('select reuses the same item-visibility helper as the parent item', () => {
    const start = schemaSql.indexOf('"working_knowledge_sources_select_visible"')
    const section = schemaSql.slice(start, start + 150)
    expect(section).toMatch(/can_view_working_knowledge_item\(item_id, auth\.uid\(\)\)/)
  })

  // The 100003 fix supersedes this policy's original schemaSql definition
  // (owner_id alone, no membership check) -- an ex-member must lose the
  // ability to manage their own now-inaccessible notebook's sources too.
  it('manage (insert/update/delete) is restricted to the parent item\'s owner, and (per the 100003 fix) requires that owner to still be an active project member', () => {
    const start = ownerMembershipFixSql.indexOf('"working_knowledge_sources_manage_owner"')
    const section = ownerMembershipFixSql.slice(start, start + 500)
    expect(section).toMatch(/i\.owner_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member_strict\(i\.project_id, auth\.uid\(\)\)/)
  })
})
