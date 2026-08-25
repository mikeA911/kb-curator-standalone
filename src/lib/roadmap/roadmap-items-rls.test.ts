import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n')

const sql = read('supabase/migrations/20260825130001_roadmap_register.sql')

describe('roadmap_items RLS', () => {
  it('is gated entirely on is_platform_owner, select and write alike', () => {
    const start = sql.lastIndexOf('create policy "roadmap_items_owner"')
    const section = sql.slice(start)
    expect(section).toMatch(/for all using \(is_platform_owner\(auth\.uid\(\)\)\) with check \(is_platform_owner\(auth\.uid\(\)\)\)/)
  })

  it('status is bounded to the Markdown roadmap\'s own status-term vocabulary', () => {
    expect(sql).toMatch(
      /check \(status in \(\s*'captured', 'assessing', 'proposed', 'approved', 'in_progress', 'validate', 'done', 'deferred', 'declined', 'superseded'\s*\)\)/
    )
  })

  it('item_ref is unique -- seeding is idempotent via on conflict do nothing', () => {
    expect(sql).toMatch(/item_ref text not null unique/)
    expect(sql).toMatch(/on conflict \(item_ref\) do nothing/)
  })

  it('seeds all sixteen current register rows', () => {
    for (let n = 1; n <= 16; n++) {
      const ref = `OR-${String(n).padStart(3, '0')}`
      expect(sql, `${ref} should be seeded`).toMatch(new RegExp(`'${ref}'`))
    }
  })
})
