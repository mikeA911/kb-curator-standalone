import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

// This utility is intentionally separate from seed-test-users.mjs. It may
// manage only the temporary accounts reserved for Codex-led builder testing.
// Requiring an explicit persona prevents an accidental bulk password reset.
const PERSONAS = {
  builder: {
    email: 'test-builder@kbsandbox.local',
    role: 'admin',
    fullName: 'Test Builder',
  },
  'builder-user': {
    email: 'test-user-for-builder@kbsandbox.local',
    // `consultant` is currently the lowest ordinary authenticated platform
    // role. Change this when the proposed least-privileged User role ships.
    role: 'consultant',
    fullName: 'Test User for Builder',
  },
}

function readPersonaArgument(argv) {
  const index = argv.indexOf('--persona')
  const slug = index >= 0 ? argv[index + 1] : undefined

  if (!slug || !(slug in PERSONAS)) {
    const allowed = Object.keys(PERSONAS).join(', ')
    throw new Error(`Pass exactly one allowed persona with --persona <name>. Allowed: ${allowed}`)
  }

  return slug
}

function randomPassword() {
  return `${crypto.randomBytes(12).toString('base64url')}aA1!`
}

async function findUserByEmail(admin, email) {
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error

    const match = data.users.find((user) => user.email === email)
    if (match) return match
    if (data.users.length < 200) return null
    page += 1
  }
}

const slug = readPersonaArgument(process.argv.slice(2))
const persona = PERSONAS[slug]
const password = randomPassword()
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let userId
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: persona.email,
  password,
  email_confirm: true,
})

if (createError) {
  const existing = await findUserByEmail(admin, persona.email)
  if (!existing) throw createError

  userId = existing.id
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
  if (updateError) throw updateError
} else {
  userId = created.user.id
}

const { error: profileError } = await admin.from('profiles').upsert({
  id: userId,
  email: persona.email,
  full_name: persona.fullName,
  role: persona.role,
  is_active: true,
  assigned_kbs: [],
})

if (profileError) throw profileError

console.log(`Seeded ${slug} (${persona.email}) with platform role ${persona.role}.`)
console.log(`Temporary password: ${password}`)

