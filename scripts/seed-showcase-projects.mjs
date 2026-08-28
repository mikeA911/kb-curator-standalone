// Batch placeholder-creation script for the Showcase Project Library
// (docs/design-notes/showcase-project-library-and-methods.md). Creates one
// lightweight draft Project per showcase entry that doesn't already have a
// real project -- "OpenAPI Discovery -- CareCall" is skipped because
// "CareCall -- API Modernization Assessment" (scripts/seed-carecall-project.mjs)
// already covers it. Each entry gets a `details.showcase_category` and
// `details.method_reference` tag so the taxonomy is queryable without a
// schema change (see the plan doc's section 2 schema recommendation).
//
// These are placeholders, not full builds: objective + a short description
// only, no workstreams -- mirrors the "create the placeholders first" scope,
// distinct from scripts/seed-carecall-project.mjs's fuller treatment (which
// already has its own project + workstream).
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

const PROJECTS = [
  {
    name: 'HR Policy Copilot',
    project_type: 'knowledge',
    category: 'Everyday Business -- HR',
    method_reference: 'New Method: Governed Q&A & Grounded Drafting (Workbench Method)',
    objective: 'Answer employee HR-policy questions (e.g. "Can I carry unused leave into next year?") grounded in the approved HR policy Wiki, with citations and an explicit gap flag when the policy is silent.',
  },
  {
    name: 'Employee Onboarding',
    project_type: 'knowledge',
    category: 'Everyday Business -- HR',
    method_reference: 'New Method: Guided Onboarding / Role-Specific Guide Assembly (Workbench Method)',
    objective: 'Assemble a role-specific onboarding guide from approved company policies and processes, sequenced for a given role, with a gap list for anything that role needs but has no approved source yet.',
  },
  {
    name: 'HR Policy Comparison',
    project_type: 'knowledge',
    category: 'Everyday Business -- HR',
    method_reference: 'New Method: Document/Policy Comparison (Workbench Method)',
    objective: 'Compare an old and new version of an employee policy and classify each change as material, clarifying, or administrative, with an evidence map back to the compared clauses.',
  },
  {
    name: 'Accounting Policy Copilot',
    project_type: 'knowledge',
    category: 'Everyday Business -- Accounting',
    method_reference: 'Reuses: Governed Q&A & Grounded Drafting (Workbench Method)',
    objective: 'Explain expense, reimbursement, and approval rules to staff with citations back to the approved accounting policy, grounded rather than paraphrased from memory.',
  },
  {
    name: 'Invoice / Expense Review',
    project_type: 'consulting',
    category: 'Everyday Business -- Accounting',
    method_reference: 'New Method: Structured Rule-Based Review with Human Approval (Workbench Method)',
    objective: 'Check synthetic expense claims against the reimbursement policy, flag violations and ambiguous cases, and route every exception to a human approver -- never auto-approve or auto-reject.',
  },
  {
    name: 'Month-End Close Assistant',
    project_type: 'knowledge',
    category: 'Everyday Business -- Accounting',
    method_reference: 'New Method: Reusable Workflow/Checklist Generation (Workbench Method)',
    objective: 'Generate a reusable month-end close checklist from documented close procedures, folding in lessons from prior-close notes and flagging any undocumented step.',
  },
  {
    name: 'Procurement Assistant',
    project_type: 'consulting',
    category: 'Everyday Business -- Procurement/RFPs',
    method_reference: 'New Method: Multi-Document Comparative Scoring (Workbench Method)',
    objective: 'Compare three vendor proposals against a common RFP requirement set, scoring coverage and fit per requirement rather than letting each proposal frame its own comparison.',
  },
  {
    name: 'Contract Review Workspace',
    project_type: 'consulting',
    category: 'Everyday Business -- Procurement/PMO',
    method_reference: 'Reuses (pattern): Structured Rule-Based Review with Human Approval (Workbench Method)',
    objective: 'Identify a contract\'s obligations, deviations from standard terms, and specific questions requiring legal review -- findings only, legal makes the actual call.',
  },
  {
    name: 'Sales Proposal Copilot',
    project_type: 'knowledge',
    category: 'Everyday Business -- Sales',
    method_reference: 'Reuses (drafting mode): Governed Q&A & Grounded Drafting (Workbench Method)',
    objective: 'Draft an evidence-backed sales proposal grounded strictly in approved product/pricing knowledge, never inventing a capability or price that isn\'t in an approved source.',
  },
  {
    name: 'Customer Support Copilot',
    project_type: 'knowledge',
    category: 'Everyday Business -- Support',
    method_reference: 'Reuses (+ escalation guardrail): Governed Q&A & Grounded Drafting (Workbench Method)',
    objective: 'Answer customer support questions from approved knowledge and escalate to a human rather than guess whenever the approved knowledge doesn\'t clearly settle the question.',
  },
  {
    name: 'SOP / Operations Copilot',
    project_type: 'knowledge',
    category: 'Everyday Business -- PMO',
    method_reference: 'Reuses: Governed Q&A & Grounded Drafting (Workbench Method)',
    objective: 'Answer "what should I do when X happens?" operational questions grounded in approved SOP documentation, with citations back to the specific procedure.',
  },
  {
    name: 'Policy / Regulatory Change Impact',
    project_type: 'consulting',
    category: 'Everyday Business -- PMO',
    method_reference: 'Reuses (impact variant): Document/Policy Comparison (Workbench Method)',
    objective: 'Given a new external rule, determine which internal documents/processes are affected and classify each as must-change, should-review, or no-impact.',
  },
  {
    name: 'Vendor/Product Evaluation',
    project_type: 'experiment',
    category: 'Everyday Business -- Procurement',
    method_reference: 'Reuses: Multi-Document Comparative Scoring (Workbench Method)',
    objective: 'Compare vendors or products against one common requirement set, ranking each against the requirements rather than against each other\'s own marketing framing.',
  },
  {
    name: 'AI Model Selection',
    project_type: 'experiment',
    category: 'AI Engineering -- Model Comparison',
    method_reference: 'Reuses: AI Model Evaluation (Workbench Method, UC10)',
    objective: 'Compare Claude, Gemini, Grok, and other candidate models on the organization\'s own workload and evidence, favoring real task performance over generic leaderboard scores.',
  },
  {
    name: 'Legacy Documentation Recovery',
    project_type: 'transformation',
    category: 'Technology & Modernization -- System Understanding',
    method_reference: 'Reuses: Documentation Recovery (Workbench Method, UC8)',
    objective: 'Reconstruct missing or outdated technical documentation for an undocumented application from its actual implementation, labeling confirmed vs. inferred detail.',
  },
  {
    name: 'Code Review',
    project_type: 'experiment',
    category: 'Technology & Modernization -- Code Review',
    method_reference: 'Reuses: Code Review Comparison (Workbench Method, UC7)',
    objective: 'Have independent models review the same codebase or change and compare their findings -- agreement, disagreement, unique findings, and false positives.',
  },
  {
    name: 'Refactoring Assessment',
    project_type: 'transformation',
    category: 'Technology & Modernization -- Refactoring',
    method_reference: 'Reuses: Refactoring Plan (Workbench Method, UC17)',
    objective: 'Produce an evidence-backed staged refactoring plan for an existing application without modifying any production code -- the plan becomes an external implementation handoff.',
  },
  {
    name: 'New Feature on Legacy System',
    project_type: 'transformation',
    category: 'Technology & Modernization -- Feature Introduction',
    method_reference: 'Reuses: Legacy Feature Introduction (Workbench Method, UC15)',
    objective: 'Determine how a new user story affects an existing, possibly poorly-documented application -- capability reuse, architecture impact, API/MCP impact, and regression risk.',
  },
  {
    name: 'AI Infrastructure Benchmark',
    project_type: 'experiment',
    category: 'AI Engineering -- Infrastructure Benchmarking',
    method_reference: 'Reuses (extended to 3 tiers): Local vs Cloud AI (Workbench Method, UC12)',
    objective: 'Compare cloud, regional, and edge/local architecture options for an AI workload on quality, privacy, cost, latency, and operational grounds.',
  },
  {
    name: 'KABATONE Visual/Edge AI',
    project_type: 'experiment',
    category: 'Industry Labs -- KABATONE Smart City',
    method_reference: 'New Method: Multimodal/Edge AI Architecture Placement (Workbench Method)',
    objective: 'Determine where each stage of a CCTV/multimodal pipeline -- inference, storage, cross-camera correlation -- should run: cloud, regional, or edge.',
  },
  {
    name: 'Semiconductor 8D Investigation',
    project_type: 'consulting',
    category: 'Industry Labs -- Semiconductor Quality',
    method_reference: 'New Method: Structured Incident/Failure Investigation (Workbench Method)',
    objective: 'Investigate a synthetic manufacturing failure using the 8D framework, grounding each step in submitted evidence and flagging any step where evidence is missing.',
  },
  {
    name: 'Semiconductor Supplier Audit',
    project_type: 'consulting',
    category: 'Industry Labs -- Semiconductor Quality',
    method_reference: 'Reuses (+ CAP deliverable): Structured Rule-Based Review with Human Approval (Workbench Method)',
    objective: 'Assess supplier compliance evidence against supplier requirements, flag gaps, and draft a Corrective Action Plan for human approval.',
  },
  {
    name: 'School AI Laboratory',
    project_type: 'learning',
    category: 'Education',
    method_reference: 'Reuses: Experiment Replication/Application (Workbench Method, UC18)',
    objective: 'Students reproduce or apply an existing Workbench experiment across different models, with the same evidence and constraints, for reproducible research practice.',
  },
  {
    name: 'OrderLunch Agent (Lunch Agent)',
    project_type: 'experiment',
    category: 'Everyday Business -- Order Lunch',
    method_reference: 'Reuses: Agent Design (Workbench Method, UC13)',
    objective: 'Design (not yet build) a Lunch Agent: KB Sandbox designs and governs the agent spec via the Agent Design method; the agent itself runs externally (Sandz-managed regional infrastructure, customer infrastructure, or a serverless service) and is reached through a registered MCP/HTTPS endpoint via a controlled agent gateway. Ember never calls a restaurant API directly -- it calls the Lunch Agent, which selects the appropriate outlet skill (Jollibee, McDonald\'s PH, GrabFood, Foodpanda, local canteen, phone/manual fallback). Every order requires a structured preview (outlet, items, total, ETA, payment method) and an explicit human Confirm-order action before anything is placed -- no order is ever submitted from conversational text alone.',
  },
]

for (const spec of PROJECTS) {
  const { data: existingProject } = await admin.from('projects').select('id').eq('name', spec.name).maybeSingle()
  if (existingProject) {
    console.log(`[skip] ${spec.name} already exists (${existingProject.id})`)
    continue
  }

  const { data: project, error: projectError } = await admin
    .from('projects')
    .insert({
      name: spec.name,
      project_type: spec.project_type,
      objective: spec.objective,
      status: 'draft',
      details: {
        showcase_category: spec.category,
        method_reference: spec.method_reference,
        description: 'Showcase library placeholder (docs/design-notes/showcase-project-library-and-methods.md) -- objective and method reference only, no workstream yet.',
      },
      owner_id: owner.id,
    })
    .select('id')
    .single()
  if (projectError || !project) throw projectError ?? new Error(`Failed to create project ${spec.name}`)

  console.log(`[created] ${spec.name} (${project.id})`)
}

console.log('\nDone. "OpenAPI Discovery -- CareCall" was intentionally skipped -- already covered by the existing "CareCall -- API Modernization Assessment" project.')
