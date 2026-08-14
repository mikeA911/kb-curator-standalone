import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertion -- same pattern as the other fix-migration
// tests this session (e.g. public-wiki-kb-scoping-fix.test.ts). The original
// 20260808190010_rls_policies.sql (settings_select_staff) is untouched;
// this only asserts the new narrow public policy exists.
const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260814100002_settings_public_branding_read.sql'),
  'utf-8'
)

describe('settings_select_public_branding -- narrow public read for the branding key', () => {
  it('adds a select policy scoped to key = branding, not a blanket public-read policy', () => {
    expect(sql).toMatch(/create policy "settings_select_public_branding" on settings/)
    expect(sql).toMatch(/for select using \(key = 'branding'\)/)
  })
})
