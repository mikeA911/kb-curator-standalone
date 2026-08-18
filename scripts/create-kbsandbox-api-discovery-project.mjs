// M5F Phase B: dogfood the OpenAPI Discovery methodology on KB Sandbox
// itself, in the same shape as the CareCall project -- but analyzed
// directly by Claude with full repository read access (no external
// session needed, unlike CareCall, since this repo IS the target).
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('mike.aguilar profile not found')

const goal = `Analyze the KB Sandbox repository itself using the same OpenAPI Discovery methodology already demonstrated on CareCall, and produce an evidence-backed record of its actual current API surface -- direct input to the M5F "Small Workbench API" design phase.

**Phase 1 — Architecture Orientation.** Inspect the application architecture, identify where routes/API behavior actually live, and confirm or rule out the existence of conventional HTTP route handlers before assuming any exist.

**Phase 2 — Capability Discovery.** Inspect the application architecture, identify externally meaningful capabilities, and produce a capability inventory before generating any OpenAPI spec. Do not infer a capability merely because it would logically make sense for the application to have it, and record supporting code evidence for every identified capability where practical.

**Phase 3 — Endpoint Discovery.** For each implemented operation, determine (where evidence permits) its real invocation mechanism (Server Action vs. HTTP route vs. direct database access), purpose, authentication, authorization considerations, request parameters, response structure, and relevant implementation evidence.

**Phase 4 — Security Discovery.** Determine the actual authentication and authorization model, including any places where more than one enforcement layer exists (e.g. an application-layer check plus a separate database-layer policy), and which layer is the real gate.

**Phase 5 — OpenAPI Generation.** Generate an OpenAPI 3.1 specification from the discovered implementation, labeling every capability CONFIRMED (directly supported by implementation evidence), INFERRED (strongly suggested but not completely established), or UNKNOWN (cannot be reliably determined from the repository). Do not populate \`paths\` with operations that are not actually HTTP-callable today.

**Phase 6 — Validation.** Review the generated specification against the implementation, specifically checking for missing capabilities, invented endpoints, incorrect authorization assumptions, and undocumented uncertainty.

This project exists specifically because the M5F design note requires documenting the interface that actually exists before designing the Workbench API/MCP layer that would sit on top of it -- not writing the API KB Sandbox wishes it had.`

const { data: project, error: projectError } = await admin
  .from('projects')
  .insert({
    name: 'KB Sandbox — API Discovery',
    project_type: 'transformation',
    objective: 'Document KB Sandbox\'s actual current API surface as evidence-backed input to the Workbench API / MCP design phase (M5F).',
    status: 'active',
    notes: null,
    goal,
    details: {
      hypothesis:
        'The same OpenAPI Discovery methodology already validated on an external legacy application (CareCall) can be applied to KB Sandbox itself, run directly with full repository access rather than through an external session, and will surface a real, decision-relevant architectural fact (not just a routine documentation exercise).',
      description:
        'KB Sandbox is treated as the subject of its own discovery process. Unlike the CareCall workstream, this repository IS the one being analyzed -- there is no external-session constraint, so the discovery is performed directly with full read access to source, migrations, and tests.',
      product_boundary:
        'This project produces only the five OpenAPI Discovery artifacts and a System Understanding assessment (M5F Phase B). It does not design the Workbench API, MCP server, or Assistant UI -- those are explicitly deferred to later, separately-planned phases pending human review of this output.',
      success_criteria:
        'The five artifacts accurately reflect the codebase as of the pinned commit, with every claim traceable to a specific file; the System Understanding assessment is answered with real evidence, not assumptions; a human reviewer can use this output to make the Phase C design decision without re-deriving the discovery themselves.',
    },
    owner_id: owner.id,
  })
  .select('id')
  .single()
if (projectError || !project) throw projectError ?? new Error('Failed to create project')
console.log(`Created project ${project.id}`)

const { data: workstream, error: workstreamError } = await admin
  .from('project_workstreams')
  .insert({
    project_id: project.id,
    name: 'OpenAPI Discovery',
    slug: 'openapi-discovery',
    status: 'active',
    repository_scope: ['https://github.com/mikeA911/kb-curator-standalone (this repository, pinned to commit 9250a37890738712240dd4da8e43a0bfe6b38f09 for reproducibility)'],
    goal: null,
    guardrail:
      '**Read-Only Self-Analysis** — the discovery process must not modify application code, must not invent capabilities or endpoints that do not exist, must explicitly classify every claim CONFIRMED/INFERRED/UNKNOWN, and must not treat the near-empty OpenAPI `paths` object as an incomplete result -- it is the discovered fact this exercise exists to surface.',
    deliverables: [
      { label: 'Capability Inventory (kbsandbox-capability-inventory.md)', completed: true },
      { label: 'Endpoint Inventory (kbsandbox-endpoint-inventory.md)', completed: true },
      { label: 'OpenAPI 3.1 Specification (kbsandbox-openapi.yaml)', completed: true },
      { label: 'Validation / Findings Report (kbsandbox-openapi-findings.md)', completed: true },
      { label: 'Evidence Map (kbsandbox-evidence-map.md)', completed: true },
    ],
    summary: null,
    created_by: owner.id,
  })
  .select('id')
  .single()
if (workstreamError || !workstream) throw workstreamError ?? new Error('Failed to create workstream')
console.log(`Created workstream ${workstream.id}`)

console.log(`\nPROJECT_ID=${project.id}`)
console.log(`WORKSTREAM_ID=${workstream.id}`)
