import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Same "assert the shape of the policy file directly" approach as
// resource-access-rls.test.ts -- there's no live database to run RLS
// against in this suite. Normalizes CRLF -> LF, same reason as every other
// RLS-shape test in this repo.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')

const sql = read('supabase/migrations/20260825120001_owner_feedback_board.sql')

function policySection(name: string): string {
  const start = sql.lastIndexOf(`create policy "${name}"`)
  expect(start, `policy "${name}" not found`).toBeGreaterThan(-1)
  const nextPolicy = sql.indexOf('create policy', start + 1)
  return nextPolicy === -1 ? sql.slice(start) : sql.slice(start, nextPolicy)
}

describe('is_platform_owner -- zero bypass, unlike every other role helper in this schema', () => {
  it('has no is_admin/is_curator_or_admin bypass branch at all', () => {
    const start = sql.indexOf('create or replace function is_platform_owner')
    const body = sql.slice(start, sql.indexOf('$$;', start))
    expect(body).not.toMatch(/is_admin/)
    expect(body).not.toMatch(/is_curator_or_admin/)
    expect(body).toMatch(/select exists \(select 1 from platform_owners where user_id = uid\)/)
  })
})

describe('platform_owners seeding and RLS', () => {
  it('seeds exactly the two authorized owner identities, idempotently', () => {
    expect(sql).toMatch(/'mike\.aguilar@gmail\.com', 'mikecolligodata@gmail\.com'/)
    expect(sql).toMatch(/on conflict \(user_id\) do nothing/)
  })

  it('select is gated on is_platform_owner, with no insert/update/delete policy at all', () => {
    const section = policySection('platform_owners_select_owner')
    expect(section).toMatch(/for select using \(is_platform_owner\(auth\.uid\(\)\)\)/)
    const tableSection = sql.slice(sql.indexOf('create table platform_owners'), sql.indexOf('create table platform_owners') + 2000)
    expect(tableSection).not.toMatch(/for insert/)
    expect(tableSection).not.toMatch(/for update/)
    expect(tableSection).not.toMatch(/for delete/)
  })
})

describe('conversations.kind', () => {
  it('is additive with a default of chat, orthogonal to project_id', () => {
    expect(sql).toMatch(/alter table conversations add column kind text not null default 'chat' check \(kind in \('chat', 'feedback'\)\)/)
  })
})

describe('feedback_reports RLS', () => {
  it('select allows the reporter or a platform owner, nobody else', () => {
    const section = policySection('feedback_reports_select_own_or_owner')
    expect(section).toMatch(/reporter_id = auth\.uid\(\) or is_platform_owner\(auth\.uid\(\)\)/)
  })

  it('insert only allows a user to create their own report', () => {
    const section = policySection('feedback_reports_insert_own')
    expect(section).toMatch(/for insert with check \(reporter_id = auth\.uid\(\)\)/)
  })

  it('update is owner-only -- a reporter cannot edit after submission', () => {
    const section = policySection('feedback_reports_update_owner')
    expect(section).toMatch(/for update using \(is_platform_owner\(auth\.uid\(\)\)\) with check \(is_platform_owner\(auth\.uid\(\)\)\)/)
    expect(section).not.toMatch(/reporter_id/)
  })

  it('has no delete policy at all -- an immutable historical record', () => {
    const reportsSection = sql.slice(sql.indexOf('create table feedback_reports'), sql.indexOf('create table feedback_report_status_history'))
    expect(reportsSection).not.toMatch(/for delete/)
  })
})

describe('feedback_report_status_history -- owner-only, matching the append-only audit convention', () => {
  it('is gated entirely on is_platform_owner for every operation', () => {
    const section = policySection('feedback_report_status_history_owner')
    expect(section).toMatch(/for all using \(is_platform_owner\(auth\.uid\(\)\)\) with check \(is_platform_owner\(auth\.uid\(\)\)\)/)
  })
})
