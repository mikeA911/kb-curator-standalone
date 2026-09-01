import { load as loadYaml } from 'js-yaml'

// OL-010: a syntactic/required-section check, not full OpenAPI spec
// compliance -- a real compliance validator (e.g. a bundling/$ref-resolving
// library) is a much heavier dependency than what was actually asked for
// ("validate OpenAPI artifacts syntactically and report missing required
// contract sections"). No OpenAPI-specific validation existed anywhere in
// this repo before this (confirmed by investigation) -- "OpenAPI Discovery"
// elsewhere in the app is a documented human Workbench Method, not runtime
// validation code.

export interface OpenApiValidationResult {
  ok: boolean
  notes: string[]
}

function parseContent(content: string): { doc: unknown; parseError: string | null } {
  // Try JSON first (a stricter subset -- if it parses as JSON, treat it as
  // JSON; YAML is a superset so js-yaml would also accept valid JSON, but a
  // JSON parse error is a clearer signal for content that's clearly meant to
  // be JSON, e.g. starts with '{').
  const trimmed = content.trim()
  try {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return { doc: JSON.parse(trimmed), parseError: null }
    }
    return { doc: loadYaml(trimmed), parseError: null }
  } catch (err) {
    return { doc: null, parseError: err instanceof Error ? err.message : String(err) }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

export function validateOpenApiContent(content: string): OpenApiValidationResult {
  const notes: string[] = []
  const { doc, parseError } = parseContent(content)

  if (parseError) {
    return { ok: false, notes: [`Could not parse as JSON or YAML: ${parseError}`] }
  }
  if (!isPlainObject(doc)) {
    return { ok: false, notes: ['Content is not a JSON/YAML object at the top level.'] }
  }

  if (typeof doc.openapi !== 'string' && typeof doc.swagger !== 'string') {
    notes.push("Missing a top-level 'openapi' (or legacy 'swagger') version field.")
  }

  if (!isPlainObject(doc.info)) {
    notes.push("Missing a top-level 'info' object.")
  } else {
    if (typeof doc.info.title !== 'string' || !doc.info.title.trim()) notes.push("'info.title' is missing.")
    if (typeof doc.info.version !== 'string' || !doc.info.version.trim()) notes.push("'info.version' is missing.")
  }

  if (!isPlainObject(doc.paths) || Object.keys(doc.paths).length === 0) {
    notes.push("Missing a non-empty top-level 'paths' object -- no operations are defined.")
  } else {
    for (const [path, pathItem] of Object.entries(doc.paths)) {
      if (!isPlainObject(pathItem)) {
        notes.push(`Path '${path}' is not an object.`)
        continue
      }
      const operations = Object.entries(pathItem).filter(([key]) => HTTP_METHODS.includes(key))
      if (operations.length === 0) {
        notes.push(`Path '${path}' declares no HTTP method operations.`)
        continue
      }
      for (const [method, operation] of operations) {
        if (!isPlainObject(operation) || !isPlainObject(operation.responses) || Object.keys(operation.responses).length === 0) {
          notes.push(`'${method.toUpperCase()} ${path}' is missing a non-empty 'responses' object.`)
        }
      }
    }
  }

  return { ok: notes.length === 0, notes }
}
