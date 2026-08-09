import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// There's no live database to run RLS against in this test suite (see
// docs/CURRENT-ARCHITECTURE.md), so this asserts the *shape* of the policy
// file directly: that wiki_versions has RLS enabled and specifically has no
// general UPDATE/ALL policy for ordinary staff sessions. If someone later
// adds one (defeating "approval is the only path that sets
// approved_by/approved_at"), this test catches it at review time even
// without a live project to exercise the policy against.
const rlsSql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260808220006_wiki_rls.sql'),
  'utf-8'
)

describe('Wiki RLS policy file', () => {
  it('enables row level security on every Wiki table', () => {
    for (const table of ['wiki_categories', 'wiki_articles', 'wiki_versions', 'wiki_sources', 'wiki_relations', 'wiki_vectors']) {
      expect(rlsSql).toMatch(new RegExp(`alter table ${table} enable row level security`))
    }
  })

  it('grants wiki_versions no client-facing UPDATE or ALL policy', () => {
    // Matches `for update` / `for all` directly following a `create policy`
    // block that targets wiki_versions. INSERT-only is intentional --
    // approval happens exclusively through the service-role admin action.
    const versionsSection = rlsSql.slice(rlsSql.indexOf('-- wiki_versions'), rlsSql.indexOf('-- wiki_sources'))
    expect(versionsSection).not.toMatch(/for update/)
    expect(versionsSection).not.toMatch(/for all/)
    expect(versionsSection).toMatch(/for insert/)
  })

  it('gates wiki_articles mutation to curator/admin, not any authenticated user', () => {
    const articlesSection = rlsSql.slice(rlsSql.indexOf('-- wiki_articles'), rlsSql.indexOf('-- wiki_versions'))
    expect(articlesSection).toMatch(/insert with check \(is_curator_or_admin/)
    expect(articlesSection).toMatch(/update using \(is_curator_or_admin/)
  })
})
