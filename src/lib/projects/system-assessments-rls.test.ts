import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as every other *-rls.test.ts
// in this repo. No live database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260816110001_system_assessments.sql'), 'utf-8')

describe('circular FK: system_assessments.current_version_id', () => {
  it('is added after system_assessment_versions exists, same pattern as wiki_articles/wiki_versions', () => {
    expect(sql).toMatch(
      /add constraint system_assessments_current_version_fk\s*\n\s*foreign key \(current_version_id\) references system_assessment_versions\(id\) on delete set null/
    )
  })
})

describe('system_assessments RLS', () => {
  it('select is scoped to project members', () => {
    const start = sql.indexOf('"system_assessments_select_member"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(is_project_member\(project_id, auth\.uid\(\)\)\)/)
  })

  it('manage (create/edit/activate/retire) is curator-gated, matching the design note\'s permission table', () => {
    const start = sql.indexOf('"system_assessments_manage_curator"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/for all/)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
  })
})

describe('system_assessment_versions / system_assessment_questions RLS', () => {
  it('both are select-member, manage-curator -- same shape as system_assessments', () => {
    for (const table of ['system_assessment_versions', 'system_assessment_questions']) {
      const selectStart = sql.indexOf(`"${table}_select_member"`)
      expect(sql.slice(selectStart, selectStart + 150)).toMatch(/for select using \(is_project_member\(project_id, auth\.uid\(\)\)\)/)

      const manageStart = sql.indexOf(`"${table}_manage_curator"`)
      expect(sql.slice(manageStart, manageStart + 200)).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
    }
  })
})

describe('assessment_responses RLS', () => {
  it('select is member-wide -- comparing methods side by side requires seeing every participant\'s response, not just your own', () => {
    const start = sql.indexOf('"assessment_responses_select_member"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(is_project_member\(project_id, auth\.uid\(\)\)\)/)
  })

  it('insert uses can_run_project_evals -- excludes viewer, matching "Consultant / Project Member" from the design note, not curator-only', () => {
    const start = sql.indexOf('"assessment_responses_insert_member"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/can_run_project_evals\(project_id, auth\.uid\(\)\)/)
    expect(section).toMatch(/created_by = auth\.uid\(\)/)
  })

  it('update allows the response\'s own author or a curator -- not any project member', () => {
    const start = sql.indexOf('"assessment_responses_update_owner_or_curator"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/created_by = auth\.uid\(\)/)
    expect(section).toMatch(/can_curate_project\(project_id, auth\.uid\(\)\)/)
  })
})

describe('assessment_answers RLS', () => {
  it('insert requires being the owner of the parent response, not just any project member', () => {
    const start = sql.indexOf('"assessment_answers_insert_response_owner"')
    const section = sql.slice(start, start + 350)
    expect(section).toMatch(/from assessment_responses r where r\.id = response_id and r\.created_by = auth\.uid\(\)/)
  })
})

describe('regression: no existing policy dropped, helpers reused by name', () => {
  it('never drops an existing project/workstream/eval policy', () => {
    for (const policy of ['project_workstreams_manage_curator', 'workstream_artifacts_insert_consultant', 'eval_datasets_manage_project_curator']) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })

  it('reuses is_project_member/can_curate_project/can_run_project_evals by name, never redefines them', () => {
    expect(sql).not.toMatch(/create or replace function is_project_member/)
    expect(sql).not.toMatch(/create or replace function can_curate_project/)
    expect(sql).not.toMatch(/create or replace function can_run_project_evals/)
  })
})
