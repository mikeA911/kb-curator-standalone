import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the policy file directly -- same approach as
// src/lib/wiki/rls.test.ts and src/lib/eval/rls.test.ts. No project-membership
// model exists yet (deferred per the Project Model brief), so the guarantees
// that matter here are narrower: RLS is enabled, only the owner (or
// curator/admin) can update a project, and inserts are pinned to the caller's
// own id so nobody can create a project owned by someone else.
const projectsRlsSql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260810100003_projects_fks_and_rls.sql'),
  'utf-8'
)

describe('Projects RLS policy file', () => {
  it('enables row level security on projects', () => {
    expect(projectsRlsSql).toMatch(/alter table projects enable row level security/)
  })

  it('excludes anonymous sessions from every projects policy', () => {
    const section = projectsRlsSql.slice(projectsRlsSql.indexOf('alter table projects enable row level security'))
    for (const policy of ['projects_select_staff_or_consultant', 'projects_insert_self']) {
      const start = section.indexOf(policy)
      expect(start).toBeGreaterThan(-1)
      expect(section.slice(start, start + 300)).toMatch(/p\.role != 'anonymous'/)
    }
  })

  it('pins project creation to the caller\'s own id, not an admin-supplied one', () => {
    const start = projectsRlsSql.indexOf('projects_insert_self')
    const section = projectsRlsSql.slice(start, start + 300)
    expect(section).toMatch(/owner_id = auth\.uid\(\)/)
  })

  it('restricts updates to the owner or curator/admin', () => {
    const start = projectsRlsSql.indexOf('projects_update_owner_or_staff')
    const section = projectsRlsSql.slice(start)
    expect(section).toMatch(/owner_id = auth\.uid\(\) or is_curator_or_admin\(auth\.uid\(\)\)/)
  })

  it('adds nullable project_id to knowledge_bases and eval_datasets, not a required one', () => {
    expect(projectsRlsSql).toMatch(/alter table knowledge_bases add column if not exists project_id uuid references projects\(id\)/)
    expect(projectsRlsSql).toMatch(/alter table eval_datasets add column if not exists project_id uuid references projects\(id\)/)
    expect(projectsRlsSql).not.toMatch(/project_id uuid not null/)
  })
})
