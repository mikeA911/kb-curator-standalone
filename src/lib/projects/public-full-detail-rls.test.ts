import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as public-visibility-rls.test.ts
// and every other *-rls.test.ts in this repo. No live database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260817120001_public_full_detail.sql'), 'utf-8')

describe('projects.public_full_detail column', () => {
  it('defaults to false -- opt-in, not opt-out', () => {
    expect(sql).toMatch(/public_full_detail boolean not null default false/)
  })
})

describe('is_public_full_detail_project helper', () => {
  it('requires visibility=public, published_at not null, AND public_full_detail=true -- all three, not just the base publish flag', () => {
    const start = sql.indexOf('function is_public_full_detail_project')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/p\.visibility = 'public'/)
    expect(section).toMatch(/p\.published_at is not null/)
    expect(section).toMatch(/p\.public_full_detail = true/)
  })
})

describe('project_workstreams_select_public_full_detail', () => {
  it('gates purely on the project helper -- workstream status (draft/etc) is not a visibility gate', () => {
    const start = sql.indexOf('"project_workstreams_select_public_full_detail"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/for select using \(is_public_full_detail_project\(project_id\)\)/)
  })
})

describe('workstream_artifacts_select_public_full_detail', () => {
  it('joins one hop through project_workstreams to reach the project helper', () => {
    const start = sql.indexOf('"workstream_artifacts_select_public_full_detail"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/exists \(select 1 from project_workstreams w where w\.id = workstream_artifacts\.workstream_id and is_public_full_detail_project\(w\.project_id\)\)/)
  })
})

describe('system_assessments_select_public_full_detail', () => {
  it('gates on the project helper via the denormalized project_id', () => {
    const start = sql.indexOf('"system_assessments_select_public_full_detail"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/for select using \(is_public_full_detail_project\(project_id\)\)/)
  })
})

describe('system_assessment_versions_select_public_full_detail', () => {
  it('additionally excludes draft versions -- only active/retired are ever public', () => {
    const start = sql.indexOf('"system_assessment_versions_select_public_full_detail"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/is_public_full_detail_project\(project_id\) and status in \('active', 'retired'\)/)
  })
})

describe('system_assessment_questions_select_public_full_detail', () => {
  it('gates on the project helper', () => {
    const start = sql.indexOf('"system_assessment_questions_select_public_full_detail"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/for select using \(is_public_full_detail_project\(project_id\)\)/)
  })
})

describe('assessment_responses_select_public_full_detail', () => {
  it('additionally requires status=completed -- in-progress/draft responses never surface publicly', () => {
    const start = sql.indexOf('"assessment_responses_select_public_full_detail"')
    const section = sql.slice(start, start + 250)
    expect(section).toMatch(/is_public_full_detail_project\(project_id\) and status = 'completed'/)
  })
})

describe('assessment_answers_select_public_full_detail', () => {
  it('requires the parent response to be completed via an exists join', () => {
    const start = sql.indexOf('"assessment_answers_select_public_full_detail"')
    const section = sql.slice(start, start + 350)
    expect(section).toMatch(/exists \(select 1 from assessment_responses r where r\.id = assessment_answers\.response_id and r\.status = 'completed'\)/)
  })
})

describe('regression: additive only, no membership policy dropped', () => {
  it('never drops an existing select_member policy on any of the seven tables', () => {
    for (const policy of [
      'project_workstreams_select_member',
      'workstream_artifacts_select_member',
      'system_assessments_select_member',
      'system_assessment_versions_select_member',
      'system_assessment_questions_select_member',
      'assessment_responses_select_member',
      'assessment_answers_select_member',
    ]) {
      expect(sql).not.toMatch(new RegExp(`drop policy "${policy}"`))
    }
  })

  it('touches no table outside the seven workstream/assessment tables', () => {
    for (const table of ['project_notes', 'trending_items', 'eval_datasets', 'eval_runs', 'wiki_articles', 'project_members']) {
      expect(sql).not.toMatch(new RegExp(`create policy [^\\n]* on ${table}\\b`))
    }
  })
})
