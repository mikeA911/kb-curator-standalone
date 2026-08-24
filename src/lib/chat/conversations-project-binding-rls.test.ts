import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Same "assert the shape of the migration file directly" approach as
// src/lib/wiki/project-visibility-rls.test.ts.
const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260824190001_conversations_project_binding.sql'),
  'utf-8'
)

describe('conversations.project_id', () => {
  it('is nullable, referencing projects, on delete set null', () => {
    expect(sql).toMatch(/alter table conversations add column project_id uuid references projects\(id\) on delete set null/)
  })

  it('is immutable once set -- a trigger rejects changing it to a different project', () => {
    const fnSection = sql.slice(sql.indexOf('validate_conversation_project_id_immutable()'))
    expect(fnSection).toMatch(/old\.project_id is not null and new\.project_id is distinct from old\.project_id/)
    expect(fnSection).toMatch(/raise exception/)
    expect(sql).toMatch(/create trigger conversations_project_id_immutable\s*\n\s*before update of project_id on conversations/)
  })
})

describe('conversations.pending_turn_started_at', () => {
  it('is a nullable timestamp, no default -- set/cleared by the turn loop, not the schema', () => {
    expect(sql).toMatch(/alter table conversations add column pending_turn_started_at timestamptz/)
  })
})
