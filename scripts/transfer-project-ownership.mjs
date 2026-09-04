import { createClient } from '@supabase/supabase-js'

// Reassigns one or more projects to a different profile -- e.g. handing off
// projects built under a throwaway test-owner (see seed-test-users.mjs) to a
// colleague's own real account once they're ready to test. This only ever
// updates ownership rows (projects.owner_id, project_members); it never
// touches auth.users, so the target's login/password is untouched and they
// don't need to be involved until the projects are ready for them.
//
// Usage:
//   node scripts/transfer-project-ownership.mjs <target-email> <project-id> [project-id ...]
//
// The previous owner's membership is downgraded to 'curator' (not removed),
// so they keep visibility into a project they built without staying its owner.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const [targetEmail, ...projectIds] = process.argv.slice(2)
if (!targetEmail || projectIds.length === 0) {
  console.error('Usage: node scripts/transfer-project-ownership.mjs <target-email> <project-id> [project-id ...]')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function findProfileByEmail(email) {
  const { data, error } = await admin.from('profiles').select('id, email, full_name').eq('email', email).maybeSingle()
  if (error) throw error
  return data
}

const target = await findProfileByEmail(targetEmail)
if (!target) {
  throw new Error(
    `No profile found for ${targetEmail}. This script only transfers to an existing account -- ` +
      `it never creates or modifies auth credentials. Have them sign up first if they haven't already.`
  )
}

for (const projectId of projectIds) {
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, name, owner_id')
    .eq('id', projectId)
    .maybeSingle()
  if (projectError) throw projectError
  if (!project) {
    console.warn(`Skipping ${projectId}: no such project`)
    continue
  }

  const previousOwnerId = project.owner_id

  const { error: updateError } = await admin.from('projects').update({ owner_id: target.id }).eq('id', projectId)
  if (updateError) throw updateError

  const { error: memberError } = await admin
    .from('project_members')
    .upsert({ project_id: projectId, user_id: target.id, role: 'owner', status: 'active' }, { onConflict: 'project_id,user_id' })
  if (memberError) throw memberError

  if (previousOwnerId && previousOwnerId !== target.id) {
    const { error: downgradeError } = await admin
      .from('project_members')
      .update({ role: 'curator' })
      .eq('project_id', projectId)
      .eq('user_id', previousOwnerId)
    if (downgradeError) throw downgradeError
  }

  console.log(`Transferred "${project.name}" (${projectId}) to ${targetEmail}`)
}
