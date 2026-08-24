import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Normalizes CRLF -> LF -- on Windows with core.autocrlf=true, a branch
// switch can rewrite tracked files to CRLF in the working tree, which
// silently breaks a `.*\n.*`-style regex (observed live: this file's own
// multi-line assertions started failing after an unrelated git operation,
// nothing to do with the SQL itself). Same fix already used in
// src/lib/projects/membership-rls.test.ts's read() helper.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')

// Same "assert the shape of the policy file directly" approach as
// src/lib/wiki/rls.test.ts -- there's no live database to run RLS against
// in this suite.
const migrationSql = read('supabase/migrations/20260824150001_project_wiki_articles_and_kb_detach.sql')

// Follow-up migration fixing the four issues raised in review of the above
// (see the migration file's own header comment for the full rationale).
const fixupSql = read('supabase/migrations/20260824160001_project_knowledge_visibility_fixes.sql')

// Second follow-up: is_project_member() bakes in an admin bypass (intended
// for general project navigation), which silently defeated fixupSql's own
// fix for platform admins specifically. Caught during this feature's own
// live-verification pass, before testing the admin role.
const strictMembershipSql = read('supabase/migrations/20260824170001_project_wiki_strict_membership.sql')

// Third follow-up (Stage 2's own live-verification pass): the FOR ALL
// manage_curator policies on both junction tables incidentally granted
// SELECT to any curator/admin regardless of real membership, via
// can_curate_project's own admin bypass -- split into INSERT/DELETE-only so
// SELECT is governed solely by the strict *_select_member policy.
const noSelectLeakSql = read('supabase/migrations/20260824210001_project_junction_manage_policies_no_select_leak.sql')

describe('Project-Aware Knowledge Stage 1 migration', () => {
  it('enables RLS on project_wiki_articles with member-select and curator-manage policies', () => {
    expect(migrationSql).toMatch(/alter table project_wiki_articles enable row level security/)
    expect(migrationSql).toMatch(/project_wiki_articles_select_member.*\n.*for select using \(is_project_member/)
    expect(migrationSql).toMatch(/project_wiki_articles_manage_curator.*\n.*for all using \(can_curate_project/)
  })

  it("scopes wiki_articles' select policy to visibility_scope, not just status", () => {
    expect(migrationSql).toMatch(/drop policy "wiki_articles_select_approved_or_staff" on wiki_articles/)
    // The replacement policy must reference visibility_scope and project_wiki_articles,
    // proving a project_private article is no longer visible to everyone by default.
    const newPolicySection = migrationSql.slice(migrationSql.lastIndexOf('create policy "wiki_articles_select_approved_or_staff"'))
    expect(newPolicySection).toMatch(/visibility_scope/)
    expect(newPolicySection).toMatch(/project_wiki_articles/)
  })

  it('closes the same gap on wiki_versions -- content, not just article metadata', () => {
    expect(migrationSql).toMatch(/drop policy "wiki_versions_select_approved_or_staff" on wiki_versions/)
    const newPolicySection = migrationSql.slice(migrationSql.lastIndexOf('create policy "wiki_versions_select_approved_or_staff"'))
    expect(newPolicySection).toMatch(/wiki_articles/)
    expect(newPolicySection).toMatch(/visibility_scope/)
  })

  it('fixes kb_manage_project_curator to permit attaching a currently-unattached knowledge base', () => {
    // The pre-existing policy required `project_id is not null` in its own
    // USING clause, which made it impossible for any non-admin to ever
    // attach an unattached KB -- see the migration's own comment.
    expect(migrationSql).toMatch(/drop policy "kb_manage_project_curator" on knowledge_bases/)
    const newPolicySection = migrationSql.slice(migrationSql.lastIndexOf('create policy "kb_manage_project_curator"'))
    expect(newPolicySection).toMatch(/project_id is null/)
  })
})

describe('Project Knowledge/Visibility follow-up fixes (20260824160001)', () => {
  it("scopes the curator/admin bypass to unapproved content only, so it can't read approved project-private articles", () => {
    const articleSection = fixupSql.slice(
      fixupSql.indexOf('create policy "wiki_articles_select_approved_or_staff"'),
      fixupSql.indexOf('-- --- Fix 2:')
    )
    // The bypass must be conditioned on status, not a bare unconditional OR.
    expect(articleSection).toMatch(/status <> 'approved' and is_curator_or_admin/)
    expect(articleSection).not.toMatch(/\(\s*is_curator_or_admin\(auth\.uid\(\)\)\s*\n\s*or/)

    const versionSection = fixupSql.slice(fixupSql.indexOf('create policy "wiki_versions_select_approved_or_staff"'))
    expect(versionSection).toMatch(/approved_at is null and is_curator_or_admin/)
    expect(versionSection).not.toMatch(/\(\s*is_curator_or_admin\(auth\.uid\(\)\)\s*\n\s*or/)
  })

  it("removes 'organization' from the allowed visibility_scope values until an org boundary exists", () => {
    expect(fixupSql).toMatch(/alter table wiki_articles drop constraint wiki_articles_visibility_scope_check/)
    const constraintSection = fixupSql.slice(fixupSql.lastIndexOf('add constraint wiki_articles_visibility_scope_check'))
    expect(constraintSection).not.toMatch(/organization/)
    expect(constraintSection).toMatch(/project_private/)
    expect(constraintSection).toMatch(/selected_projects/)
  })

  it('enforces project_private as at most one linked project via triggers on both write paths', () => {
    expect(fixupSql).toMatch(/create trigger project_wiki_articles_validate_scope\s*\n\s*before insert on project_wiki_articles/)
    expect(fixupSql).toMatch(/create trigger wiki_articles_validate_scope_change\s*\n\s*before update of visibility_scope on wiki_articles/)
    expect(fixupSql).toMatch(/existing_links >= 1/)
    expect(fixupSql).toMatch(/linked_projects > 1/)
  })

  it('adds project_knowledge_bases as a real many-to-many junction with member-select/curator-manage RLS', () => {
    expect(fixupSql).toMatch(/create table if not exists project_knowledge_bases/)
    expect(fixupSql).toMatch(/unique \(project_id, knowledge_base_id\)/)
    expect(fixupSql).toMatch(/alter table project_knowledge_bases enable row level security/)
    expect(fixupSql).toMatch(/project_knowledge_bases_select_member.*\n.*for select using \(is_project_member/)
    expect(fixupSql).toMatch(/project_knowledge_bases_manage_curator.*\n.*for all using \(can_curate_project/)
  })

  it('only allows an active knowledge base to be attached via the junction', () => {
    expect(fixupSql).toMatch(/require_active_knowledge_base\(new\.knowledge_base_id\)/)
    expect(fixupSql).toMatch(/create trigger project_knowledge_bases_require_active_kb/)
  })
})

describe('Strict project membership for confidentiality gating (20260824170001)', () => {
  it('defines is_project_member_strict without an admin bypass', () => {
    const fnSection = strictMembershipSql.slice(
      strictMembershipSql.indexOf('create or replace function is_project_member_strict'),
      strictMembershipSql.indexOf('$$;') + 3
    )
    expect(fnSection).not.toMatch(/is_admin/)
    expect(fnSection).toMatch(/project_members/)
  })

  it('uses the strict check (not is_project_member) in every confidentiality-gating policy', () => {
    for (const policy of [
      'project_wiki_articles_select_member',
      'project_knowledge_bases_select_member',
      'wiki_articles_select_approved_or_staff',
      'wiki_versions_select_approved_or_staff',
    ]) {
      const section = strictMembershipSql.slice(strictMembershipSql.lastIndexOf(`create policy "${policy}"`))
      const nextPolicy = section.indexOf('create policy', 1)
      const scoped = nextPolicy === -1 ? section : section.slice(0, nextPolicy)
      expect(scoped).toMatch(/is_project_member_strict/)
      expect(scoped).not.toMatch(/[^_]is_project_member\(/)
    }
  })
})

describe('Junction table manage policies split into insert/delete, no incidental SELECT (20260824210001)', () => {
  it('drops both FOR ALL manage_curator policies', () => {
    expect(noSelectLeakSql).toMatch(/drop policy "project_wiki_articles_manage_curator" on project_wiki_articles/)
    expect(noSelectLeakSql).toMatch(/drop policy "project_knowledge_bases_manage_curator" on project_knowledge_bases/)
  })

  it('replaces each with insert-only and delete-only policies, never "for all"', () => {
    for (const table of ['project_wiki_articles', 'project_knowledge_bases']) {
      const insertPolicy = `${table}_insert_curator`
      const deletePolicy = `${table}_delete_curator`
      expect(noSelectLeakSql).toMatch(new RegExp(`create policy "${insertPolicy}" on ${table}\\s*\\n\\s*for insert with check \\(can_curate_project`))
      expect(noSelectLeakSql).toMatch(new RegExp(`create policy "${deletePolicy}" on ${table}\\s*\\n\\s*for delete using \\(can_curate_project`))
    }
    const codeOnly = noSelectLeakSql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
    expect(codeOnly).not.toMatch(/for all/)
  })
})
