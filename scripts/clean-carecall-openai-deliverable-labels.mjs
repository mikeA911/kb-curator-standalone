// One-off: the OpenAI workstream's deliverable labels were still raw local
// Windows filesystem paths from when it was first created -- fine while
// private, but now public-facing on /examples/carecall-openapi-discovery/
// workstreams/... Relabels to match the clean style already used on the
// Claude and Grok workstreams. Completion state (already true, see
// mark-carecall-deliverables-complete) is preserved.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const OPENAI_WORKSTREAM_ID = 'd53415e1-04f2-4242-a9cd-589b66867a2e'

const deliverables = [
  { label: 'Capability Inventory (carecall-capability-inventory.md)', completed: true },
  { label: 'Endpoint Inventory (carecall-endpoint-inventory.md)', completed: true },
  { label: 'OpenAPI 3.1 Specification (carecall-openapi.yaml)', completed: true },
  { label: 'Validation / Findings Report (carecall-openapi-findings.md)', completed: true },
  { label: 'Evidence Map (carecall-evidence-map.md)', completed: true },
]

const { error } = await admin.from('project_workstreams').update({ deliverables }).eq('id', OPENAI_WORKSTREAM_ID)
if (error) throw error
console.log('Relabeled OpenAI workstream deliverables.')
