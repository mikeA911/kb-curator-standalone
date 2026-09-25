# KB Sandbox — Ontology Dev Requirements (Draft v0.1)

## 1. Purpose

Define a reusable, domain-agnostic schema that lets any client Project instantiate
its own object vocabulary and pipeline of Workstreams, while KB Sandbox's core
tooling (evaluation, tracing, promotion, knowledge/wiki management) works
identically across projects without schema migrations per client.

Two layers:

- **Meta-ontology** — fixed tables, shared across all projects (this doc).
- **Instance graph** — per-project rows inside those tables (Plane/Route for an
  airline, Sensor/AnomalyEvent for a riverbank monitor, etc.).

---

## 1.1 Deployment Model

Codebase is multi-tenant (a Builder can serve multiple Clients/Projects), but
**deployment is single-tenant**: each client gets their own database instance.
Client isolation is therefore physical (separate DB per client), not
logical/RLS-based. `client_id`/`builder_id` columns still exist on `projects`
for a given client's DB, but their role is metadata (e.g. builder-side
reporting/aggregation across a builder's clients) rather than access control.

---

## 2. Core Entity Tables

### `clients`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | e.g. "XYZ Airlines" |
| created_at | timestamptz | |

### `builders`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | solo builder or agency |
| type | enum | `solo` \| `agency` |

### `projects`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| client_id | fk → clients | |
| builder_id | fk → builders | |
| name | text | |
| objective | text, nullable | captured in wizard step 2 ("Objective") — not previously in schema; added for §10 dashboard's Intent/Goal display |
| business_problem | text, nullable | wizard step 2 ("What business problem are you solving?") |
| outcome | text, nullable | wizard step 2 ("What outcome matters?") |
| status | enum | `active` \| `paused` \| `archived` |
| promoted_from_workstream_id | fk → workstreams, nullable | set when this project originated from a promotion |
| cloned_from_project_id | fk → projects, nullable | set when this project was duplicated from another (e.g. to A/B two VLM vendors) — distinct lineage from promotion, see §11 |
| created_at | timestamptz | |

### `project_objects`
Generic table for a project's domain nouns (Plane, Route, Sensor, AnomalyEvent…).
Avoids a new table per domain concept.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| project_id | fk → projects | |
| parent_object_id | fk → project_objects, nullable, self-referencing | supports multi-level ontology trees (e.g. Sandz → Zadara Storage → Retention Policy); null for a top-level entity |
| object_type | text | e.g. `"Route"`, `"Sensor"`, `"AnomalyEvent"` — the class name |
| name | text | instance label |
| attributes | jsonb | domain-specific fields, schema-flexible |
| created_at | timestamptz | |

*Note:* `object_type` values are convention, not an enum — lets each project
define its own vocabulary without a migration. If strict typing becomes
necessary later, promote `object_type` into its own `object_schemas` table
per project.

*Note on `parent_object_id`:* added after the Sandz-KabatOne example (§8)
surfaced a real multi-level case — partners nested three levels deep under a
System Integrator. A flat table couldn't represent that. Depth is
unrestricted (recursive query needed to walk the tree), so the app layer
should guard against accidental cycles on insert/update.

### `workstreams`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| project_id | fk → projects | |
| parent_workstream_id | fk → workstreams, nullable, self-referencing | supports nesting a granular task under a broader interface-level workstream (e.g. "GetTestDataForTraining" under "Sandz-KabatOne Interface") — same pattern as `project_objects.parent_object_id` |
| name | text | e.g. "Book Tickets", "Edge Inference" |
| status | enum | `supporting` \| `promotable` \| `promoted` |
| lifecycle_stage | enum | `presales` \| `deployment` \| `management_maintenance` — where this workstream sits in the engagement lifecycle; distinct from `status`, which tracks promotion state, not lifecycle stage |
| operational_status | enum | `open` \| `concluded` — distinct from both `status` (promotion) and `lifecycle_stage` (engagement phase); answers "is this workstream currently active." See §9. |
| planned_duration | interval, nullable | estimated/planned duration, set at creation or by Ember's suggestion |
| actual_duration | interval, nullable | computed/logged as the workstream runs — actual time spent, for later optimization analysis (planned vs. actual) |
| promoted_to_project_id | fk → projects, nullable | set on promotion |
| promoted_at | timestamptz, nullable | |
| cloned_from_workstream_id | fk → workstreams, nullable | set when duplicated from another workstream — e.g. two clones of "CalibrateAnomalyModel" differing only in which VLM partner's `agent_version` they use, for side-by-side comparison. See §11. |
| derived_from_method_id | fk → methods, nullable | set when this workstream is an *instantiation* of a published Method in a (possibly different) project — the reverse direction from promotion. See §12. |
| guardrails | jsonb, nullable | pre-filled from `methods.guardrails` when `derived_from_method_id` is set (§12.4); editable, empty by default otherwise |
| created_at | timestamptz | |

*Note on duration:* two columns rather than one, since "duration for later
optimization analysis" implies comparing plan against reality, not just
recording a single number. `actual_duration` can be derived from the
earliest/latest `traces.created_at` tied to the workstream rather than
manually maintained, if that's more reliable than an app-level timer.

### `workstream_object_links`
The `operatesOn` relationship — which objects a workstream reads/writes.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workstream_id | fk → workstreams | |
| project_object_id | fk → project_objects | |
| relation_type | enum | `reads` \| `writes` \| `creates` |

### `workstream_flow`
The `dataFlowsTo` relationship — pipeline ordering between workstreams
(needed for the riverbank example: ingest → inference → transport → storage → notify).

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| from_workstream_id | fk → workstreams | |
| to_workstream_id | fk → workstreams | |
| sequence_order | int | for multi-branch pipelines |

---

## 3. Agent / Execution Tables (existing KBS core — included for completeness)

### `agents` / `agent_versions`
Versioned spec: purpose, instructions, model, knowledge sources, tools,
execution graph, guardrails, termination rules. `implementedBy` vs
`specifiedBy` distinction lives here:

| column | type | notes |
|---|---|---|
| specified_by | text | KBS architecture/spec reference (always present) |
| implemented_by | text, nullable | pointer to builder's own repo/IDE artifact — KBS does not store the code itself |

### `traces`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workstream_id | fk → workstreams | |
| agent_version_id | fk → agent_versions | |
| project_object_id | fk → project_objects, nullable | the specific instance acted on (this flight, this route) |
| retrieved_kb_source_ids | uuid[] | which knowledge/wiki items were used |
| applied_method_id | fk → methods, nullable | set when this run's workstream is instantiated from a Method and actually applied its guidance — feeds the Method's `evidence` over time, see §12.5 |
| result | jsonb | output, latency, tokens, cost, human intervention flag |
| created_at | timestamptz | |

### `evaluations`
Unchanged from prior design — scores a `trace` or a batch of traces against
a rubric; feeds the failure-category taxonomy.

---

## 4. Knowledge / Wiki Tables (new — this conversation's addition)

Each Project has its own knowledgebase. Each Workstream can *also* have its
own scoped wiki, which matures into a reusable Method.

### `knowledge_bases`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| owner_type | enum | `project` \| `workstream` |
| owner_id | uuid | polymorphic — points to `projects.id` or `workstreams.id` |
| kb_type | enum | `rag` \| `wiki` \| `hybrid` |
| name | text | |
| created_at | timestamptz | |

### `kb_documents`
RAG-side content — source material with embeddings.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| knowledge_base_id | fk → knowledge_bases | |
| source_type | text | upload, URL, generated, etc. |
| content | text | |
| embedding | vector | pgvector column |
| canonical | boolean | matches existing `CanonicalKnowledgeItem` status flag |
| created_at | timestamptz | |

### `wiki_pages`
LLM-wiki side — human/AI-curated pages, not raw source docs.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| knowledge_base_id | fk → knowledge_bases | |
| title | text | |
| content | text | |
| version | int | |
| status | enum | `draft` \| `reviewed` \| `approved` |
| created_at | timestamptz | |

### `methods`
A promoted, reusable function. Can be derived from a workstream's mature
wiki, or promoted directly from a workstream's own pattern/architecture
without a wiki being involved — see §12 for the two paths.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | e.g. "Legacy System Understanding", "Edge Inference Calibration" |
| description | text | |
| derived_from_workstream_id | fk → workstreams | the originating workstream — always set |
| derived_from_wiki_id | fk → knowledge_bases, nullable | set only if a mature wiki was the basis; a workstream can promote to a Method without one, see §12 |
| requirements | jsonb | inputs/preconditions |
| evidence | jsonb | what proof this method requires |
| deliverables | jsonb | |
| guardrails | jsonb | |
| review_points | jsonb | |
| status | enum | `draft` \| `published` |
| created_at | timestamptz | |

### `promotions`
Generic audit log for *any* promotion event — workstream→project,
wiki→method, or future promotion types — rather than a separate table per
promotion kind.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| entity_type | enum | `workstream` \| `wiki` |
| entity_id | uuid | polymorphic |
| promoted_to_type | enum | `project` \| `method` |
| promoted_to_id | uuid | polymorphic |
| reason | text | e.g. "contract signed for this slice" |
| promoted_by | text | user/agent that triggered it |
| promoted_at | timestamptz | |

---

## 5. Open Questions for Dev Team

1. **Polymorphic FKs** (`owner_type`/`owner_id` on `knowledge_bases`,
   `entity_type`/`entity_id` on `promotions`) — Postgres doesn't enforce
   these natively. Given single-tenant-per-client deployment, a bug here
   corrupts one client's DB rather than leaking across tenants, so the
   risk is lower than in a shared-DB model. **Recommendation: fine as
   polymorphic for now; revisit only if a client's data model gets
   complex enough to need strict typing.**
2. **`object_type` as free text vs. enum** — same tradeoff. Free text lets
   any project define its own nouns without migration; loses DB-level
   validation. Recommend free text now, add a `project_object_schemas`
   registry table later if type-checking becomes necessary.
3. ~~RLS policies~~ — **not needed for tenant isolation**, since isolation
   is physical (separate DB per client). Optional defense-in-depth RLS
   *within* a single client's DB (e.g. hiding a Builder's draft
   workstreams from client-visible views) can be added later if needed,
   but it's not a launch requirement.
4. **Embedding re-indexing** — `kb_documents.embedding` should probably
   live in a separate `kb_embeddings` table keyed to `kb_documents.id` if
   we expect to swap embedding models later (matches earlier
   recommendation to decouple content from vector representation).
5. **Method versioning** — when a Method is updated after publication, do
   we version it the way `agent_versions` versions agents? Recommend yes,
   for the same audit-trail reasons.
6. **Schema migrations across deployments** — since each client runs a
   separate DB instance, a schema change has to roll out to every
   deployed instance individually rather than once against a shared DB.
   Until there's enough traction to justify tooling investment, plan for
   **manual migrations per client DB**, with a lightweight migration tool
   (e.g. a standard migration runner run per instance) as the likely next
   step once the number of client deployments makes manual rollout
   impractical.

---

## 6. Project Creation Flow — Where Ontology Gets Defined

The current "New project" wizard (6 steps: What are you doing? → Define the
problem → Knowledge scope → Evaluation → Team → Governance & Approvals) has
no step that produces `project_objects` or `workstreams` rows. Step 2
captures objective/business-problem/outcome as free text, but nothing
downstream structures that text into ontology entities — it's a gap, not a
future nice-to-have, because **step 3 (Knowledge scope) needs workstreams to
already exist** if knowledge is ever scoped per-workstream rather than only
at the project level (see §4, `knowledge_bases.owner_type = workstream`).

### 6.1 New step: "Define objects & workstreams"

Insert between step 2 (Define the problem) and step 3 (Knowledge scope).

Two complementary input modes, both writing to the same tables:

**A. Explicit form**
Two tag-style inputs:
- Objects (→ `project_objects.object_type`, one row per tag)
- Workstreams (→ `workstreams.name`, one row per tag)

**B. Ember-guided extraction**
Reuses the objective/business-problem text already captured in step 2 rather
than asking twice:
1. Ember parses that text and proposes a candidate object list and
   workstream list.
2. Proposal renders in the *same* editable tag UI as mode A — nothing is
   silently written to `project_objects`/`workstreams` until the user
   confirms/edits, consistent with the platform's existing rule that AI
   proposals to canonical structures require human confirmation (see
   Governance/Learning principle: no silent writes to canonical knowledge).
3. On confirm, rows are created exactly as in mode A.

**Recommendation:** ship both, with Ember's suggestion pre-filling the form
so most users just confirm, but the manual path stays available for anyone
who wants to skip the AI step entirely (e.g. Experiment-type projects with a
narrow technical hypothesis where free-text extraction adds no value).

### 6.2 Downstream effect on existing steps

- **Step 3 (Knowledge scope):** once workstreams exist, this step's "Attach
  an existing project knowledge base" control should optionally become
  per-workstream rather than project-only — matching `knowledge_bases`
  being ownable by either a project or a workstream.
- **`workstream_object_links`:** not necessarily captured in the wizard
  itself (may be over-scoping the intake flow); could instead be inferred
  automatically as workstreams get used, or added later as an
  edit-after-creation feature. Flagged as a design decision, not a
  requirement for this step.
- **`workstream_flow` (pipeline ordering):** same — likely too much to ask
  at creation time; better handled as a post-creation ordering step once
  workstreams exist and their sequence becomes apparent from use.

### 6.3 Ember trigger: on-demand, with iterative prompting

Resolved: **on-demand button** ("Ask Ember to suggest"), not synchronous
during wizard navigation — avoids adding latency to projects that don't
need it.

Once triggered, Ember doesn't do single-shot extraction and stop. It
**cycles through the proposed ontology — objects and workstreams together,
since a workstream is defined by what it operates on — asking the user
targeted follow-up questions wherever the extraction is ambiguous**, rather
than guessing silently. Three question types identified so far:

1. **Shared vs. duplicate entity** (objects) — when the same role/name
   appears under two different parents (e.g. "Network Infrastructure
   Partner" under both Sandz and KabatOne), Ember asks whether this is one
   entity relevant to both branches or two distinct vendors that happen to
   share a label. Resolution determines whether it becomes one
   `project_objects` row (with a note/attribute on which branch prefers it)
   or two separate rows. (§8)
2. **Missing children** (objects) — when a level-1 or level-2 entity has no
   sub-entities proposed (e.g. "Local Government Unit" with no children),
   Ember proposes a best-guess set (e.g. Funding/Procurement, Site
   Access & Permits, Data Ownership/Governance) rather than leaving it
   blank, flagged as a guess the user can accept, edit, or discard. (§8)
3. **Granularity** (workstreams) — when a proposed workstream could be one
   broad interface-level grouping or several granular tasks (e.g.
   "Sandz-KabatOne Interface" vs. breaking it into "GetTestDataForTraining,"
   "SyncSensorFeeds," etc.), Ember asks which level the user wants, and
   nests the granular result under the broader one via
   `parent_workstream_id` rather than forcing a single flat list. (§8)

Each cycle's proposal renders in the same editable tag UI as the manual
path (§6.1) — confirmation is still required before anything writes to
`project_objects`/`workstreams`, consistent with the no-silent-writes
principle.

---

## 7. Worked Example (Riverbank Monitoring)

```
clients: { name: "River Authority" }
projects: { name: "Riverbank Disaster Prevention Portal" }
project_objects:
  - { type: "RiverSite" }
  - { type: "Sensor" }
  - { type: "MediaCapture" }
  - { type: "AnomalyEvent" }

workstreams:
  - { name: "Camera/Sensor Ingest" }
  - { name: "Edge Inference (Blaize)" }
  - { name: "Local Network Transport" }
  - { name: "Evidence Storage (Zadara)" }
  - { name: "Customer Ops Notify (Kabatone)" }

workstream_flow: Ingest → Inference → Transport → Storage → Notify

# Evidence Storage later gets its own signed contract:
promotions:
  - { entity_type: "workstream", entity_id: <Evidence Storage>,
      promoted_to_type: "project", reason: "contract signed — compliance retention" }
# → new project seeded with MediaCapture, AnomalyEvent + new objects
#   (RetentionPolicy, AuditExport)
```

---

## 8. Worked Example (Sandz-KabatOne — Multi-Level Hierarchy)

Illustrates `parent_object_id` usage: a three-level ontology tree under one
project, including the shared-vs-duplicate resolution and a filled-in guess
for a branch the user left unspecified.

```
projects: { name: "Sandz-KabatOne" }

project_objects:
  # Level 1
  - { id: sandz,      type: "SystemIntegrator", parent: null }
  - { id: kabatone,   type: "Client",            parent: null,
      attributes: { services: ["Disaster Prevention/Recovery", "E911"] } }
  - { id: lgu,         type: "Stakeholder",       parent: null,
      attributes: { note: "level-2 children are a placeholder guess, pending confirmation" } }

  # Level 2 — under Sandz
  - { id: zadara,      type: "StoragePartner",    parent: sandz }
  - { id: blaize,      type: "EdgeAIPartner",     parent: sandz }
  - { id: netpartner,  type: "NetworkPartner",    parent: sandz,
      attributes: { preferred_by: ["KabatOne"] } }   # single shared entity, not duplicated
  - { id: vlmpartner,  type: "VLMTrainingPartner", parent: sandz,
      attributes: { preferred_by: ["KabatOne"] } }

  # Level 2 — under KabatOne
  - { id: cameras,     type: "DeviceSource",      parent: kabatone,
      attributes: { note: "customer-provided if available, else Sandz-sourced fallback" } }

  # Level 2 — under Local Government Unit (Ember's guess, unconfirmed)
  - { id: lgu_funding, type: "Funding/Procurement",   parent: lgu }
  - { id: lgu_access,  type: "SiteAccess/Permits",    parent: lgu }
  - { id: lgu_gov,     type: "DataOwnership/Governance", parent: lgu }

  # Level 3 — under Zadara
  - { type: "EvidenceStorage",  parent: zadara }
  - { type: "BackupRedundancy", parent: zadara }
  - { type: "RetentionPolicy",  parent: zadara }

  # Level 3 — under Blaize
  - { type: "XplorerAppliance",  parent: blaize }
  - { type: "PathfinderModule",  parent: blaize }
  - { type: "AnomalyDetectionModel", parent: blaize }

  # Level 3 — under Network Partner
  - { type: "SiteConnectivity",  parent: netpartner }
  - { type: "LocalNetworkIntegration", parent: netpartner }
  - { type: "BandwidthQoS",      parent: netpartner }

  # Level 3 — under VLM Training Partner
  - { type: "DatasetCuration",   parent: vlmpartner }
  - { type: "ModelTraining",     parent: vlmpartner }
  - { type: "ModelVersioning",   parent: vlmpartner }
```

```
workstreams:
  # Top-level, presales stage
  - { id: sandz_kabatone_iface, name: "Sandz-KabatOne Interface",
      parent: null, lifecycle_stage: "presales",
      planned_duration: "3 weeks" }
  - { id: sandz_lgu_iface, name: "Sandz-LGU Interface",
      parent: null, lifecycle_stage: "presales",
      planned_duration: "2 weeks" }

  # Nested, granular, deployment stage — under Sandz-KabatOne Interface
  - { name: "GetTestDataForTraining", parent: sandz_kabatone_iface,
      lifecycle_stage: "deployment", planned_duration: "1 week" }
  - { name: "SyncSensorFeeds",        parent: sandz_kabatone_iface,
      lifecycle_stage: "deployment", planned_duration: "4 days" }
  - { name: "CalibrateAnomalyModel",  parent: sandz_kabatone_iface,
      lifecycle_stage: "deployment", planned_duration: "1 week" }

  # Later addition, management/maintenance stage — same parent
  - { name: "MonitorModelDrift", parent: sandz_kabatone_iface,
      lifecycle_stage: "management_maintenance",
      planned_duration: null,   # ongoing, no fixed end
      actual_duration: null }   # accrues over time via linked traces
```

**Key resolutions applied:**
- `NetworkPartner` and `VLMTrainingPartner` are single rows under Sandz, not
  duplicated under KabatOne — `attributes.preferred_by` records that
  KabatOne consumes the same partner rather than sourcing its own.
- `LocalGovernmentUnit` got a filled-in best-guess set of children rather
  than staying empty, explicitly flagged in `attributes.note` as a guess so
  it's easy to revisit later without hunting for it.
- Granular tasks (`GetTestDataForTraining`, etc.) nest under the
  interface-level workstream via `parent_workstream_id` rather than sitting
  flat alongside it — same tree pattern as the objects, applied to
  workstreams. `MonitorModelDrift` shows a management/maintenance-stage
  workstream added later under the same parent, with no planned end date
  since it's ongoing.

---

## 9. Project-Level Evals Section — Workstream List (Derived View)

This is a **derived-view addition**, not a new-tables one: the Evals
section's workstream list (open/concluded, with results) is fully
computable from tables already defined in this doc (§2, §3) — it doesn't
need its own storage, just a query and one new field.

### 9.1 The one real gap: `operational_status`

None of the existing workstream fields capture open-vs-concluded:

- `status` tracks **promotion** state (`supporting`/`promotable`/`promoted`)
- `lifecycle_stage` tracks **engagement phase**
  (`presales`/`deployment`/`management_maintenance`)
- Neither answers "is this workstream currently active or done"

Added `operational_status` (enum `open` \| `concluded`) as its own field
(§2, `workstreams` table) rather than overloading `status` or
`lifecycle_stage` — conflating them would make promotion logic and
lifecycle logic harder to reason about independently. A workstream can be
`concluded` and `promoted` and in `management_maintenance` stage all at
once; these three fields are orthogonal, not a hierarchy.

### 9.2 The query

Evals section, workstream list for a given project:

```sql
SELECT w.name,
       w.operational_status,
       w.lifecycle_stage,
       e.summary_result,
       e.score
FROM workstreams w
LEFT JOIN evaluations e ON e.workstream_id = w.id  -- or via traces, see §3
WHERE w.project_id = :project_id
ORDER BY w.operational_status, w.created_at;
```

Stays under the Project's Evals section (per your call — not duplicated
under each Workstream) while still surfacing per-workstream results.

### 9.3 Deriving `operational_status` via Ember Q&A

`operational_status` is the one piece that can't be computed — "is this
concluded" is a judgment call, not something the schema can infer on its
own. Rather than requiring manual entry, this becomes a natural extension
of the same Ember Q&A pattern from §6.3: when a workstream's linked traces
go quiet for a while, Ember can proactively ask, e.g. *"GetTestDataForTraining
hasn't logged activity in 2 weeks — mark it concluded?"* — same
confirm-before-write pattern as the ontology extraction itself, just
triggered by inactivity instead of by the creation wizard.

---

## 10. Management Dashboard (Curators & Admins)

A single-page rollup view of a project, restricted to Curator/Admin roles.
Mostly a composition of views already defined in this doc — one new table
required (`project_notes`) and three new columns on `projects` (added in
§2, above) to surface fields the wizard already captures but the schema
never stored.

### 10.1 Composition

| Dashboard section | Source |
|---|---|
| Project name | `projects.name` |
| Intent / Goal | `projects.objective`, `projects.business_problem`, `projects.outcome` |
| Ontology | `project_objects` tree (via `parent_object_id`, §2) rendered as a hierarchy view |
| Evals & status | The §9 view — `workstreams` (`operational_status`, `lifecycle_stage`) joined to `evaluations` |
| Notes | New `project_notes` table, below |
| Print / download | Export action over the above — see §10.3 |

Nothing here needs new query logic beyond what §8/§9 already defined; the
dashboard is largely those views assembled on one page.

### 10.2 `project_notes` (new table)

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| project_id | fk → projects | |
| author_id | uuid | references the platform's existing user/identity table (not modeled in this doc) |
| author_role | text | snapshot of the author's role *at time of writing* (e.g. "Curator", "Admin") — stored redundantly rather than joined live, so the management stamp stays accurate even if the person's role changes later |
| content | text | |
| created_at | timestamptz | |

Notes are append-only (no `updated_at`/edit support assumed) — matches an
audit-stamp use case better than a mutable comment thread. Flag for the
dev team if editable notes are actually wanted; that would need an edit
history rather than a single `content` field.

### 10.3 Access control

Restricted to Curator and Admin roles. This doc doesn't model the
platform's user/role tables (out of scope — they're not ontology-specific),
so this is a **requirement to flag against the existing auth system**:
dashboard visibility (and `project_notes` write access) should check role
membership there, not introduce a parallel role table here.

### 10.4 Print / download

Export the dashboard's sections (Intent/Goal, Ontology, Evals & status,
Notes) to a shareable file. Two implementation options for dev to weigh:

- **Browser print stylesheet** — fastest to ship, no new dependency, but
  limited layout control for the ontology tree view.
- **Generated PDF** — better fidelity for the hierarchy/tree rendering and
  for a professional leave-behind (this tool spans presales-to-management,
  so a clean printable artifact matters for client-facing use), at the cost
  of a PDF-generation dependency.

No new schema either way — this reads from the same views as the on-screen
dashboard, it just renders them differently.

---

## 11. Duplicate / Clone Projects & Workstreams (for Comparison)

Use case: compare two options side by side by running them as siblings —
e.g. two VLM training partners, evaluated under otherwise-identical
conditions, to see which is easier to deploy or more accurate.

### 11.1 What gets copied vs. shared

Cloning isn't one operation — a **project clone** and a **workstream
clone** copy different things, because a workstream's whole reason to exist
here is to differ from its sibling in exactly one dimension (the thing
being compared), while sharing everything else.

**Project clone** (rare case — comparing entire approaches, not just one
partner choice):
- Deep-copies the `project_objects` tree (new rows, new project scope)
- Deep-copies the `workstreams` tree
- Does **not** copy `traces` or `evaluations` — a clone starts with no
  run history; that's the point of comparing it against the original
- Sets `cloned_from_project_id` on the new row

**Workstream clone** (the more likely case, matching your VLM example):
- Copies the workstream's subtree (nested tasks) via `parent_workstream_id`
- Shares the same `project_objects` (no copy) — the clone is still in the
  same project, evaluating the same domain nouns
- Shares `workstream_object_links` in the sense of referencing the same
  objects, but as new link rows (each workstream, including its clone, has
  its own `operatesOn` rows even if they point at the same objects)
- Does **not** copy `traces`/`evaluations` — fresh history, so the
  comparison is fair
- **Does** get a different `agent_version` — this is the actual variable
  being tested (e.g. VLM Partner A vs. VLM Partner B), set by the user
  post-clone, not auto-copied from the original
- Sets `cloned_from_workstream_id` on the new row

### 11.2 Comparison view (Evals section addition)

Extends the §9 query — group sibling workstreams by shared origin so their
results sit side by side rather than scattered in the flat list:

```sql
SELECT w.name, w.operational_status, av.model_name,
       e.summary_result, e.score
FROM workstreams w
JOIN agent_versions av ON av.id = w.agent_version_id   -- if bound directly, else via traces
LEFT JOIN evaluations e ON e.workstream_id = w.id
WHERE w.id = :workstream_id OR w.cloned_from_workstream_id = :workstream_id
ORDER BY e.score DESC;
```

Returns the original plus every clone descended from it, ranked by
whichever metric the evaluation used — directly answering "which one
performed better."

### 11.3 Open question for dev team

Should cloning be restricted to same-project workstreams only, or should a
workstream be cloneable *into a different project* (e.g. spinning up a
same-shaped comparison workstream for a new client without rebuilding it by
hand)? If cross-project cloning is wanted, `workstream_object_links` can't
be copied as-is (the target project has different `project_objects` rows)
— it would need re-mapping to equivalent objects in the destination
project, which may not always have a clean match. Recommend restricting to
same-project cloning for v1, and revisiting cross-project templating as a
separate feature if it comes up.

---

## 12. Methods as Cross-Project Reusable Units

Confirms and extends the "on top of, not instead of" framing: a workstream
promoting to a Project (contract signed) and a workstream promoting to a
Method (pattern proven reusable) are **independent outcomes, not
alternatives**. The same workstream can eventually do both — become its
own billable engagement *and* have its underlying technique extracted as a
Method other projects can use. Neither promotion consumes or replaces the
original workstream.

### 12.1 Two paths up (workstream/wiki → Method) — already representable

Both paths were already valid shapes in the existing schema, just not
called out as two distinct routes:

- **Path A — via wiki maturity** (original design, §4): a workstream's LLM
  wiki matures through use, gets promoted; `methods.derived_from_wiki_id`
  is set.
- **Path B — direct promotion** (this conversation's addition): a
  workstream's pattern/architecture itself is judged reusable without
  necessarily having a mature wiki behind it — e.g. the riverbank pipeline's
  "Edge Inference" workstream could become a Method purely from its proven
  `agent_version` + evaluation history, no wiki required.
  `methods.derived_from_wiki_id` stays null in this case.

Both write to the same `promotions` row shape
(`entity_type = 'workstream'`, `promoted_to_type = 'method'`) — no new
audit mechanism needed, just a UI path that triggers it directly from a
workstream rather than only from a wiki's maturity state.

### 12.2 One path down (Method → new workstream) — the actual gap

This is what makes cross-project reuse real rather than theoretical:
without a way to *apply* a Method somewhere else, "crosses project
boundaries" has no mechanism. `workstreams.derived_from_method_id` (added
in §2) closes this: creating a workstream in Project B that instantiates a
published Method from Project A sets this field, distinct from
`parent_workstream_id` (nesting within one project) and
`cloned_from_workstream_id` (duplicating within roughly the same project
context for comparison, §11).

### 12.3 Why `methods` never had a `project_id` — and why that matters now

Worth noting explicitly: the `methods` table (§4) was never given a
`project_id` in the first place. At the time that just reflected
`requirements`/`evidence`/`deliverables`/etc. being schema-flexible jsonb;
in hindsight it's *why* Methods can cross project boundaries at all — a
project-scoped Method couldn't be instantiated anywhere else. No schema
change needed here, just confirming the earlier design already supports
this requirement correctly.

### 12.4 Resolved: instantiation pre-fills `guardrails` only

When a workstream is created with `derived_from_method_id` set, it
pre-fills the new workstream's guardrails from the Method's `guardrails`
field — editable, not locked, same confirm-before-write pattern as Ember's
suggestions elsewhere in this doc.

`requirements`/`evidence`/`deliverables` stay reference material the user
consults on the Method's page rather than being copied in — narrower than
originally proposed, but consistent with why guardrails specifically
matter here: they're the part of a Method that exists to prevent repeat
mistakes, so carrying them forward automatically has real safety value.
Copying `requirements`/`deliverables` by default risks stale boilerplate
sitting in a new workstream that doesn't actually fit its context.

### 12.5 Ember's visibility into Methods — a real gap, should add

Confirmed: no, Ember doesn't currently have this. Wikis are wired into
Ember's context because `knowledge_bases`/`kb_documents` are the retrieval
source behind Ember's answers (`traces.retrieved_kb_source_ids`, §3).
`methods` was never added as a source Ember draws from, so today Ember has
no way to say "a published Method already covers this" — it would just
propose a brand-new workstream tree from scratch even when a matching
Method exists. That's a real gap worth closing, on two fronts:

**Design-time (Ember suggesting reuse):**
Add published `methods` (`status = 'published'`) as a source Ember checks
*before* proposing new workstreams during the §6 extraction flow — a
fourth question type alongside shared-vs-duplicate, missing-children, and
granularity: *"An existing Method ('Edge Inference Calibration') looks like
a match — reuse it, or build a new workstream?"* Accepting sets
`derived_from_method_id` directly rather than Ember drafting a workstream
tree that duplicates something already proven.

**Runtime (evidence that a Method is actually working):**
Add `traces.applied_method_id` (fk → `methods`, nullable) — records when a
workstream instantiated from a Method actually used its guidance during a
given run, not just at creation time. This closes the loop `methods` needs
to stay trustworthy: `evidence` (§4) can accumulate from real usage across
projects (usage count, aggregate scores from linked `evaluations`) instead
of being written once at publication and never revisited. Without this,
"published" and "actually working elsewhere" have no connection back to
each other.
