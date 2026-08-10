import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as membership-rls.test.ts and
// every other *.rls.test.ts in this repo. No live database in this suite;
// live anon-key verification is a separate manual/scripted pass (see
// scripts/live-e2e.test.ts).
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260810130001_public_visibility.sql'), 'utf-8')
const wikiRlsSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260808220006_wiki_rls.sql'), 'utf-8')
const membershipSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260810120001_project_members.sql'), 'utf-8')

describe('projects publication columns', () => {
  it('defaults visibility to private and constrains it to the documented value set', () => {
    expect(sql).toMatch(/visibility text not null default 'private'/)
    expect(sql).toMatch(/check \(visibility in \('private', 'internal', 'public'\)\)/)
  })

  it('adds a unique public_slug and nullable publication metadata', () => {
    expect(sql).toMatch(/public_slug text unique/)
    expect(sql).toMatch(/public_profile jsonb/)
    expect(sql).toMatch(/published_at timestamptz/)
    expect(sql).toMatch(/published_by uuid references profiles\(id\) on delete set null/)
  })
})

describe('projects_select_public -- additive, never replaces projects_select_members', () => {
  it('is a new policy, not a drop+recreate of the membership-scoped one', () => {
    expect(sql).not.toMatch(/drop policy "projects_select_members"/)
    expect(sql).not.toMatch(/drop policy "projects_select_public"/)
  })

  it('requires both visibility=public and a non-null published_at -- a slug alone is not enough', () => {
    const start = sql.indexOf('"projects_select_public"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/for select using \(visibility = 'public' and published_at is not null\)/)
  })

  it('adds no new UPDATE policy -- reuses the existing owner/admin-gated projects_update_managers', () => {
    expect(sql).not.toMatch(/create policy "projects_update/)
  })
})

describe('wiki_articles.is_public is separate from status=approved', () => {
  it('defaults to false -- publication is never implied by approval', () => {
    expect(sql).toMatch(/is_public boolean not null default false/)
  })

  it('wiki_articles_select_public requires both approved status and is_public', () => {
    const start = sql.indexOf('"wiki_articles_select_public"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(status = 'approved' and is_public = true\)/)
  })
})

describe('is_public_wiki_article helper + wiki_versions_select_public', () => {
  it('the helper checks approved + is_public, single source of truth', () => {
    const start = sql.indexOf('function is_public_wiki_article')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/a\.status = 'approved' and a\.is_public = true/)
  })

  it('scopes to exactly the article current_version_id -- never a draft, review, or superseded version', () => {
    const start = sql.indexOf('"wiki_versions_select_public"')
    const section = sql.slice(start, start + 400)
    expect(section).toMatch(/id = \(select current_version_id from wiki_articles where id = wiki_versions\.wiki_article_id\)/)
    expect(section).toMatch(/is_public_wiki_article\(wiki_article_id\)/)
  })
})

describe('wiki_categories widened to anon -- non-sensitive, no behavior change for authenticated users', () => {
  it('drops the authenticated-only policy and replaces it with an open one', () => {
    expect(sql).toMatch(/drop policy "wiki_categories_select_authenticated" on wiki_categories/)
    const start = sql.indexOf('"wiki_categories_select_public"')
    const section = sql.slice(start, start + 150)
    expect(section).toMatch(/for select using \(true\)/)
  })
})

describe('regression: no table this migration should stay closed to anon got a new policy', () => {
  it('this migration never touches wiki_sources, wiki_relations, project_members, eval tables, or ai_operation_logs', () => {
    for (const table of [
      'wiki_sources',
      'wiki_relations',
      'project_members',
      'eval_datasets',
      'eval_cases',
      'eval_runs',
      'eval_results',
      'ai_operation_logs',
      'documents',
      'document_chunks',
    ]) {
      expect(sql).not.toMatch(new RegExp(`create policy [^\\n]* on ${table}\\b`))
    }
  })

  it('the original Wiki RLS migration still gates wiki_versions history to approved-or-staff only, unchanged', () => {
    expect(wikiRlsSql).toMatch(/wiki_versions_select_approved_or_staff/)
    expect(wikiRlsSql).toMatch(/approved_at is not null or is_curator_or_admin\(auth\.uid\(\)\)/)
  })

  it('the M3.6 project_members RLS (can_manage_project-gated) is untouched by this migration', () => {
    expect(sql).not.toMatch(/drop policy "project_members_manage_owner"/)
    expect(sql).not.toMatch(/drop policy "project_members_select_member"/)
    expect(membershipSql).toMatch(/"project_members_manage_owner"/)
  })
})
