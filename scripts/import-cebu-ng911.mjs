// One-off import: creates a real "Cebu ng911" project owned by Mike's real
// account, seeded from the cebu-safe-city.ttl ontology -- its owl:Class
// hierarchy becomes the project's project_objects tree (domain object
// TYPES, exactly what that table is for), and its five K-* SoftwareModule
// individuals become the project's initial workstreams.
import fs from 'node:fs'
import pg from 'pg'

const TTL_PATH = process.argv[2]
if (!TTL_PATH) {
  console.error('Usage: node scripts/import-cebu-ng911.mjs <path-to-ttl>')
  process.exit(1)
}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) throw new Error('Missing SUPABASE_DB_URL')

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// -- Parse the TTL's owl:Class blocks -------------------------------------
// The file separates every subject's statements with a blank line, and
// each field sits on its own line -- regular enough for a small hand-rolled
// parser rather than pulling in a full Turtle library for a one-off script.
function parseClasses(ttl) {
  const blocks = ttl.split(/\n\n+/).map((b) => b.replace(/\n/g, ' ').trim())
  const classes = []
  for (const block of blocks) {
    const subjectMatch = block.match(/^:(\S+)\s+a\s+(.+?);/)
    if (!subjectMatch) continue
    const [, name, typesPart] = subjectMatch
    if (!/\bowl:Class\b/.test(typesPart)) continue

    const labelMatch = block.match(/rdfs:label\s+"([^"]*)"/)
    const commentMatch = block.match(/rdfs:comment\s+"([^"]*)"/)
    const parentMatch = block.match(/rdfs:subClassOf\s+:(\S+?)\s*[;.]/)

    classes.push({
      name,
      label: labelMatch ? labelMatch[1] : name,
      comment: commentMatch ? commentMatch[1] : null,
      parent: parentMatch ? parentMatch[1] : null,
    })
  }
  return classes
}

const ttl = fs.readFileSync(TTL_PATH, 'utf-8')
const classes = parseClasses(ttl)
console.log(`Parsed ${classes.length} owl:Class entries from ${TTL_PATH}`)

// K-* SoftwareModule individuals -> this project's initial workstreams.
// Hand-transcribed from the ttl (only 5, read directly rather than
// auto-parsed) -- goal text folds in each module's own rdfs:comment plus
// the capabilities it realizes, for a self-explanatory workstream goal.
const workstreams = [
  {
    name: 'K-Connect',
    goal: 'Shares CCTV feeds across agencies (feed sharing).',
  },
  {
    name: 'K-Dispatch',
    goal: 'Dispatch module -- assigns responders to incidents.',
  },
  {
    name: 'K-Traffic',
    goal: 'Traffic module -- signal control for the 100 SCATS/Triune intersection controllers.',
  },
  {
    name: 'K-Video',
    goal: 'Video module -- video management and analytics for the 1000+ Eagle Eye CCTV cameras (analytics assignment assumed; confirm with KabatOne).',
  },
  {
    name: 'K-Safety',
    goal: 'Situational awareness module: unified GIS operational map, vehicle location tracking, access control integration, dispatch recommendations, predictive threat forecasting, sensor fusion and alerting. Capabilities per vendor document, unverified.',
  },
]

const client = new pg.Client({ connectionString })
await client.connect()

const { rows: mikeRows } = await client.query("select id from profiles where email = 'mike.aguilar@gmail.com'")
if (mikeRows.length === 0) throw new Error('mike.aguilar@gmail.com profile not found')
const ownerId = mikeRows[0].id

const { rows: projectRows } = await client.query(
  `insert into projects (name, project_type, objective, status, notes, details, owner_id)
   values ($1, $2, $3, 'draft', null, $4, $5)
   returning id`,
  [
    'Cebu ng911',
    'consulting',
    'Actors, assets, capabilities, processes, data governance and performance benchmarks for the Cebu traffic and NG911 modernization project (Sandz/KabatOne).',
    JSON.stringify({
      business_problem:
        'CCDRRMO call intake is fragmented and analog (formerly NGA-911, too costly to maintain); CCTO runs 1000+ CCTV cameras with no VMS or analytics and 55 of ~100 signal controllers on unsupported SCATS hardware; there is no unified GIS operational map across incidents, units and infrastructure.',
      target_outcome:
        'Evaluate the proposed Sandz/KabatOne K-suite (K-Connect, K-Dispatch, K-Safety, K-Traffic, K-Video) against these gaps, validate vendor claims (NENA i3 conformance, DILG regional hub gateway mapping, offline map caching for typhoon connectivity loss, radio fleet AVL protocol support), and track data-governance obligations (Data Privacy Act) for CCTV and caller-location data.',
    }),
    ownerId,
  ]
)
const projectId = projectRows[0].id
console.log(`Created project ${projectId}`)

// project_objects: level-order insert (parents before children), same
// pattern as insertStagedTree (src/lib/workbench/projects.ts) -- classes.name
// (the ontology's own local name) doubles as the tempId since it's already
// unique within this file.
const idByName = new Map()
let pending = classes
let level = 0
while (pending.length > 0) {
  const ready = pending.filter((c) => c.parent === null || idByName.has(c.parent))
  if (ready.length === 0) {
    console.error(
      'Unresolvable parent reference(s), stopping:',
      pending.map((c) => `${c.name} -> ${c.parent}`)
    )
    break
  }
  for (const c of ready) {
    const { rows } = await client.query(
      `insert into project_objects (project_id, parent_object_id, name, slug, description, created_by)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [projectId, c.parent ? idByName.get(c.parent) : null, c.label, slugify(c.label), c.comment, ownerId]
    )
    idByName.set(c.name, rows[0].id)
  }
  console.log(`  level ${level}: inserted ${ready.length} project_objects`)
  pending = pending.filter((c) => !ready.includes(c))
  level++
}

for (const w of workstreams) {
  const { rows } = await client.query(
    `insert into project_workstreams (project_id, name, slug, status, repository_scope, goal, deliverables, lifecycle_stage, operational_status, created_by)
     values ($1, $2, $3, 'draft', '{}', $4, '[]', 'presales', 'open', $5) returning id`,
    [projectId, w.name, slugify(w.name), w.goal, ownerId]
  )
  console.log(`Created workstream "${w.name}" (${rows[0].id})`)
}

console.log(`\nDone. Project: https://<your-app-host>/projects/${projectId}`)
await client.end()
