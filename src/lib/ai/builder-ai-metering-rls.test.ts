import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// No live database in this suite (see docs/CURRENT-ARCHITECTURE.md), so this
// asserts the *shape* of the migration directly -- same approach as every
// other *-rls.test.ts file in this repo (e.g. builder-progress-updates-rls.test.ts).
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')
const sql = read('supabase/migrations/20260907100001_builder_ai_metering_schema.sql')

describe('ai_operation_logs metering columns', () => {
  it('adds project_id, estimated_cost_usd, and is_byo_llm', () => {
    expect(sql).toMatch(/add column project_id uuid references projects\(id\) on delete set null/)
    expect(sql).toMatch(/add column estimated_cost_usd numeric/)
    expect(sql).toMatch(/add column is_byo_llm boolean not null default false/)
  })
})

describe('builder_ai_allowances schema and RLS', () => {
  it('defaults stop_at_allowance to true and constrains warning_threshold_pct to 0-100', () => {
    expect(sql).toMatch(/stop_at_allowance boolean not null default true/)
    expect(sql).toMatch(/warning_threshold_pct numeric not null default 80 check \(warning_threshold_pct between 0 and 100\)/)
  })

  it('lets a builder see only their own allowance, and staff see any', () => {
    const start = sql.indexOf('"builder_ai_allowances_select_own_or_operator"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/builder_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })

  it('restricts managing an allowance to curator/admin -- a builder cannot raise their own cap', () => {
    const start = sql.indexOf('"builder_ai_allowances_manage_staff"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
    expect(section).not.toMatch(/builder_id = auth\.uid\(\)/)
  })
})

describe('builder_credit_grants schema and RLS', () => {
  it('is append-only (positive amounts, no update/delete policy)', () => {
    expect(sql).toMatch(/amount_usd numeric not null check \(amount_usd > 0\)/)
    expect(sql).not.toMatch(/"builder_credit_grants_(update|delete)/)
  })

  it('restricts insert to curator/admin granting as themselves', () => {
    const start = sql.indexOf('"builder_credit_grants_insert_staff"')
    const section = sql.slice(start, start + 200)
    expect(section).toMatch(/granted_by = auth\.uid\(\)/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })
})

describe('builder_llm_credentials schema and RLS', () => {
  it('requires a base_url for the openai_compatible provider type', () => {
    expect(sql).toMatch(/check \(provider_type != 'openai_compatible' or base_url is not null\)/)
  })

  it('is one active credential per builder (primary key on builder_id, not a history table)', () => {
    const start = sql.indexOf('create table builder_llm_credentials')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/builder_id uuid primary key references profiles\(id\)/)
  })

  it('lets a builder manage only their own credential, or staff manage any', () => {
    const start = sql.indexOf('"builder_llm_credentials_manage_own_or_staff"')
    const section = sql.slice(start, start + 300)
    expect(section).toMatch(/builder_id = auth\.uid\(\)/)
    expect(section).toMatch(/is_curator_or_admin\(auth\.uid\(\)\)/)
  })
})
