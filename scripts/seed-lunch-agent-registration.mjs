// Registers the Lunch Agent as external_agents row #1, giving the new Agent
// Registry (docs/dev-request-food-outlet-ai-readiness-showcase.md,
// docs/commercial/KB-Sandbox-Builders-Programme-for-Sandz.docx) real, on-
// theme content the moment it ships. Requires
// supabase/migrations/20260827150001_external_agent_registry.sql to already
// be applied.
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

const { data: showcase, error: showcaseError } = await admin
  .from('projects')
  .select('id')
  .eq('name', 'Food Outlet AI-Readiness Showcase')
  .single()
if (showcaseError || !showcase) throw showcaseError ?? new Error('Food Outlet AI-Readiness Showcase project not found -- run scripts/seed-food-outlet-showcase-project.mjs first')

const NAME = 'Lunch Agent'
const { data: existing } = await admin.from('external_agents').select('id').eq('name', NAME).maybeSingle()
if (existing) {
  console.log(`${NAME} already registered (${existing.id}), skipping. Delete it first to reseed.`)
  process.exit(0)
}

const { data: agent, error: agentError } = await admin
  .from('external_agents')
  .insert({
    name: NAME,
    slug: 'lunch-agent',
    purpose:
      'Order lunch for a project team from an approved nearby outlet, within a spending limit, with an explicit structured confirmation before any order is submitted. First reference implementation for the Agent Registry, and Phase 1 deliverable of the Food Outlet AI-Readiness Showcase.',
    protocol: 'mcp',
    endpoint_url: null,
    project_id: showcase.id,
    status: 'draft',
    created_by: owner.id,
  })
  .select('id')
  .single()
if (agentError || !agent) throw agentError ?? new Error('Failed to register agent')
console.log(`Registered agent ${agent.id}`)

const { data: version, error: versionError } = await admin
  .from('external_agent_versions')
  .insert({
    external_agent_id: agent.id,
    version_number: 1,
    skills: [
      { name: 'jollibee', description: 'Jollibee outlet ordering skill (menu, branch, order placement)', provider: 'Jollibee' },
      { name: 'mcdonalds_ph', description: "McDonald's PH outlet ordering skill", provider: "McDonald's Philippines" },
      { name: 'grabfood', description: 'GrabFood aggregator ordering skill, where merchant/platform authorized', provider: 'GrabFood' },
      { name: 'foodpanda', description: 'Foodpanda aggregator ordering skill, where merchant/platform authorized', provider: 'Foodpanda' },
      { name: 'local_canteen', description: 'Cooperative/simulated local canteen skill -- the Phase 1 showcase target', provider: 'Local canteen' },
      { name: 'phone_manual_fallback', description: 'Phone/manual-order fallback for outlets with no digital ordering interface', provider: 'Manual' },
    ],
    credentials_policy: {
      name: 'lunch-agent-outlet-credentials',
      storage_location: 'Sandz-managed secret store (Phase 1: sandbox credentials only)',
      notes: 'No production secrets during Phase 1 -- students/builders work only with test data and sandbox credentials per the dev request.',
    },
    spending_limits: { perOrderMax: 2500, currency: 'PHP' },
    approval_policy: {
      requiresHumanConfirmation: true,
      confirmationFields: ['outlet', 'branch', 'items', 'quantities', 'modifiers', 'delivery_destination', 'fees', 'total_cost', 'payment_method'],
    },
    permitted_scope: { projectIds: [showcase.id] },
    notes: 'Initial registration -- Phase 1 showcase, sandbox-only, no live payment. See docs/dev-request-food-outlet-ai-readiness-showcase.md.',
    created_by: owner.id,
  })
  .select('id')
  .single()
if (versionError || !version) throw versionError ?? new Error('Failed to create initial version')
console.log(`Created version ${version.id}`)

const { error: updateError } = await admin.from('external_agents').update({ active_version_id: version.id }).eq('id', agent.id)
if (updateError) throw updateError

console.log(`\nDone. Agent Registry: /agent-registry/${agent.id}`)
