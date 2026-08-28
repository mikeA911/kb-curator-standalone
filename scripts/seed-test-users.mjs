import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

function randomPassword() {
  return crypto.randomBytes(12).toString('base64url') + 'aA1!'
}

const ROLES = ['consultant', 'curator', 'admin']
// 'fhir' dropped -- now retained-for-reference only, assigning it to a new/
// updated profile is rejected by a DB trigger.
const ALL_KBS = ['vbc', 'grants', 'billing']

async function findUserByEmail(email) {
  // supabase-js 2.45 has no getUserByEmail admin method; page through listUsers.
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

const results = []

for (const role of ROLES) {
  const email = `test-${role}@kbsandbox.local`
  const password = randomPassword()

  let userId
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    const existing = await findUserByEmail(email)
    if (!existing) throw createError
    userId = existing.id
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
    if (updateError) throw updateError
  } else {
    userId = created.user.id
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    email,
    full_name: `Test ${role[0].toUpperCase()}${role.slice(1)}`,
    role,
    is_active: true,
    // ALL_KBS entries have since been retired to reference-only, one by one,
    // and a DB trigger now rejects assigning any of them to a profile --
    // leaving this empty for every role rather than chasing which KBs are
    // still assignable (KB assignment isn't needed for this script's purpose).
    assigned_kbs: [],
  })
  if (profileError) throw profileError

  results.push({ role, email, password })
}

console.log('\nSeeded test accounts (password reset to a fresh value on every run):\n')
for (const r of results) {
  console.log(`  ${r.role.padEnd(7)} ${r.email.padEnd(28)} ${r.password}`)
}
