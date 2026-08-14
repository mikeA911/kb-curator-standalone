// One-off population script for the CareCall — API Modernization Assessment
// workbench exercise. Mirrors what createProjectAction / createWorkstreamAction
// insert (see src/app/actions/projects.ts, src/app/actions/workstreams.ts) --
// this only exists because the ProjectWizard UI only ever writes a fixed,
// type-specific subset of `details` keys, and typing five long deliverable
// labels + multi-paragraph goal/guardrail text through the browser is
// error-prone. No schema change; every field used already exists.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: owner, error: ownerError } = await admin
  .from('profiles')
  .select('id, email')
  .eq('email', 'test-curator@kbsandbox.local')
  .single()
if (ownerError || !owner) throw ownerError ?? new Error('test-curator profile not found -- run npm run db:seed-users first')

const { data: existingProject } = await admin.from('projects').select('id').eq('name', 'CareCall — API Modernization Assessment').maybeSingle()
if (existingProject) {
  console.log(`Project already exists (${existingProject.id}), skipping creation. Delete it first to reseed.`)
  process.exit(0)
}

const { data: project, error: projectError } = await admin
  .from('projects')
  .insert({
    name: 'CareCall — API Modernization Assessment',
    project_type: 'experiment',
    objective:
      'Evaluate whether AI-assisted analysis of the existing CareCall application can produce an accurate, defensible OpenAPI specification that represents the capabilities actually supported by the legacy application.',
    status: 'draft',
    notes: null,
    details: {
      description:
        "CareCall is treated as a legacy system for this exercise. Rather than granting KB Sandbox direct repository access, a practitioner uses Claude Code externally, in a separate session, to inspect the CareCall repository; the resulting engineering artifacts (capability inventory, endpoint inventory, OpenAPI spec, findings, evidence map) are then brought back into KB Sandbox as project evidence. The repository itself is never cloned into or made a KB Sandbox knowledge source. Key questions: 1) Can an AI coding assistant accurately discover application/API capabilities from an existing codebase? 2) Can it produce an OpenAPI 3.1 specification grounded in actual implementation evidence? 3) What capabilities does it miss? 4) What does it hallucinate or infer without sufficient evidence? 5) How accurately does it identify authentication, request/response schemas, errors, and important constraints? 6) Can the resulting specification become a reliable foundation for later MCP server development?",
      hypothesis:
        "AI-assisted repository analysis (via Claude Code) can accurately discover CareCall's real API capabilities and produce a defensible OpenAPI 3.1 specification, without fabricating endpoints or behavior it cannot support with implementation evidence.",
      success_criteria:
        'The generated specification\'s CONFIRMED capabilities match CareCall\'s real behavior with traceable code evidence; INFERRED and UNKNOWN items are honestly labeled rather than presented as fact; and the specification is usable as a reliable foundation for later MCP server development.',
      future_evaluation_dimensions:
        'Once implemented, the eventual eval should score the generated OpenAPI spec on: Capability Coverage, Endpoint Accuracy, Schema Fidelity, Authentication/Security Accuracy, Hallucinated Capabilities, Missing Capabilities, Appropriate Uncertainty, and Evidence Traceability -- with the eventual goal of comparing different AI-assisted modernization methods against the same expected-capability benchmark.',
      product_boundary:
        'KB Sandbox does not perform the engineering work itself (that happens externally via Claude Code); it is the workbench that defines scope, captures evidence, evaluates results, and turns the outcome into reusable organizational knowledge.',
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
    status: 'draft',
    repository_scope: [
      'CareCall (external repository -- analyzed in a separate Claude Code session; never cloned into or accessed from KB Sandbox)',
    ],
    goal:
      "Analyze the existing CareCall codebase externally using Claude Code and produce an evidence-backed OpenAPI 3.1 specification describing the application's relevant API capabilities. Method: Phase 1 -- Capability Discovery: inspect the application architecture, identify externally meaningful capabilities, and produce a capability inventory before generating any OpenAPI spec; do not infer a capability merely because it would logically make sense for the application to have it, and record supporting code evidence for every identified capability where practical. Phase 2 -- Endpoint Discovery: for each implemented endpoint/route, determine (where evidence permits) method, route/path, purpose, authentication, authorization considerations, request parameters, request body, response structure, validation, important error responses, and relevant implementation evidence. Phase 3 -- OpenAPI Generation: generate an OpenAPI 3.1 specification from the discovered implementation, labeling every capability CONFIRMED (directly supported by implementation evidence), INFERRED (strongly suggested but not completely established), or UNKNOWN (cannot be reliably determined from the repository). Phase 4 -- Validation: review the generated specification against the implementation, specifically checking for missing endpoints, invented endpoints, incorrect methods, incorrect request/response schemas, missing authentication, incorrect security assumptions, unsupported inferred behavior, duplicated capabilities, and undocumented uncertainty.",
    guardrail:
      'Safe Legacy Modernization -- read-only repository analysis. The external practitioner/AI must not modify application code, not modify infrastructure, not access production systems, and not expose secrets; must not infer unsupported endpoints; must explicitly identify uncertainty; must distinguish evidence from inference; and must preserve references to implementation evidence where practical.',
    deliverables: [
      { label: 'Capability Inventory (carecall-capability-inventory.md)', completed: false },
      { label: 'Endpoint Inventory (carecall-endpoint-inventory.md)', completed: false },
      { label: 'OpenAPI 3.1 Specification (carecall-openapi.yaml)', completed: false },
      { label: 'Validation / Findings Report (carecall-openapi-findings.md)', completed: false },
      { label: 'Evidence Map (carecall-evidence-map.md)', completed: false },
    ],
    created_by: owner.id,
  })
  .select('id')
  .single()
if (workstreamError || !workstream) throw workstreamError ?? new Error('Failed to create workstream')
console.log(`Created workstream ${workstream.id}`)

console.log(`\nDone. Project: /projects/${project.id}  Workstream: /projects/${project.id}/workstreams/${workstream.id}`)
