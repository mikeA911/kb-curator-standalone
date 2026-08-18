// Attaches the M5F Phases A/C/D/E architecture & design note as a new
// workstream on the existing "KB Sandbox — API Discovery" project, keeping
// the self-analysis-to-design arc in one place. Content mirrors
// docs/design-notes/m5f-workbench-assistant-design.md verbatim -- that file
// stays canonical for handoff to another coding AI session; this DB copy is
// for in-app discoverability/traceability, same convention as
// attach-kbsandbox-artifacts.mjs.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PROJECT_ID = 'a4107e39-f50e-41ab-83dd-6e41f4c450ac'
const DOC_PATH = 'C:/Users/mikea/projects/kb-curator-standalone/docs/design-notes/m5f-workbench-assistant-design.md'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('mike.aguilar profile not found')

const { data: workstream, error: workstreamError } = await admin
  .from('project_workstreams')
  .insert({
    project_id: PROJECT_ID,
    name: 'M5F — Architecture & Design (Phases A/C/D/E)',
    slug: 'architecture-design',
    status: 'completed',
    repository_scope: [],
    goal: 'Produce a handoff-ready architecture and design document for the remaining M5F phases -- Workbench Handbook Wiki (A), small Workbench API (C), internal MCP server (D), conversational Workbench Assistant (E) -- and the cross-cutting provenance fields, grounded in verified current-state findings from the shipped OpenAPI Discovery workstream. The deliverable is documentation for a separate coding AI session to implement, not runtime code.',
    guardrail:
      '**Design-doc handoff, not implementation** — this workstream produces an architecture/design document only. No application code, schema, or dependency changes accompany it; every current-state claim in the doc must carry a real file:line citation.',
    deliverables: [{ label: 'Architecture & Design Note (m5f-workbench-assistant-design.md)', completed: true }],
    summary: null,
    created_by: owner.id,
  })
  .select('id')
  .single()
if (workstreamError || !workstream) throw workstreamError ?? new Error('Failed to create workstream')
console.log(`Created workstream ${workstream.id}`)

const content = fs.readFileSync(DOC_PATH, 'utf-8')
const { error: artifactError } = await admin.from('workstream_artifacts').insert({
  workstream_id: workstream.id,
  artifact_type: 'design_note',
  title: 'M5F Architecture & Design Note (Phases A/C/D/E + Provenance)',
  external_tool: 'Claude (direct repository access)',
  content,
  external_url: null,
  notes: 'Canonical copy lives at docs/design-notes/m5f-workbench-assistant-design.md in the repo -- keep that file as the source of truth if edited later.',
  created_by: owner.id,
})
if (artifactError) throw artifactError
console.log(`Attached design note artifact (${content.length} chars)`)
console.log(`\nWORKSTREAM_ID=${workstream.id}`)
