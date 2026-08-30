// Removes everything verify-portfolio-setup.mjs created. Leaves the standing
// test-admin/test-curator/test-consultant accounts (seed-test-users.mjs)
// untouched -- those are reused across sessions.
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

const { data: project } = await admin.from('projects').select('id').eq('name', 'QA Portfolio Verification').maybeSingle()
if (project) {
  const { error } = await admin.from('projects').delete().eq('id', project.id)
  if (error) throw error
  console.log('Deleted project', project.id, '(cascaded members/notes/approval policies)')
} else {
  console.log('QA Portfolio Verification project already gone')
}

const second = await findUserByEmail('test-consultant2@kbsandbox.local')
if (second) {
  await admin.from('profiles').delete().eq('id', second.id)
  const { error } = await admin.auth.admin.deleteUser(second.id)
  if (error) throw error
  console.log('Deleted test-consultant2 auth user + profile')
} else {
  console.log('test-consultant2 already gone')
}

const { count } = await admin.from('projects').select('id', { count: 'exact', head: true })
console.log('Projects remaining in DB:', count)
