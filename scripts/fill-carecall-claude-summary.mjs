// One-off: reformat the Claude workstream's goal/guardrail with real
// paragraph breaks (the Markdown renderer only starts a new paragraph on a
// blank line, and the original text was one unbroken line per phase), and
// populate its new outcome summary field.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const WORKSTREAM_ID = '1263cb02-4c12-4597-a962-85464d99e7de'

const goal = `Analyze the existing CareCall codebase externally using Claude Code and produce an evidence-backed OpenAPI 3.1 specification describing the application's relevant API capabilities.

**Phase 1 — Capability Discovery.** Inspect the application architecture, identify externally meaningful capabilities, and produce a capability inventory before generating any OpenAPI spec. Do not infer a capability merely because it would logically make sense for the application to have it, and record supporting code evidence for every identified capability where practical.

**Phase 2 — Endpoint Discovery.** For each implemented endpoint/route, determine (where evidence permits) method, route/path, purpose, authentication, authorization considerations, request parameters, request body, response structure, validation, important error responses, and relevant implementation evidence.

**Phase 3 — OpenAPI Generation.** Generate an OpenAPI 3.1 specification from the discovered implementation, labeling every capability CONFIRMED (directly supported by implementation evidence), INFERRED (strongly suggested but not completely established), or UNKNOWN (cannot be reliably determined from the repository).

**Phase 4 — Validation.** Review the generated specification against the implementation, specifically checking for missing endpoints, invented endpoints, incorrect methods, incorrect request/response schemas, missing authentication, incorrect security assumptions, unsupported inferred behavior, duplicated capabilities, and undocumented uncertainty.`

const guardrail = `**Safe Legacy Modernization** — read-only repository analysis.

The external practitioner/AI must not modify application code, not modify infrastructure, not access production systems, and not expose secrets; must not infer unsupported endpoints; must explicitly identify uncertainty; must distinguish evidence from inference; and must preserve references to implementation evidence where practical.`

const summary = `Completed the independent API-discovery assessment. Existing application code was not modified.

**Results:**

- 30 capabilities: 28 CONFIRMED, 2 INFERRED, 0 UNKNOWN
- 22 logical API operations: 21 CONFIRMED, 1 INFERRED, 0 UNKNOWN
- 6 concrete OpenAPI path operations
- Authentication found: Supabase JWT, a presence-only bearer check, a static tool shared secret, no authentication at all (Telnyx webhook), and an opaque body-embedded token with DOB verification
- Parser-based OpenAPI validation: completed with \`@redocly/cli lint\` — 0 errors, 2 warnings after fixing a YAML syntax error and 10 OpenAPI 3.1 \`nullable\`-keyword errors. Both remaining warnings were left unresolved deliberately (no license for an internal artifact; the webhook genuinely has no 4xx response in code)

**Major concerns:**

- \`start-campaign\` accepts any bearer-prefixed value — no real authentication
- Telnyx event webhook has no signature verification
- Checked-in slot RPC lacks the \`p_tz\` parameter used by two callers
- Public booking CORS headers don't allow the headers its own client sends
- Every Edge Function runs as service-role, so these authentication gaps bypass RLS entirely
- Audit records may duplicate complete patient rows (PHI) with no evident retention/redaction
- \`start-campaign\` has no top-level exception handling, unlike its four sibling functions`

const { error } = await admin.from('project_workstreams').update({ goal, guardrail, summary }).eq('id', WORKSTREAM_ID)
if (error) throw error
console.log('Updated goal, guardrail, and summary for the Claude workstream.')
