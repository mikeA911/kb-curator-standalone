# KB Sandbox — Ontology Dev Requirements (Draft v0.2 — Scoped to the Builder Programme)

## Revision note (from v0.1, `kbs-ontology-dev-req-2.md`)

v0.1 assumed a deployment model this codebase doesn't have yet: "each client
gets their own database instance... RLS not needed for tenant isolation."
Mike clarified the actual target: **build this for the Builder Programme
specifically, with the operator (Mike/SSCGI) as the single tenant.** Builders
work inside that one deployment; each builder's Projects and Workstreams stay
private until explicitly elevated (promoted). There is no second client or
second database in scope here.

That rescoping doesn't remove the isolation question — it changes what needs
isolating. **RLS is still the whole mechanism**, just for a different
boundary than v0.1 assumed: not client-vs-client, but **builder-vs-builder**
within the one shared database. This is exactly what `project_workstreams`,
`builder_progress_updates`, and the rest of the already-shipped Builder
Programme infrastructure already do — a builder's own RLS-scoped Supabase
client can see their own rows; the operator's curator/admin view goes through
the admin client deliberately, on a narrow, purpose-built set of reads (see
`src/lib/workbench/builder-progress-updates.ts`'s own comments on this
pattern). Nothing here argues for removing or weakening that.

The practical effect of the rescoping is good news, not bad: it means most of
v0.1's proposed schema can be **additive** to what's already built (KB
Sandbox Builder MVP, Workstream Promotion, Builder Operations, Capability
Promotion, Builder AI Metering + BYOLLM — all shipped this same programme),
rather than a competing redesign of it. Two whole tables (`clients`,
`builders`) drop out entirely, several others turn out to already exist
under different names, and what's left is a smaller, more precise set of
genuinely new capabilities. That reconciliation is this document's main job.

---

## 1. Purpose

Define a reusable, domain-agnostic schema that lets any Builder's opportunity
Project instantiate its own object vocabulary and pipeline of Workstreams,
while KB Sandbox's core tooling (evaluation, tracing, promotion,
knowledge/wiki management) works identically across every builder's Projects
without a schema migration per builder.

Two layers, same as v0.1:

- **Meta-ontology** — fixed tables, shared across every builder (this doc).
- **Instance graph** — per-Project rows inside those tables (Plane/Route for
  an airline, Sensor/AnomalyEvent for a riverbank monitor, etc.).

---

## 1.1 Deployment & Tenancy Model (rewritten)

**One deployment, one operator, many builders.** This is the existing KB
Sandbox Builder MVP model (`docs/dev-request-kb-sandbox-builder-product.md`,
shipped): a single Builder-mode instance (`env.productMode() === 'builder'`)
run by one operator; every builder is a `profiles` row (platform role
`consultant`) who owns exactly one Project, auto-tagged
`portfolio_category = 'builder_lab'` (`provisionBuilderProject`,
`src/lib/workbench/projects.ts`). There is no `clients` table and no
`builders` table in this scope — "the client" is the deployment itself
(there's exactly one), and "a builder" is already fully represented by an
existing `profiles` row plus their owned `builder_lab` Project. Adding either
table would model something that doesn't exist yet (a second real client) at
the cost of a join nothing needs.

**Isolation is RLS, not physical separation**, and it protects two boundaries
that matter here:

1. **Builder-to-builder**: Builder A must never see Builder B's Projects,
   Workstreams, `project_objects`, Working Knowledge, or private Ember
   conversations. Already enforced today via owner-scoped RLS on
   `project_workstreams`/`workstream_artifacts`/etc. — every new table this
   doc adds needs the same shape (owner-or-project-member select/write,
   modeled on `builder_progress_updates`'s own RLS, see
   `supabase/migrations/20260906120001_builder_progress_updates_schema.sql`).
2. **Builder-to-operator**: the operator (curator/admin) gets narrow,
   explicit, consent-based visibility — never blanket access to a builder's
   private data. The existing pattern (`listBuilderOperationsRows`,
   `capability_evaluations`) is: platform curator/admin reads via the admin
   client on a specific, safe, metadata-shaped query; nothing is opened up
   by widening a builder's own RLS policy. Any operator-facing view this doc
   proposes (e.g. the §10 Management Dashboard) should follow that same
   pattern, not a new one.

If a second real operator/deployment ever exists, that's the ADR-0001
scenario (`docs/architecture-decisions/ADR-0001-dedicated-instance-first-
deployment.md`) — a separate, dedicated instance per operator, decided
architecturally, not something this doc needs to design for.

---

## 2. Core Entity Tables

### ~~`clients`~~ — dropped

Not needed in this scope. See §1.1.

### ~~`builders`~~ — dropped

Not needed in this scope. A builder is a `profiles` row (`role = 'consultant'`)
who owns a `portfolio_category = 'builder_lab'` Project. If a future need
arises for builder-specific metadata beyond `profiles` (e.g. a display name
for their delivery company, for the presentation-branding feature under
separate review), extend `profiles` or add a narrow `builder_profiles`
side-table rather than reintroducing a parallel identity concept.

### `projects` — mostly already exists

| column | status | notes |
|---|---|---|
| `id` | exists | |
| `owner_id` | exists | this **is** the builder-identity link; no separate `builder_id` FK needed |
| `name` | exists | |
| `objective` | exists | `src/types/database.ts`, `Project.objective` |
| `business_problem`, `outcome` | **recommend NOT adding as columns** | already captured today as free-text keys inside `projects.details: Record<string,string>` — this repo made a deliberate "no template engine" scope decision against wide nullable per-type columns (see the `Project` type's own comment in `database.ts`). Reopen only if a real need for typed queries against these specific fields shows up; reading them out of `details` is enough for the §10 dashboard. |
| `status` | exists | (`draft`/`active`/etc. — actual enum differs from v0.1's `active`/`paused`/`archived`, confirm exact values before building against it) |
| `promoted_from_workstream_id` | **not a column today** | the equivalent already exists as `workstream_promotions.created_project_id` (reverse FK). A forward-pointing denormalized column on `projects` is optional — only add it if the §10 dashboard needs to avoid a join; not required for correctness. |
| `cloned_from_project_id` | **genuinely new** | no cloning mechanism exists at all today; see §11. |
| `portfolio_category` | exists | already does the "which bucket" job informally (`builder_lab` and others) |

### `project_objects` — genuinely new, keep as designed

Nothing like this exists today. Design unchanged from v0.1:

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| project_id | fk → projects | |
| parent_object_id | fk → project_objects, nullable, self-referencing | multi-level trees (§8 worked example) |
| object_type | text | free text, not enum — same rationale as v0.1 §5.2, still holds |
| name | text | |
| attributes | jsonb | |
| created_at | timestamptz | |

RLS: owner-of-project (builder) manage; operator via admin client only, same
posture as §1.1.

### Workstreams — mostly already exists, do NOT create a new `workstreams` table

The actual table is `project_workstreams`
(`supabase/migrations/20260811100004_project_workstreams.sql`), not
`workstreams`. Do not rename it — every already-shipped feature this
programme built this session (Workstream Promotion, Builder Operations,
Capability Promotion) already references it by that name. Extend it with an
`alter table`, don't replace it.

| v0.1 proposed column | status | notes |
|---|---|---|
| `name`, `project_id`, `created_at` | exists | |
| `status` (`supporting`/`promotable`/`promoted`) | **exists but different**: actual enum is `draft`/`active`/`completed`/`archived` (`WorkstreamStatus`, `database.ts`). Promotion is tracked separately (see below), not as a `status` value — keep this separation, don't try to fold promotion state into `status`. |
| `parent_workstream_id` | **genuinely new** | no nesting exists today. Needed for the §6.3/§8 granularity use case (e.g. "Sandz-KabatOne Interface" containing "GetTestDataForTraining", etc.). Straightforward `alter table project_workstreams add column parent_workstream_id uuid references project_workstreams(id)`, self-referencing, same cycle-guard caveat as `project_objects.parent_object_id`. |
| `lifecycle_stage` | **genuinely new** | (`presales`/`deployment`/`management_maintenance`) — no equivalent exists. New enum column. |
| `operational_status` | **genuinely new** | (`open`/`concluded`) — real gap, see v0.1 §9.1's own reasoning, still correct. New enum column. |
| `planned_duration`/`actual_duration` | **genuinely new** | no duration tracking exists. `actual_duration` can likely be derived from `ai_operation_logs`/`builder_integration_invocations` timestamps tied to the workstream rather than stored, worth deciding at build time. |
| `cloned_from_workstream_id` | **genuinely new** | see §11. |
| `derived_from_method_id` | **genuinely new**, depends on §12's `methods` table existing first | |
| `guardrails` (jsonb) | **genuinely new as structured field** | today `project_workstreams.guardrail` (singular, free text) already exists and is used by `WorkstreamSummaryForm`/the workstream detail page — decide whether `guardrails` (plural, jsonb, pre-filled from a Method per §12.4) replaces or supplements the existing free-text `guardrail`. Recommend supplementing, not replacing, since the existing field is already live and used. |

**Promotion — already built, don't duplicate.** `workstream_promotions`
(`supabase/migrations/20260906100001_workstream_promotions_schema.sql`,
generalized in `20260906100002`) is a working, RLS-governed submit → review
→ approve pipeline that creates a new `projects` row
(`workstream_promotions.created_project_id`) on approval — exactly what
v0.1's generic `promotions` polymorphic audit table plus
`workstreams.promoted_to_project_id`/`promoted_at` were proposing, already
live. Do not build a second, generic version of this. If a future need
arises for *other* entity types to have a promotion-shaped audit trail
(e.g. wiki → Method, §12.1), extend the existing `workstream_promotions`
pattern to a same-shaped sibling table rather than generalizing it into one
polymorphic table — this codebase's own convention (see
`docs/commercial/ROADMAP.md` OR-040's design note) already chose specific,
typed tables over polymorphic ones elsewhere for exactly this reason.

`workstream_artifacts` (evidence attachments, already exists with a
draft → ready_for_review → approved/rejected status ladder, per
`20260831130001_workstream_artifact_status.sql`) already covers artifact
evidence. `workstream_object_links` and `workstream_flow` — genuinely new,
no existing equivalent (see below).

### `workstream_object_links` — genuinely new, keep as designed

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workstream_id | fk → project_workstreams | |
| project_object_id | fk → project_objects | |
| relation_type | enum `reads`\|`writes`\|`creates` | |

### `workstream_flow` — genuinely new, keep as designed

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| from_workstream_id | fk → project_workstreams | |
| to_workstream_id | fk → project_workstreams | |
| sequence_order | int | |

---

## 3. Agent / Execution Tables — mostly already exist, do not unify into `traces`

v0.1 proposed a single `agents`/`agent_versions`/`traces`/`evaluations` set.
The actual system is more differentiated, deliberately:

- **`agents`/`agent_versions`** already exist (KBS-native, graph-based
  agents Ember runs itself) — `AgentVersion` is one immutable row combining
  spec-like fields (`purpose`, `instructions`) and implementation fields
  (`generation_provider_id`/`generation_model_id`, `tool_policy`,
  `guardrails`, `termination_policy`) together. v0.1's
  `specified_by`/`implemented_by` split does **not** exist and isn't a
  natural fit here — that distinction matters more for the *separate*
  `builder_integrations`/`builder_integration_versions` registry (external
  agents/MCP servers KBS only governs, not runs), which already has its own
  `auth_method`/`credentials_policy` reference-only fields serving a similar
  purpose. Recommend dropping `specified_by`/`implemented_by` from this doc
  rather than retrofitting it onto `agent_versions`.
- **No single `traces` table** — call-level data is genuinely split between
  `ai_operation_logs` (internal KBS AI calls — provider, model, tokens, cost,
  now also `project_id`/`is_byo_llm` per the just-shipped Builder AI
  Metering work) and `builder_integration_invocations` (external registered
  tool calls — richer state machine: `proposed → confirmed → executed/
  failed/cancelled`). These have different shapes for real reasons (an
  internal generation call and an external tool invocation with a human
  confirm gate are not the same kind of event). Don't unify them into one
  `traces` table; instead, anywhere this doc needs "what happened," query
  both and present them together in the UI/dashboard layer, the way
  `getBuilderSpendSummary` already reads across `ai_operation_logs` for its
  own narrower purpose.
- **`evaluations`** — the actual system is `eval_datasets`/`eval_cases`/
  `eval_runs`/`eval_results`, a mature, separate feature, plus a *third*,
  unrelated `capability_evaluations` (the Capability Promotion six-template
  certification gate, shipped this session). None of these are the same
  concept as v0.1's generic `evaluations` table scoring an arbitrary trace.
  Recommend this doc's workstream-review evaluation concept (§9, §10, and
  the separate Workstream Presentation doc's "evaluation questions") target
  `eval_runs`/`eval_results` specifically, not a new generic table.
- `traces.project_object_id`/`retrieved_kb_source_ids`/`applied_method_id`
  (v0.1 §3) stay genuinely useful ideas — just as new nullable columns on
  whichever of `ai_operation_logs`/`builder_integration_invocations` is
  relevant, not on a new `traces` table.

---

## 4. Knowledge / Wiki Tables — keep the two real systems separate; add workstream-level ownership as new

v0.1 proposed unifying `knowledge_bases`/`kb_documents`/`wiki_pages` behind
one polymorphic table. The actual system has two genuinely separate,
independently-versioned systems today:

- **RAG side**: `knowledge_bases` → `knowledge_sources` → `documents` →
  `document_chunks` → `kb_vectors` (immutable-version-per-upload).
- **Wiki side**: `wiki_articles` → `wiki_versions` (current-version-pointer,
  draft/review/approve workflow) — a completely different table set, not
  `wiki_pages`.

These differ on purpose, not just naming — don't merge them; the versioning
models exist for reasons specific to each. What **is** genuinely new and
worth building: **workstream-level knowledge-base ownership.** Today
`knowledge_bases` are project-scoped only (via `project_id` or the
`project_knowledge_bases` junction table) — there's no way for one
Workstream within a Project to have its own scoped KB, distinct from the
Project's. If a builder's opportunity Project needs per-Workstream working
knowledge (e.g. one KB for "Edge Inference," a separate one for "Evidence
Storage"), the cleanest addition is a `workstream_knowledge_bases` junction
table mirroring `project_knowledge_bases` exactly, rather than v0.1's
polymorphic `owner_type`/`owner_id` on `knowledge_bases` itself (Postgres
can't enforce a polymorphic FK, and this repo already has a working
same-shape non-polymorphic pattern to copy).

Note: **Working Knowledge & Research Notebooks**
(`working_knowledge_items`, already shipped) may already cover a good chunk
of what a builder actually wants at the workstream level — a private,
per-opportunity notebook. Worth checking against real usage before building
a second, more formal workstream-KB mechanism.

---

## 5. Open Questions for Dev Team (revised)

1. ~~Polymorphic FKs, "risk is lower since isolation is physical"~~ —
   superseded; see §1.1. Where this doc still proposes a polymorphic
   relationship (none remain after §4's change — `workstream_object_links`
   and `workstream_flow` are both plain typed FKs), prefer a typed table
   over `owner_type`/`owner_id`, matching this codebase's existing
   convention.
2. **`object_type` as free text vs. enum** — unchanged from v0.1, still the
   right call: free text now, a registry table later only if needed.
3. **RLS policy shape for every new table** — not optional, per §1.1.
   Concretely: `project_objects`, `workstream_object_links`,
   `workstream_flow`, and any new `project_workstreams` columns need RLS
   mirroring the owner-or-active-member pattern already used by
   `project_workstreams`/`workstream_artifacts` (see
   `supabase/migrations/20260811100004_project_workstreams.sql`'s own
   policies) — a builder manages their own Project's rows; the operator
   reads via the admin client on a narrow, purpose-built query, never a
   widened policy.
4. **Cycle guards on `parent_object_id`/`parent_workstream_id`** — both are
   unrestricted-depth self-referencing FKs; the app layer must guard against
   accidental cycles on insert/update (same caveat v0.1 already flagged for
   `project_objects`, now applies equally to the new
   `project_workstreams.parent_workstream_id`).
5. **Embedding re-indexing** — unchanged from v0.1; still a fair question,
   now scoped to the existing `kb_vectors` table rather than a hypothetical
   `kb_documents`.
6. **Method versioning** — unchanged from v0.1: recommend yes, same
   audit-trail reasoning as `agent_versions`.
7. **Single shared deployment, not per-client DBs** — schema changes roll
   out once, against the one shared database, the normal way this codebase
   already does migrations (`supabase/migrations/*.sql`, applied via
   `scripts/run-migrations.mjs`). v0.1's "manual migration per client DB"
   concern doesn't apply in this scope; drop it. It becomes relevant again
   only if/when a second dedicated-instance operator deployment exists
   (ADR-0001), which is out of scope here.

---

## 6. Project Creation Flow — Where Ontology Gets Defined

Unchanged in spirit from v0.1 §6: the current `/projects/new` wizard
(`src/app/(app)/projects/new/`, 6 steps) has no step producing
`project_objects` or the new `project_workstreams` columns. Step 2 ("Define
the problem") already captures objective/business-problem/outcome as free
text (into `details`, per §2 above) — nothing downstream structures it. The
new step ("Define objects & workstreams," inserted between step 2 and step 3)
and its two input modes (explicit tag form + Ember-guided extraction with
confirm-before-write) are unchanged from v0.1 §6.1–§6.3 and remain a sound
design — no revision needed there. Note this wizard is shared between
Enterprise and Builder mode; the new step should render in both, since
`project_objects` isn't Builder-specific even though this doc's *driving*
use case is.

---

## 7–8. Worked Examples

Unchanged in substance from v0.1 §7 (Riverbank Monitoring) and §8
(Sandz-KabatOne multi-level hierarchy) — update only the table name
references when implementing: `workstreams` → `project_workstreams`,
and the `promotions` row in §7's example → an actual
`workstream_promotions` insert (`workstream_id`, `submitted_by`, decided by
the operator, `created_project_id` set on approval) rather than the generic
polymorphic shape shown there.

---

## 9. Workstream List / Evals Section (Derived View)

Same derived-view shape as v0.1 §9 — still just `operational_status` (new
column, §2) joined against workstream results, no new storage beyond that
one column. The query itself should join `eval_runs`/`eval_results` (via
whatever links an eval run to a workstream — confirm/add that FK if it
doesn't exist yet) rather than a generic `evaluations` table, per §3.
`operational_status`'s Ember-driven Q&A trigger (v0.1 §9.3, "hasn't logged
activity in 2 weeks — mark it concluded?") is unchanged and still a good
idea — "activity" there means recent `ai_operation_logs`/
`builder_integration_invocations` rows tied to the workstream, not a generic
`traces` table.

---

## 10. Management Dashboard (Curators & Admins)

One correction from v0.1 §10.2: **`project_notes` already exists** — it's a
live, shipped table (`project_notes`/`project_note_replies`,
`src/lib/projects/notes.ts`) with its own author/role/content shape and a
note-context UI already wired into the Project and Workstream pages
("Add a note about this workstream" links, already live). Don't recreate
it — the dashboard's Notes section should read from the real table. Confirm
whether the existing table already matches v0.1's proposed
append-only/role-snapshot shape closely enough, or whether it needs an
extension, before assuming a new table is needed.

Everything else in v0.1 §10 (composition table, access control restricted to
Curator/Admin, print/download options) is unchanged and still sound — it was
already correctly designed as "mostly a composition of views already
defined," which turns out to be even more true than v0.1 knew.

---

## 11. Duplicate / Clone Projects & Workstreams (for Comparison)

Unchanged in design from v0.1 §11 — genuinely new capability, no existing
equivalent (confirmed: no cloning mechanism exists anywhere in the schema
today). Update table names (`workstreams` → `project_workstreams`) when
implementing. The one open question worth adding: v0.1's workstream-clone
design assumes a way to bind "the actual variable being tested" (e.g. a
different `agent_version`) to a clone — `project_workstreams` has no direct
`agent_version_id`/`builder_integration_version_id` column today (that
linkage currently lives on `ai_operation_logs`/`builder_integration_
invocations`, per §3). Decide at build time whether a clone's "variable"
needs a real column on `project_workstreams` or can stay inferred from which
integration/agent its runs actually used.

---

## 12. Methods as Cross-Project Reusable Units

This is v0.1's most consequential correctly-identified gap, and it's real:
**confirmed, no `methods` table or anything like it exists.** The existing
"Workbench Method Handbook" (OR-018, 18 methods UC1–UC18) is **pure
narrative content** — Markdown Wiki articles the Assistant reads
conversationally each turn (`src/lib/chat/loop.ts`) — with zero structured
schema (`docs/design-notes/showcase-project-library-and-methods.md` says
this explicitly: "not a database table"). A structured `methods` table with
queryable `requirements`/`evidence`/`deliverables`/`guardrails` is a
genuinely different, complementary thing, not a duplicate of the Handbook.

Everything in v0.1 §12.1–§12.5 (two paths up: via wiki maturity or direct
promotion; one path down via `derived_from_method_id`; why `methods` never
needing a `project_id` is what makes it cross-project; instantiation
pre-fills `guardrails` only; Ember checking published Methods before
proposing a new workstream tree; `applied_method_id` closing the
evidence-accrual loop) is unchanged and still the right design. Two
additions given the rescoping:

- Since this doc's driving use case is the Builder Programme specifically,
  the most natural first application of `methods` is **builder-to-builder
  reuse within the one operator deployment** — Builder A's proven pattern
  becomes a Method Builder B can instantiate, both inside the same shared
  database, both subject to the same RLS boundary from §1.1 (a Method row
  itself would need to be operator/curator-published, i.e. reviewed before
  it's visible to other builders — don't let an unreviewed builder pattern
  silently become instantiable elsewhere).
- Relationship to the separate narrative Handbook: consider whether a
  published `methods` row should optionally link to a Handbook article
  (`wiki_articles.id`, nullable) for the human-readable writeup, keeping the
  structured fields and the narrative prose as two views of the same
  concept rather than asking builders to maintain both separately.

---

## Summary: what actually needs building

**New tables:** `project_objects`, `workstream_object_links`,
`workstream_flow`, `methods`, `workstream_knowledge_bases` (junction,
mirroring `project_knowledge_bases`).

**New columns on existing tables:** `project_workstreams` gains
`parent_workstream_id`, `lifecycle_stage`, `operational_status`,
`planned_duration`/`actual_duration`, `cloned_from_workstream_id`,
`derived_from_method_id`, `guardrails` (jsonb, alongside the existing
free-text `guardrail`); `projects` gains `cloned_from_project_id` (and
optionally `promoted_from_workstream_id` as a denormalized convenience).

**Not built — already exists, use as-is:** the promotion pipeline
(`workstream_promotions`), artifact evidence (`workstream_artifacts`),
project-level notes (`project_notes`), project-level KB attachment
(`project_knowledge_bases`), internal/external call logging
(`ai_operation_logs`/`builder_integration_invocations`), the evaluation
system (`eval_datasets`/`eval_runs`/`eval_results`), and builder identity
(`profiles` + `builder_lab` Project ownership).

**Explicitly dropped:** `clients`, `builders`, the polymorphic
`knowledge_bases.owner_type`/`owner_id`, the generic `traces` table, the
generic polymorphic `promotions` table, `agent_versions.specified_by`/
`implemented_by`.
