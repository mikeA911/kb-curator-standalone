import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the policy file directly -- same approach as
// src/lib/wiki/rls.test.ts and src/lib/eval/rls.test.ts. Two guarantees
// matter here: (1) both registry tables are RLS-enabled, and (2) mutation
// is admin-only -- curators/consultants can select (they need to choose a
// model in the Eval UI) but never modify credentials or the registry.
const rlsSql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260810110001_ai_providers_and_models.sql'), 'utf-8')
const structuredOutputSql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260818090001_ai_models_structured_output_default.sql'),
  'utf-8'
)

describe('AI provider/model registry RLS policy file', () => {
  it('enables row level security on both registry tables', () => {
    for (const table of ['ai_providers', 'ai_models']) {
      expect(rlsSql).toMatch(new RegExp(`alter table ${table} enable row level security`))
    }
  })

  it('gates all mutation to admin only, for both tables', () => {
    for (const table of ['ai_providers', 'ai_models']) {
      const policyName = `${table}_admin_manage`
      const start = rlsSql.indexOf(`"${policyName}"`)
      expect(start).toBeGreaterThan(-1)
      const section = rlsSql.slice(start, start + 200)
      expect(section).toMatch(/for all using \(is_admin\(auth\.uid\(\)\)\)/)
    }
  })

  it('allows any non-anonymous active staff/consultant to select, not just admins', () => {
    for (const table of ['ai_providers', 'ai_models']) {
      const policyName = `${table}_select_staff_or_consultant`
      const start = rlsSql.indexOf(`"${policyName}"`)
      expect(start).toBeGreaterThan(-1)
      const section = rlsSql.slice(start, start + 250)
      expect(section).toMatch(/role != 'anonymous'/)
    }
  })

  it('enforces at most one default model per model_type at the database level', () => {
    expect(rlsSql).toMatch(/create unique index ai_models_one_default_per_type on ai_models\(model_type\) where is_default/)
  })

  it('never stores a raw API key value, only the env var name', () => {
    expect(rlsSql).toMatch(/api_key_env_var text not null/)
    expect(rlsSql).not.toMatch(/api_key text/)
  })
})

describe('ai_models.is_default_structured_output', () => {
  it('defaults to false -- opt-in, not opt-out', () => {
    expect(structuredOutputSql).toMatch(/is_default_structured_output boolean not null default false/)
  })

  it('can only be true on a model that actually supports structured output', () => {
    expect(structuredOutputSql).toMatch(/check \(not is_default_structured_output or supports_structured_output\)/)
  })

  it('enforces at most one default structured-output model globally -- not scoped by model_type like is_default is', () => {
    expect(structuredOutputSql).toMatch(/create unique index ai_models_one_default_structured_output on ai_models \(\(true\)\) where is_default_structured_output/)
  })

  it('backfills from the current generation default so existing enrichment/synthesis keeps working with zero downtime', () => {
    expect(structuredOutputSql).toMatch(
      /update ai_models set is_default_structured_output = true\s*\n\s*where is_default = true and model_type = 'generation' and supports_structured_output = true/
    )
  })
})
