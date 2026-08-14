import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static SQL-shape assertions -- same pattern as workstream-rls.test.ts.
// No live database in this suite.
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260814130001_workstream_artifact_types.sql'), 'utf-8')

describe('workstream_artifacts artifact_type expansion', () => {
  it('drops and recreates the same constraint name -- relies on the standard "<table>_<column>_check" naming, same convention as profiles_role_check', () => {
    expect(sql).toMatch(/drop constraint workstream_artifacts_artifact_type_check/)
    expect(sql).toMatch(/add constraint workstream_artifacts_artifact_type_check/)
  })

  it('adds endpoint_inventory and evidence_map without renaming or dropping any existing value', () => {
    const start = sql.indexOf('add constraint workstream_artifacts_artifact_type_check')
    const section = sql.slice(start, start + 400)
    for (const value of [
      'capability_inventory',
      'endpoint_inventory',
      'openapi_spec',
      'mcp_server',
      'evidence_map',
      'test_results',
      'findings',
      'other',
    ]) {
      expect(section).toMatch(new RegExp(`'${value}'`))
    }
  })
})
