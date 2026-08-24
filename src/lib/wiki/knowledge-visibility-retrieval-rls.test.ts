import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Same "assert the shape of the policy file directly" approach as
// project-visibility-rls.test.ts -- there's no live database to run RLS
// against in this suite. This migration closes two retrieval-layer leaks:
// wiki_vectors/kb_vectors both bypassed Stage 1's visibility_scope
// confidentiality gating entirely (unconditional consultant SELECT access,
// no join back to the parent article/knowledge base at all).
const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260824180001_project_knowledge_visibility_retrieval_fix.sql'),
  'utf-8'
)

// Follow-up: 20260824180001's own kb_vectors_select_scoped policy shipped
// with a stray unconditional is_curator_or_admin bypass -- caught during
// this stage's live-verification pass, before testing curator/admin
// accounts against the Zadara private content.
const fixupSql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260824200001_kb_vectors_remove_stray_bypass.sql'),
  'utf-8'
)

function policySection(name: string): string {
  const start = sql.lastIndexOf(`create policy "${name}"`)
  expect(start, `policy "${name}" not found`).toBeGreaterThan(-1)
  const nextPolicy = sql.indexOf('create policy', start + 1)
  return nextPolicy === -1 ? sql.slice(start) : sql.slice(start, nextPolicy)
}

describe('knowledge_bases visibility_scope', () => {
  it('adds the column with the same convention as wiki_articles.visibility_scope, defaulting to platform', () => {
    expect(sql).toMatch(/add column if not exists visibility_scope text not null default 'platform'/)
    expect(sql).toMatch(/check \(visibility_scope in \('project_private', 'selected_projects', 'platform', 'public'\)\)/)
  })

  it('backfills the one knowledge base with real customer-confidential content to project_private', () => {
    expect(sql).toMatch(/update knowledge_bases set visibility_scope = 'project_private' where id = 'zadara_sandz'/)
  })
})

describe('kb_select_global_or_member -- was vacuous after Stage 1 stopped writing knowledge_bases.project_id', () => {
  it('gates on visibility_scope and project_knowledge_bases via the strict membership check, not the legacy project_id column', () => {
    const section = policySection('kb_select_global_or_member')
    expect(section).toMatch(/visibility_scope in \('platform', 'public'\)/)
    expect(section).toMatch(/project_knowledge_bases/)
    expect(section).toMatch(/is_project_member_strict/)
    expect(section).not.toMatch(/project_id is null/)
  })
})

describe('wiki_vectors_select_scoped -- closes the search_wiki confidentiality bypass', () => {
  it('drops the unconditional consultant-access policy', () => {
    expect(sql).toMatch(/drop policy "wiki_vectors_select_consultant" on wiki_vectors/)
  })

  it('joins back to wiki_articles and checks visibility_scope, mirroring wiki_versions_select_approved_or_staff', () => {
    const section = policySection('wiki_vectors_select_scoped')
    expect(section).toMatch(/wa\.current_version_id = wiki_vectors\.wiki_version_id/)
    expect(section).toMatch(/wa\.visibility_scope in \('platform', 'public'\)/)
    expect(section).toMatch(/is_project_member_strict/)
  })
})

describe('kb_vectors_select_scoped -- same leak class as wiki_vectors, for knowledge source chunks', () => {
  it('drops the unconditional consultant-access policy', () => {
    expect(sql).toMatch(/drop policy "kb_vectors_select_consultant" on kb_vectors/)
  })

  it('joins through documents -> knowledge_sources -> knowledge_bases and checks visibility_scope', () => {
    const section = policySection('kb_vectors_select_scoped')
    expect(section).toMatch(/join knowledge_sources ks on ks\.current_version_id = d\.id/)
    expect(section).toMatch(/join knowledge_bases kb on kb\.id = ks\.knowledge_base_id/)
    expect(section).toMatch(/kb\.visibility_scope in \('platform', 'public'\)/)
    expect(section).toMatch(/is_project_member_strict/)
  })
})

describe('kb_vectors_select_scoped follow-up (20260824200001) -- removes the stray unconditional bypass', () => {
  it('drops and recreates the policy with no is_curator_or_admin branch at all', () => {
    expect(fixupSql).toMatch(/drop policy "kb_vectors_select_scoped" on kb_vectors/)
    const section = fixupSql.slice(fixupSql.lastIndexOf('create policy "kb_vectors_select_scoped"'))
    expect(section).not.toMatch(/is_curator_or_admin/)
    expect(section).toMatch(/kb\.visibility_scope in \('platform', 'public'\)/)
    expect(section).toMatch(/is_project_member_strict/)
  })
})

describe('knowledge_sources / documents select policies gain a project-member branch', () => {
  it('knowledge_sources stays visible to staff/owner and adds project-member access through its knowledge base', () => {
    const section = policySection('knowledge_sources_select_staff_or_owner_or_project_member')
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
    expect(section).toMatch(/created_by = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member_strict/)
  })

  it('documents stays visible to staff/owner and adds project-member access through its knowledge source', () => {
    const section = policySection('documents_select_staff_or_owner_or_project_member')
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
    expect(section).toMatch(/uploaded_by = auth\.uid\(\)/)
    expect(section).toMatch(/is_project_member_strict/)
  })
})
