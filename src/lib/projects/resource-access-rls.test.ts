import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Same "assert the shape of the policy file directly" approach as
// knowledge-visibility-retrieval-rls.test.ts -- there's no live database to
// run RLS against in this suite. Normalizes CRLF -> LF, same reason as the
// other RLS-shape tests in this repo (core.autocrlf rewrites tracked .sql
// files to CRLF on checkout, which silently breaks a raw-text regex read).
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')

const schemaSql = read('supabase/migrations/20260825100001_project_evidence_access_schema.sql')
const enforcementSql = read('supabase/migrations/20260825110001_project_evidence_access_enforcement.sql')

function policySection(sql: string, name: string): string {
  const start = sql.lastIndexOf(`create policy "${name}"`)
  expect(start, `policy "${name}" not found`).toBeGreaterThan(-1)
  const nextPolicy = sql.indexOf('create policy', start + 1)
  return nextPolicy === -1 ? sql.slice(start) : sql.slice(start, nextPolicy)
}

describe('project_evidence_access_schema -- new tables', () => {
  it('resource_access_policies is unique per (resource_type, resource_id) and classification is bounded', () => {
    expect(schemaSql).toMatch(/unique \(resource_type, resource_id\)/)
    expect(schemaSql).toMatch(
      /classification text not null check \(classification in \(\s*'project_general', 'internal_confidential', 'commercial_confidential',\s*'security_restricted', 'customer_confidential', 'customer_visible'\s*\)\)/
    )
  })

  it('resource_access_grants requires exactly one of project_access_group_id / project_member_id', () => {
    expect(schemaSql).toMatch(/constraint resource_access_grants_exactly_one_grantee check \(/)
    expect(schemaSql).toMatch(/project_access_group_id is not null and project_member_id is null/)
    expect(schemaSql).toMatch(/project_access_group_id is null and project_member_id is not null/)
  })

  it('project_access_groups is unique per (project_id, name)', () => {
    expect(schemaSql).toMatch(/unique \(project_id, name\)/)
  })

  it('all five new tables enable RLS', () => {
    for (const table of [
      'project_access_groups',
      'project_access_group_members',
      'resource_access_policies',
      'resource_access_grants',
      'resource_access_audit_log',
    ]) {
      expect(schemaSql, `${table} should enable RLS`).toMatch(new RegExp(`alter table ${table} enable row level security`))
    }
  })

  it('the four management tables gate select+write identically on can_manage_project (owner/admin), no strict-member-only select', () => {
    for (const [table, policy] of [
      ['project_access_groups', 'project_access_groups_manage_owner'],
      ['resource_access_policies', 'resource_access_policies_manage_owner'],
    ] as const) {
      const section = policySection(schemaSql, policy)
      expect(section, `${table} policy should use can_manage_project`).toMatch(/can_manage_project\(project_id, auth\.uid\(\)\)/)
      expect(section, `${table} policy should be FOR ALL, not just select`).toMatch(/for all using/)
    }
  })

  it('project_access_group_members and resource_access_grants gate through their parent row, not a copied project_id', () => {
    const groupMembersSection = policySection(schemaSql, 'project_access_group_members_manage_owner')
    expect(groupMembersSection).toMatch(/from project_access_groups g/)
    expect(groupMembersSection).toMatch(/can_manage_project\(g\.project_id, auth\.uid\(\)\)/)

    const grantsSection = policySection(schemaSql, 'resource_access_grants_manage_owner')
    expect(grantsSection).toMatch(/from resource_access_policies p/)
    expect(grantsSection).toMatch(/can_manage_project\(p\.project_id, auth\.uid\(\)\)/)
  })

  it('resource_access_audit_log has a select policy but no insert/update/delete policy at all', () => {
    expect(schemaSql).toMatch(/create policy "resource_access_audit_log_select_owner" on resource_access_audit_log\s*\n\s*for select using \(can_manage_project\(project_id, auth\.uid\(\)\)\)/)
    expect(schemaSql).not.toMatch(/create policy "resource_access_audit_log[^"]*" on resource_access_audit_log\s*\n\s*for insert/)
    // Confirms the intent documented in the migration's own comment.
    expect(schemaSql).toMatch(/No insert\/update\/delete policy -- written only via the admin client/)
  })
})

describe('has_evidence_access -- zero bypass for anyone, project_general treated as unrestricted', () => {
  it('has no admin/curator/owner bypass branch at all', () => {
    const start = enforcementSql.indexOf('create or replace function has_evidence_access')
    const body = enforcementSql.slice(start, enforcementSql.indexOf('$$;', start))
    expect(body).not.toMatch(/is_admin/)
    expect(body).not.toMatch(/is_curator_or_admin/)
    expect(body).not.toMatch(/can_manage_project/)
    expect(body).not.toMatch(/can_curate_project/)
  })

  it('treats a project_general policy row the same as no row at all', () => {
    const start = enforcementSql.indexOf('create or replace function has_evidence_access')
    const body = enforcementSql.slice(start, enforcementSql.indexOf('$$;', start))
    const generalExclusions = body.match(/classification <> 'project_general'/g) ?? []
    expect(generalExclusions.length).toBeGreaterThanOrEqual(2)
  })

  it('requires the grant to be active and, for a group grant, the group membership to be active and unexpired', () => {
    const start = enforcementSql.indexOf('create or replace function has_evidence_access')
    const body = enforcementSql.slice(start, enforcementSql.indexOf('$$;', start))
    expect(body).toMatch(/g\.status = 'active'/)
    expect(body).toMatch(/gm\.status = 'active'/)
    expect(body).toMatch(/gm\.expires_at is null or gm\.expires_at > now\(\)/)
  })
})

describe('existing retrieval/select policies gain the has_evidence_access AND-gate', () => {
  it('knowledge_sources: gate wraps the entire existing condition, including the staff/creator bypass', () => {
    const section = policySection(enforcementSql, 'knowledge_sources_select_staff_or_owner_or_project_member')
    expect(section).toMatch(/has_evidence_access\('knowledge_source', knowledge_sources\.id, auth\.uid\(\)\)\s*\n\s*and \(/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
    expect(section).toMatch(/created_by = auth\.uid\(\)/)
  })

  it('documents: gate is keyed to the stable knowledge_source_id, not the versioned document id', () => {
    const section = policySection(enforcementSql, 'documents_select_staff_or_owner_or_project_member')
    expect(section).toMatch(/has_evidence_access\('knowledge_source', documents\.knowledge_source_id, auth\.uid\(\)\)/)
  })

  it('kb_vectors: gate is keyed through the joined knowledge_sources row, still has zero unconditional bypass', () => {
    const section = policySection(enforcementSql, 'kb_vectors_select_scoped')
    expect(section).toMatch(/has_evidence_access\('knowledge_source', ks\.id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/is_curator_or_admin/)
  })

  it('wiki_articles: gate wraps the whole condition including the unapproved-draft staff bypass', () => {
    const section = policySection(enforcementSql, 'wiki_articles_select_approved_or_staff')
    expect(section).toMatch(/has_evidence_access\('wiki_article', wiki_articles\.id, auth\.uid\(\)\)\s*\n\s*and \(/)
    expect(section).toMatch(/status <> 'approved' and is_curator_or_admin/)
  })

  it('wiki_versions: gate is keyed to the parent article id, wraps the unapproved-draft staff bypass too', () => {
    const section = policySection(enforcementSql, 'wiki_versions_select_approved_or_staff')
    expect(section).toMatch(/has_evidence_access\('wiki_article', wiki_versions\.wiki_article_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/approved_at is null and is_curator_or_admin/)
  })

  it('wiki_vectors: gate is keyed through the joined wiki_articles row', () => {
    const section = policySection(enforcementSql, 'wiki_vectors_select_scoped')
    expect(section).toMatch(/has_evidence_access\('wiki_article', wa\.id, auth\.uid\(\)\)/)
  })

  it('workstream_artifacts: swaps is_project_member for the strict variant AND adds the evidence-access gate', () => {
    const section = policySection(enforcementSql, 'workstream_artifacts_select_member')
    expect(section).toMatch(/has_evidence_access\('workstream_artifact', workstream_artifacts\.id, auth\.uid\(\)\)/)
    expect(section).toMatch(/is_project_member_strict\(w\.project_id, auth\.uid\(\)\)/)
    expect(section).not.toMatch(/is_project_member\(w\.project_id/)
  })
})
