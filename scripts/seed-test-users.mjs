import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

function randomPassword() {
  return crypto.randomBytes(12).toString('base64url') + 'aA1!'
}

// slug drives the email/full_name; role is the actual profiles.role value.
// "Builder" isn't a distinct profiles.role (per OR-019/OR-026, any signed-in
// non-anonymous user can self-register in the Builder Registry) -- it maps
// to 'consultant', same as an ordinary member, distinguished only by slug/
// full_name so it reads clearly as its own persona in the UI and test docs.
const PERSONAS = [
  { slug: 'consultant', role: 'consultant', fullName: 'Test Consultant' },
  { slug: 'curator', role: 'curator', fullName: 'Test Curator' },
  { slug: 'admin', role: 'admin', fullName: 'Test Admin' },
  { slug: 'builder', role: 'consultant', fullName: 'Test Builder' },
]

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

for (const persona of PERSONAS) {
  const email = `test-${persona.slug}@kbsandbox.local`
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
    full_name: persona.fullName,
    role: persona.role,
    is_active: true,
    // ALL_KBS entries have since been retired to reference-only, one by one,
    // and a DB trigger now rejects assigning any of them to a profile --
    // leaving this empty for every role rather than chasing which KBs are
    // still assignable (KB assignment isn't needed for this script's purpose).
    assigned_kbs: [],
  })
  if (profileError) throw profileError

  results.push({ slug: persona.slug, role: persona.role, email, password })
}

console.log('\nSeeded test accounts (password reset to a fresh value on every run):\n')
for (const r of results) {
  console.log(`  ${r.slug.padEnd(10)} role=${r.role.padEnd(10)} ${r.email.padEnd(28)} ${r.password}`)
}
