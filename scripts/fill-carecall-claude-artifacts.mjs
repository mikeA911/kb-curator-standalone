// One-off: populate the CareCall "OpenAPI Discovery" (Claude Code) workstream
// with real artifact content read directly from the local discovery output,
// and mark all 5 deliverables complete. Fixes the two artifacts the user
// attached by hand (title case, and a local filesystem path in `external_url`
// that isn't usable evidence for anyone else -- content is now what's real).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const WORKSTREAM_ID = '1263cb02-4c12-4597-a962-85464d99e7de'
const DOCS_DIR = 'C:\\Users\\mikea\\projects\\CareCall\\docs\\openapi-discovery'
const read = (name) => readFileSync(`${DOCS_DIR}\\${name}`, 'utf-8')

const { data: existing, error: existingError } = await admin
  .from('workstream_artifacts')
  .select('id, artifact_type')
  .eq('workstream_id', WORKSTREAM_ID)
if (existingError) throw existingError
const byType = Object.fromEntries(existing.map((a) => [a.artifact_type, a.id]))

async function upsertArtifact(artifactType, title, filename) {
  const content = read(filename)
  const existingId = byType[artifactType]
  if (existingId) {
    const { error } = await admin
      .from('workstream_artifacts')
      .update({ title, content, external_url: null })
      .eq('id', existingId)
    if (error) throw error
    console.log(`Updated ${artifactType} (${existingId})`)
  } else {
    const { error } = await admin.from('workstream_artifacts').insert({
      workstream_id: WORKSTREAM_ID,
      artifact_type: artifactType,
      title,
      external_tool: 'Claude Code',
      content,
    })
    if (error) throw error
    console.log(`Inserted ${artifactType}`)
  }
}

await upsertArtifact('capability_inventory', 'Capability Inventory', 'carecall-capability-inventory.md')
await upsertArtifact('endpoint_inventory', 'Endpoint Inventory', 'carecall-endpoint-inventory.md')
await upsertArtifact('openapi_spec', 'OpenAPI 3.1 Specification', 'carecall-openapi.yaml')
await upsertArtifact('findings', 'Validation / Findings Report', 'carecall-openapi-findings.md')
await upsertArtifact('evidence_map', 'Evidence Map', 'carecall-evidence-map.md')

const { data: workstream, error: wsError } = await admin
  .from('project_workstreams')
  .select('deliverables')
  .eq('id', WORKSTREAM_ID)
  .single()
if (wsError) throw wsError

const deliverables = workstream.deliverables.map((d) => ({ ...d, completed: true }))
const { error: updateError } = await admin.from('project_workstreams').update({ deliverables }).eq('id', WORKSTREAM_ID)
if (updateError) throw updateError

console.log('All 5 deliverables marked complete.')
