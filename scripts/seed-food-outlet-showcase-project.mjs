// Population script for the "Food Outlet AI-Readiness Showcase" project, per
// Mike's dev request 2026-08-27 (docs/dev-request-food-outlet-ai-readiness-showcase.md).
// Mirrors scripts/seed-carecall-project.mjs's fuller project+workstream
// treatment (not the lighter showcase-library placeholders from
// scripts/seed-showcase-projects.mjs) since this is a real, detailed dev
// request, not a one-line showcase idea. Only Phase 1 gets a workstream --
// Phases 2/3 are recorded in details.phases_2_and_3 as not-yet-started.
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

const PROJECT_NAME = 'Food Outlet AI-Readiness Showcase'

const { data: existingProject } = await admin.from('projects').select('id').eq('name', PROJECT_NAME).maybeSingle()
if (existingProject) {
  console.log(`Project already exists (${existingProject.id}), skipping creation. Delete it first to reseed.`)
  process.exit(0)
}

const { data: project, error: projectError } = await admin
  .from('projects')
  .insert({
    name: PROJECT_NAME,
    project_type: 'experiment',
    objective:
      'Demonstrate that KB Sandbox can guide students and local software houses through a governed process for converting an ordinary business (a food outlet) into an AI-accessible service -- broader than building one Lunch Agent. Pipeline: Food outlet -> KB Sandbox Methods and architecture -> Student/local software builder -> Restaurant API + MCP server + agent skill -> Evaluation and approval in KB Sandbox -> Deployment on Sandz infrastructure -> Use by Ember or another ordering application.',
    status: 'draft',
    details: {
      showcase_category: 'Everyday Business -- Order Lunch',
      method_reference: 'Reuses: Agent Design (Workbench Method, UC13); demonstrates the full Methods -> Agent Registry -> Agent Gateway model',
      dev_request: 'docs/dev-request-food-outlet-ai-readiness-showcase.md',
      supersedes_or_broadens: 'The narrower "OrderLunch Agent (Lunch Agent)" project -- that project\'s single agent is now Phase 1\'s concrete deliverable within this broader showcase, not a separate initiative.',
      current_phase: 'Phase 1 -- Showcase (see workstream)',
      phases_2_and_3: {
        phase_2_design_partner_outlet:
          'Connect to a real outlet\'s POS/order-management system. Adds: real menu and availability, branch selection, live order submission, customer authentication, payment or payment handoff, refund/cancellation rules, operational support, production monitoring. NOT STARTED.',
        phase_3_builder_ecosystem:
          'Students and local software companies create additional outlet connectors/skills using the approved Method, templates, and test suite. Only evaluated versions are listed as approved/production-ready. NOT STARTED.',
      },
      roles: {
        kb_sandbox: 'Method, architecture guidance, evidence, evaluation, certification, and agent registry.',
        builder: 'MCP server, outlet skill, tests, documentation, and maintenance.',
        sandz: 'Hosting, storage, networking, monitoring, and infrastructure support.',
        food_outlet: 'Menu, business rules, system access, merchant authorization, and acceptance.',
        ordering_application: 'User experience, customer relationship, and invocation of the approved service.',
        human_approver: 'Production release and transactional-risk acceptance.',
      },
      commercial_components:
        '1) Readiness and architecture (KB Sandbox-led professional service). 2) Agent/connector development (paid to the builder). 3) KB Sandbox governance licence (recurring platform revenue). 4) Sandz infrastructure (separately priced hosting). 5) Maintenance and support (recurring builder/managed-service revenue). 6) Payment and delivery charges (remain with the merchant/ordering platform). Deliberately NOT taking a percentage of every food order -- avoids disputes over refunds, tax, delivery fees, promotions, and merchant reconciliation.',
      builder_compensation_models: {
        customer_commissioned:
          'Builder 60-75% of the development fee; KB Sandbox 15-25% for architecture/governance/evaluation; referring/delivery partner 10-20% where applicable; Sandz infrastructure quoted separately; builder receives an agreed maintenance fee. Percentages apply only to the shared implementation fee, not Sandz infra or KB Sandbox subscriptions.',
        builder_created_reusable_skill:
          'Suggested recurring licence split: 70% agent/skill owner, 20% KB Sandbox, 10% reserve for payment processing/certification/channel referral (60/25/15 if KB Sandbox provides sales and first-line support).',
        for_this_first_showcase:
          'Avoid revenue sharing entirely -- use a fixed bounty/stipend with clearly defined deliverables. Revenue sharing only becomes relevant once someone actually pays to deploy or licence the resulting skill.',
      },
      ip_boundary:
        'KB Sandbox owns its Methods, evaluation framework, and governance components. The builder owns reusable connector code unless commissioned under different terms. The outlet owns its menu, business data, and merchant-specific configuration. Sandz owns/licenses its infrastructure services. Customer-specific secrets and transactional data are never reusable. A builder grants KB Sandbox and Sandz the rights required to demonstrate, deploy, and support an approved version. Generic improvements can remain reusable; customer-specific knowledge cannot be copied into another deployment.',
      certification_statuses: ['Experimental', 'Sandbox tested', 'Security reviewed', 'Outlet accepted', 'Production approved', 'Deprecated', 'Suspended'],
      certification_tests:
        'Correct menu and pricing; availability handling; duplicate-order prevention; explicit confirmation; authentication and authorization; secret protection; cancellation and failure behavior; logging and metrics; API-version compatibility; data privacy; support ownership.',
      immediate_recommendation:
        'Fixed builder bounty, sandbox-only outlet, KB Sandbox guidance and evaluation, and Sandz hosting donated or discounted for the demonstration. No live payment necessary -- the showcase can stop after a confirmed test order and restaurant-side receipt. Design commercial revenue sharing later, using actual effort and customer interest observed during the project.',
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
    name: 'Phase 1 -- Showcase',
    slug: 'phase-1-showcase',
    status: 'draft',
    repository_scope: [
      'Lunch Agent (external service, to be built separately -- never cloned into or accessed from KB Sandbox)',
    ],
    goal:
      'Using a cooperative food outlet, school canteen, or simulated restaurant: produce a business capability inventory, menu/ordering requirements, an OpenAPI specification, an MCP architecture, transaction/security guardrails, one externally developed Lunch Agent with one outlet skill, test menu and sandbox orders, a KB Sandbox evaluation, a Sandz-hosted demonstration, a structured order preview + confirmation flow, and a logs/metrics/evidence package. No live payment is necessary -- the phase can stop after a confirmed test order and restaurant-side receipt.',
    guardrail:
      'Students/builders work only with test data and sandbox credentials during this phase. A professional reviewer approves any security-sensitive code before it could ever receive production credentials (out of scope for Phase 1). No order is ever submitted from conversational text alone -- a structured preview (outlet, items, total, ETA, payment method) and an explicit human Confirm-order action are mandatory before any order, including test orders, is placed.',
    deliverables: [
      { label: 'Business Capability Inventory', completed: false },
      { label: 'Menu and Ordering Requirements', completed: false },
      { label: 'OpenAPI Specification', completed: false },
      { label: 'MCP Architecture', completed: false },
      { label: 'Transaction and Security Guardrails', completed: false },
      { label: 'Lunch Agent (external reference implementation)', completed: false },
      { label: 'One Outlet Skill (test/simulated outlet)', completed: false },
      { label: 'Test Menu and Sandbox Orders', completed: false },
      { label: 'KB Sandbox Evaluation', completed: false },
      { label: 'Sandz-Hosted Demonstration', completed: false },
      { label: 'Structured Order Preview and Confirmation Flow', completed: false },
      { label: 'Logs, Metrics, and Evidence Package', completed: false },
    ],
    created_by: owner.id,
  })
  .select('id')
  .single()
if (workstreamError || !workstream) throw workstreamError ?? new Error('Failed to create workstream')
console.log(`Created workstream ${workstream.id}`)

console.log(`\nDone. Project: /projects/${project.id}  Workstream: /projects/${project.id}/workstreams/${workstream.id}`)
