// Throwaway verification data for the staff portfolio + member directory +
// notes pass (docs/dev-request-role-aware-project-views-and-ember-first-
// workspace.md, Stage 1). Not a permanent fixture -- run
// verify-portfolio-cleanup.mjs afterward to remove everything this creates.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function findUserByEmail(email) {
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find((u) => u.email === email)
    if (match) return match
    if (data.users.length < 200) return null
    page++
  }
}

const consultant = await findUserByEmail('test-consultant@kbsandbox.local')
if (!consultant) throw new Error('Run `npm run db:seed-users` first')

// Second member, not covered by seed-test-users.mjs -- needed so the Member
// Directory has someone other than the owner to send a note to.
const secondEmail = 'test-consultant2@kbsandbox.local'
let second = await findUserByEmail(secondEmail)
if (!second) {
  const { data: created, error } = await admin.auth.admin.createUser({ email: secondEmail, password: 'QAverify-2026!aA1', email_confirm: true })
  if (error) throw error
  second = created.user
}
await admin
  .from('profiles')
  .upsert({ id: second.id, email: secondEmail, full_name: 'Test Consultant2', role: 'consultant', is_active: true, assigned_kbs: [] })

const { data: project, error: projError } = await admin
  .from('projects')
  .insert({
    name: 'QA Portfolio Verification',
    project_type: 'learning',
    objective: 'Throwaway project for Stage-1 portfolio/member-directory/notes verification.',
    status: 'active',
    owner_id: consultant.id,
    visibility: 'private',
  })
  .select('id')
  .single()
if (projError) throw projError

// create_owner_membership trigger already added consultant as 'owner'.
const { error: memberError } = await admin
  .from('project_members')
  .insert({ project_id: project.id, user_id: second.id, role: 'viewer', status: 'active', business_function: 'delivery_consulting' })
if (memberError) throw memberError

// Required-but-unassigned approval type so the portfolio's "authority gap" badge has something to show.
const { error: policyError } = await admin
  .from('project_approval_policies')
  .insert({ project_id: project.id, approval_type: 'technical', requirement_status: 'required' })
if (policyError) throw policyError

console.log('Project:', project.id, 'QA Portfolio Verification')
console.log('Owner (member persona login): test-consultant@kbsandbox.local')
console.log('Second member (note recipient):', secondEmail, second.id)
