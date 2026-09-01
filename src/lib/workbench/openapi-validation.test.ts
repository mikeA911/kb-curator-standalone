import { describe, it, expect } from 'vitest'
import { validateOpenApiContent } from './openapi-validation'

const VALID_SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Outlet API', version: '1.0.0' },
  paths: {
    '/menu': {
      get: {
        responses: { '200': { description: 'OK' } },
      },
    },
  },
})

describe('validateOpenApiContent', () => {
  it('passes a minimal but complete spec', () => {
    const result = validateOpenApiContent(VALID_SPEC)
    expect(result).toEqual({ ok: true, notes: [] })
  })

  it('accepts YAML content, not just JSON', () => {
    const yamlSpec = `
openapi: "3.0.0"
info:
  title: Outlet API
  version: "1.0.0"
paths:
  /menu:
    get:
      responses:
        "200":
          description: OK
`
    expect(validateOpenApiContent(yamlSpec).ok).toBe(true)
  })

  it('flags a missing openapi/swagger version field', () => {
    const doc = JSON.parse(VALID_SPEC)
    delete doc.openapi
    const result = validateOpenApiContent(JSON.stringify(doc))
    expect(result.ok).toBe(false)
    expect(result.notes.some((n) => n.includes('openapi'))).toBe(true)
  })

  it('flags a missing info object', () => {
    const doc = JSON.parse(VALID_SPEC)
    delete doc.info
    const result = validateOpenApiContent(JSON.stringify(doc))
    expect(result.ok).toBe(false)
    expect(result.notes.some((n) => n.includes("'info'"))).toBe(true)
  })

  it('flags a missing info.title and info.version individually', () => {
    const doc = JSON.parse(VALID_SPEC)
    doc.info = {}
    const result = validateOpenApiContent(JSON.stringify(doc))
    expect(result.notes).toContain("'info.title' is missing.")
    expect(result.notes).toContain("'info.version' is missing.")
  })

  it('flags an empty paths object', () => {
    const doc = JSON.parse(VALID_SPEC)
    doc.paths = {}
    const result = validateOpenApiContent(JSON.stringify(doc))
    expect(result.ok).toBe(false)
    expect(result.notes.some((n) => n.includes("'paths'"))).toBe(true)
  })

  it('flags an operation missing a responses object', () => {
    const doc = JSON.parse(VALID_SPEC)
    delete doc.paths['/menu'].get.responses
    const result = validateOpenApiContent(JSON.stringify(doc))
    expect(result.ok).toBe(false)
    expect(result.notes.some((n) => n.includes('responses'))).toBe(true)
  })

  it('flags a path with no HTTP method operations', () => {
    const doc = JSON.parse(VALID_SPEC)
    doc.paths['/empty'] = { description: 'nothing here' }
    const result = validateOpenApiContent(JSON.stringify(doc))
    expect(result.ok).toBe(false)
    expect(result.notes.some((n) => n.includes('/empty'))).toBe(true)
  })

  it('handles malformed YAML/JSON without throwing', () => {
    const result = validateOpenApiContent('{ this is not valid: [')
    expect(result.ok).toBe(false)
    expect(result.notes.length).toBeGreaterThan(0)
  })

  it('handles non-object top-level content without throwing', () => {
    const result = validateOpenApiContent('just a plain string')
    expect(result.ok).toBe(false)
  })
})
