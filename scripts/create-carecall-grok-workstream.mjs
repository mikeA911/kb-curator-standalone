// One-off: create the third CareCall OpenAPI-discovery workstream (Grok),
// mirroring the Claude/OpenAI workstreams. Goal lives at the project level
// now (same method, three tools) so this workstream's own `goal` stays
// null and the page links back, matching the Claude workstream's shape.
// Only the pasted final-report summary is available -- no artifact files
// were attached for Grok, so deliverables are listed but left unchecked,
// same pattern as the still-unfilled OpenAI workstream.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PROJECT_ID = '6c11785b-695f-4ae7-b3a8-e3183f489701'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'test-curator@kbsandbox.local').single()
if (ownerError || !owner) throw ownerError ?? new Error('test-curator profile not found')

const guardrail = `**Safe Legacy Modernization** — read-only repository analysis.

The external practitioner/AI must not modify application code, not modify infrastructure, not access production systems, and not expose secrets; must not infer unsupported endpoints; must explicitly identify uncertainty; must distinguish evidence from inference; and must preserve references to implementation evidence where practical.`

const summary = `Completed the independent API-discovery assessment. Existing application code was not modified.

**Results:**

- 6 capabilities discovered (5 Edge Function capabilities + staff portal PostgREST/RLS data access)
- 12 documented HTTP operations (5 function POST routes + booking action variants + OPTIONS where coded)
- Confidence: Edge Function behavior treated as CONFIRMED where directly coded; some Telnyx Insights payload shapes and the full RLS policy matrix remain UNKNOWN / partially INFERRED; no fabricated "expected healthcare" capabilities
- Authentication found: Bearer JWT (portal; gateway on for admin-manage), Bearer presence only (start-campaign; gateway JWT off), \`x-carecall-secret\` (assistant-tools), opaque booking token + anon key at gateway (booking-api), none on telnyx-call-events (always HTTP 200)
- OpenAPI validation: YAML structured as OpenAPI 3.1, hand-checked; no heavy external validator run in this environment — syntactic shape is not proof of semantic correctness

**Major ambiguities:**

- Whether \`start-campaign\` should restrict roles vs. accepting any Bearer
- Exact Telnyx Insights payload schema
- How deep the PostgREST/RLS surface should be treated as a second API surface

**Major concerns:**

- Unsigned Telnyx webhook endpoint
- Dialer (\`start-campaign\`) accepts any Bearer without a role check
- Shared tool secret is the sole AI-tool authentication mechanism
- CORS \`*\` on several functions

**Needs human verification:** production auth intent for the dialer, webhook signature hardening, whether PostgREST should be part of the published contract, and live response samples vs. schema looseness.

Success criterion (as defined for this workstream): a traceable hypothesis of CareCall's Edge Function API contract, grounded in implementation evidence, with uncertainty explicit — not a claim that the OpenAPI is complete or "correct" merely because it is valid YAML.`

const deliverables = [
  { label: 'Capability Inventory (carecall-capability-inventory.md)', completed: false },
  { label: 'Endpoint Inventory (carecall-endpoint-inventory.md)', completed: false },
  { label: 'OpenAPI 3.1 Specification (carecall-openapi.yaml)', completed: false },
  { label: 'Validation / Findings Report (carecall-openapi-findings.md)', completed: false },
  { label: 'Evidence Map (carecall-evidence-map.md)', completed: false },
]

const { data, error } = await admin
  .from('project_workstreams')
  .insert({
    project_id: PROJECT_ID,
    name: 'OpenAPI Discovery — Grok',
    slug: 'openapi-discovery-grok',
    status: 'draft',
    repository_scope: ['CareCall (external repository — analyzed in a separate session; never cloned into or accessed from KB Sandbox)'],
    goal: null,
    guardrail,
    deliverables,
    summary,
    created_by: owner.id,
  })
  .select('id')
  .single()
if (error || !data) throw error ?? new Error('Failed to create workstream')

console.log(`Created Grok workstream ${data.id}`)
console.log(`/projects/${PROJECT_ID}/workstreams/${data.id}`)
