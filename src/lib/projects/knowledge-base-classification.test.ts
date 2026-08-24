import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260824120001_knowledge_base_classification.sql'),
  'utf8'
)

describe('knowledge base classification migration', () => {
  it('adds constrained classification and lifecycle metadata', () => {
    expect(sql).toMatch(/classification text not null default 'platform'/)
    expect(sql).toMatch(/lifecycle_status text not null default 'active'/)
    expect(sql).toMatch(/origin text/)
  })

  it('retains the Rhubarb domains as reference samples', () => {
    expect(sql).toMatch(/classification = 'legacy_sample'/)
    expect(sql).toMatch(/lifecycle_status = 'reference'/)
    expect(sql).toMatch(/origin = 'Rhubarb'/)
    for (const id of ['fhir', 'vbc', 'grants', 'billing']) expect(sql).toContain(`'${id}'`)
  })

  it('creates the active AI Engineering and RAG curation knowledge base', () => {
    expect(sql).toContain("'ai_engineering'")
    expect(sql).toContain("'AI Engineering & RAG Curation'")
  })

  it('removes legacy curator assignments while preserving unrelated assignments', () => {
    expect(sql).toMatch(/array_remove\(array_remove\(array_remove\(array_remove\(assigned_kbs/)
    expect(sql).toMatch(/array_append[\s\S]*'ai_engineering'/)
  })

  it('adds database backstops against new references to inactive knowledge bases', () => {
    expect(sql).toContain('documents_require_active_kb')
    expect(sql).toContain('curation_queue_require_active_kb')
    expect(sql).toContain('knowledge_bases_active_project_attachment')
    expect(sql).toContain('profiles_require_active_kb_assignments')
  })
})
