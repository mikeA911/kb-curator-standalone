// Attaches the 5 M5F Phase B artifacts (authored directly by Claude with
// full repository access -- see the scratchpad files this reads from) to
// the KB Sandbox — API Discovery workstream.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const WORKSTREAM_ID = '7880c681-2fd6-4d2d-8309-4cf4c2bb7ee7'
const SCRATCH = 'C:/Users/mikea/AppData/Local/Temp/claude/C--Users-mikea-projects-kb-curator-standalone/4bb069bb-df81-4824-8030-6646bb0dc544/scratchpad'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('mike.aguilar profile not found')

const artifacts = [
  { file: 'kbsandbox-capability-inventory.md', title: 'Capability Inventory', artifact_type: 'capability_inventory' },
  { file: 'kbsandbox-endpoint-inventory.md', title: 'Endpoint Inventory', artifact_type: 'endpoint_inventory' },
  { file: 'kbsandbox-openapi.yaml', title: 'OpenAPI 3.1 Specification', artifact_type: 'openapi_spec' },
  { file: 'kbsandbox-openapi-findings.md', title: 'Validation / Findings Report', artifact_type: 'findings' },
  { file: 'kbsandbox-evidence-map.md', title: 'Evidence Map', artifact_type: 'evidence_map' },
]

for (const a of artifacts) {
  const content = fs.readFileSync(`${SCRATCH}/${a.file}`, 'utf-8')
  const { error } = await admin.from('workstream_artifacts').insert({
    workstream_id: WORKSTREAM_ID,
    artifact_type: a.artifact_type,
    title: a.title,
    external_tool: 'Claude (direct repository access)',
    content,
    external_url: null,
    notes: null,
    created_by: owner.id,
  })
  if (error) throw error
  console.log(`Attached: ${a.title} (${content.length} chars)`)
}
