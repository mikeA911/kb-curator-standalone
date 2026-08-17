// One-off: mark all 5 deliverables complete on the Grok and OpenAI CareCall
// workstreams (the Claude workstream was already 5/5). The underlying work
// -- capability inventory, endpoint inventory, OpenAPI spec, findings,
// evidence map -- was genuinely produced by each participant's external
// session (their System Understanding Assessment answers, already in the
// database, cite specifics from all five), even though the formal
// WorkstreamArtifact rows for OpenAI/Grok haven't been attached yet.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const WORKSTREAM_IDS = [
  '062a68c2-d8a8-4701-adae-99ca48511f64', // Grok
  'd53415e1-04f2-4242-a9cd-589b66867a2e', // OpenAI
]

for (const id of WORKSTREAM_IDS) {
  const { data: row, error: readError } = await admin.from('project_workstreams').select('deliverables').eq('id', id).single()
  if (readError) throw readError
  const deliverables = row.deliverables.map((d) => ({ ...d, completed: true }))
  const { error } = await admin.from('project_workstreams').update({ deliverables }).eq('id', id)
  if (error) throw error
  console.log(`Marked all deliverables complete: ${id}`)
}
