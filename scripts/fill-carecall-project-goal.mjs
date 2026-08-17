// One-off: move the shared 4-phase discovery method up to the project's
// new `goal` field (it's identical across both workstreams by design --
// same method, different AI tool), and clear the now-redundant
// per-workstream copy since the workstream page links back to the project
// instead of repeating it.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PROJECT_ID = '6c11785b-695f-4ae7-b3a8-e3183f489701'
const CLAUDE_WORKSTREAM_ID = '1263cb02-4c12-4597-a962-85464d99e7de'

const goal = `Analyze the existing CareCall codebase externally using Claude Code and produce an evidence-backed OpenAPI 3.1 specification describing the application's relevant API capabilities.

**Phase 1 — Capability Discovery.** Inspect the application architecture, identify externally meaningful capabilities, and produce a capability inventory before generating any OpenAPI spec. Do not infer a capability merely because it would logically make sense for the application to have it, and record supporting code evidence for every identified capability where practical.

**Phase 2 — Endpoint Discovery.** For each implemented endpoint/route, determine (where evidence permits) method, route/path, purpose, authentication, authorization considerations, request parameters, request body, response structure, validation, important error responses, and relevant implementation evidence.

**Phase 3 — OpenAPI Generation.** Generate an OpenAPI 3.1 specification from the discovered implementation, labeling every capability CONFIRMED (directly supported by implementation evidence), INFERRED (strongly suggested but not completely established), or UNKNOWN (cannot be reliably determined from the repository).

**Phase 4 — Validation.** Review the generated specification against the implementation, specifically checking for missing endpoints, invented endpoints, incorrect methods, incorrect request/response schemas, missing authentication, incorrect security assumptions, unsupported inferred behavior, duplicated capabilities, and undocumented uncertainty.`

const { error: projectError } = await admin.from('projects').update({ goal }).eq('id', PROJECT_ID)
if (projectError) throw projectError
console.log('Set project-level goal.')

const { error: workstreamError } = await admin.from('project_workstreams').update({ goal: null }).eq('id', CLAUDE_WORKSTREAM_ID)
if (workstreamError) throw workstreamError
console.log('Cleared the now-redundant per-workstream goal on the Claude workstream.')
