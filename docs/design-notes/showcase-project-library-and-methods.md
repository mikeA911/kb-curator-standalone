# Showcase Project Library — Categories & Methods (Draft)

Status: **placeholders implemented, 2026-08-27.** The 8 new Handbook articles (§5, UC19–UC26)
are seeded and approved (`scripts/seed-showcase-handbook-articles.mjs` +
`scripts/approve-showcase-handbook-articles.mjs`); all 24 showcase Projects (§4), including the
OrderLunch entry, exist as draft-status placeholders with no workstreams yet
(`scripts/seed-showcase-projects.mjs`) -- `details.showcase_category` and `details.method_reference`
per the schema recommendation in §2. "OpenAPI Discovery -- CareCall" was intentionally not
duplicated; it's already the existing "CareCall -- API Modernization Assessment" project. The
OrderLunch Agent entry is a placeholder only -- see §7 for the pending Agent Registry/Gateway
architecture it's waiting on.

Prepared for Mike Aguilar, 2026-08-27, following on from the KB Sandbox business model. Purpose:
organize the growing list of showcase-deployment project ideas into a stable category tree, and
work out which ones can reuse an existing Workbench Method versus which need a new one written.

## 1. How this fits what already exists

Two things already exist in the codebase that this document deliberately builds on top of, rather
than duplicates:

- **Projects** (`supabase/migrations/20260810100002_projects.sql`) — a real table, with `name`,
  `project_type` (`learning` / `experiment` / `consulting` / `transformation` / `knowledge`),
  `objective`, `status`, and a freeform `details jsonb` bag. There is **no category/grouping column
  today** — `project_type` is a different, orthogonal axis (it describes the *kind* of engagement,
  not a showcase-library shelf). See §2 for what to do about that.
- **Workbench Methods** (`docs/design-notes/guided-workbench-methods-design.md`) — **not** a
  database table. A "Method" is Handbook content (Markdown articles) that the Assistant reasons
  about conversationally each turn (`src/lib/chat/loop.ts`). 18 methods (UC1–UC18) already ship
  today. Several of the showcase ideas below are just new **Projects instantiating an existing
  Method**, not new methods — that distinction matters, because it's the difference between
  "write a new Handbook article" and "just start the project."

Every method sketch below follows the exact structure the existing catalogue uses, so it can be
pasted into the Handbook later with minimal rework: **Goal → Requirements (Required/Optional, Git
required: Y/N) → Method/Analysis → Deliverables → Boundary.**

## 2. Category taxonomy

Five categories, as you laid out:

1. **Everyday Business** — HR · Accounting · Procurement · RFPs · Sales · Support · PMO · Order Lunch 🍔
2. **Technology & Modernization** — System Understanding · OpenAPI · MCP · Code Review ·
   Refactoring · Feature Introduction
3. **AI Engineering** — Model Comparison · RAG Experiments · Infrastructure Benchmarking · Local
   vs Cloud AI
4. **Industry Labs** — Healthcare/CareCall · Semiconductor Quality · KABATONE Smart City ·
   Zadara/Hammerspace/NVIDIA
5. **Education** — AI Experimentation · Model Comparison · Reproducible Student Research

**Schema recommendation (not yet built):** don't overload `project_type` — it means something
different. The lowest-risk near-term option is to record the category as a plain string inside the
existing `details` jsonb (e.g. `details.showcase_category`), which needs zero migration and can be
changed freely while the taxonomy is still moving. Promote it to a real column (with a check
constraint) only once this 5-category list has survived actually being used for a few real
showcase projects — a schema constraint locked in too early is exactly the kind of thing that gets
expensive to walk back.

## 3. The big finding: most of this reuses 8 existing methods, not 24 new ones

Mapping every showcase idea against the UC1–UC18 catalogue, three things fall out:

- **9 of them are a straight reuse of an existing method**, applied to new evidence — no new
  Handbook content needed at all, just a new Project.
- **The 11 "Everyday Business" ideas collapse into 5 reusable new methods** (not 11), because
  they're the same shape repeated across departments — a policy-grounded Q&A/drafting method, an
  onboarding-assembly method, a document-comparison method, a structured-rule-review method, and a
  checklist-generation method.
- **3 Industry Labs ideas need genuinely new, domain-specific methods** (structured incident
  investigation, supplier compliance audit, multimodal/edge architecture placement).

That's **8 new methods total** (UC19–UC26 below) to cover everything that doesn't already exist,
plus reuse of 8 of the current 18. Worth deciding as a group before drafting all 8 in full —
flagged in §6.

## 4. Full showcase library, categorized and mapped

| Category | Showcase project | Example question / task | Difficulty | Method |
|---|---|---|---|---|
| Everyday Business — HR | HR Policy Copilot | "Can I carry unused leave into next year?" | 🟢 | **New: UC19** Governed Q&A & Grounded Drafting |
| Everyday Business — HR | Employee Onboarding | Build a role-specific onboarding guide | 🟢 | **New: UC20** Guided Onboarding / Role-Specific Guide Assembly |
| Everyday Business — HR | HR Policy Comparison | Compare old/new policy, find material changes | 🟢 | **New: UC21** Document/Policy Comparison |
| Everyday Business — Accounting | Accounting Policy Copilot | Explain expense/reimbursement/approval rules | 🟢 | Reuses **UC19** |
| Everyday Business — Accounting | Invoice / Expense Review | Check synthetic expense claims against policy | 🟢/🟡 | **New: UC22** Structured Rule-Based Review with Human Approval |
| Everyday Business — Accounting | Month-End Close Assistant | Generate a close checklist from procedures | 🟢 | **New: UC23** Reusable Workflow/Checklist Generation |
| Everyday Business — Procurement/RFPs | Procurement Assistant | Compare three vendor proposals against an RFP | 🟢 | **New: UC24** Multi-Document Comparative Scoring |
| Everyday Business — Procurement/PMO | Contract Review Workspace | Obligations, differences, legal-review flags | 🟢/🟡 | Reuses **UC22** pattern (rule set = standard terms) |
| Everyday Business — Sales | Sales Proposal Copilot | Draft an evidence-backed proposal | 🟢 | Reuses **UC19** (drafting mode) |
| Everyday Business — Support | Customer Support Copilot | Answer questions, know when to escalate | 🟢 | Reuses **UC19** (+ escalation guardrail) |
| Everyday Business — PMO | SOP / Operations Copilot | "What should I do when X happens?" | 🟢 | Reuses **UC19** |
| Everyday Business — PMO | Policy / Regulatory Change Impact | What's affected by a new rule? | 🟡 | Reuses **UC21** (impact-mapping variant) |
| Everyday Business — Procurement | Vendor/Product Evaluation | Compare vendors against one requirement set | 🟡 | Reuses **UC24** |
| AI Engineering — Model Comparison | AI Model Selection | Claude vs Gemini vs Grok on our workload | 🟡 | Reuses **UC10** (AI Model Evaluation) |
| Technology & Modernization — System Understanding | Legacy Documentation Recovery | Reconstruct what an undocumented app does | 🟡 | Reuses **UC8** (Documentation Recovery) |
| Technology & Modernization / Industry Labs (Healthcare) | OpenAPI Discovery — CareCall | Reconstruct an API from an existing repo | 🟡 | Reuses **UC3** (OpenAPI Discovery) |
| Technology & Modernization — Code Review | Code Review | Independent models review the same codebase | 🟡 | Reuses **UC7** (Code Review Comparison) |
| Technology & Modernization — Refactoring | Refactoring Assessment | Evidence-backed refactoring plan, no code changes | 🟡 | Reuses **UC17** (Refactoring Plan) |
| Technology & Modernization — Feature Introduction | New Feature on Legacy System | Impact of a new user story on an existing app | 🟡 | Reuses **UC15** (Legacy Feature Introduction) |
| AI Engineering — Infrastructure Benchmarking | AI Infrastructure Benchmark | Cloud vs regional vs edge/local | 🟡/🔴 | Reuses **UC12** (Local vs Cloud AI), extended to 3 tiers |
| Industry Labs — KABATONE Smart City | KABATONE Visual/Edge AI | Where should CCTV inference/storage/correlation run? | 🔴 | **New: UC26** Multimodal/Edge AI Architecture Placement |
| Industry Labs — Semiconductor Quality | Semiconductor 8D Investigation | Investigate a synthetic manufacturing failure | 🔴 | **New: UC25** Structured Incident/Failure Investigation |
| Industry Labs — Semiconductor Quality | Semiconductor Supplier Audit | Supplier evidence vs requirements, draft a CAP | 🟡/🔴 | Reuses **UC22** pattern (+ CAP deliverable) |
| Education | School AI Laboratory | Students reproduce an experiment across models | 🟡 | Reuses **UC18** (Experiment Replication/Application) |
| Everyday Business — Order Lunch 🍔 | OrderLunch Agent (roadmap, not this batch) | "Order me something from the usual spots before noon" | 🎉 | Roadmap idea — a per-food-outlet agent, each outlet its own "skill" (menu, ordering flow, cutoff time). Genuinely a fun stress test of Agent Design (UC13): real tool boundaries, real external side effects (an actual order gets placed), real human-approval-before-spend gate. Not scoped or implemented in this pass — flagged here so it doesn't get lost. |

## 5. The 8 new methods, drafted in the existing catalogue's format

### UC19 — Governed Q&A & Grounded Drafting

**Goal**
Answer a practitioner's question, or draft a short document, using only approved organizational
knowledge — never inventing a policy, number, or capability that isn't in an approved source.

**Requirements**
Required: a question or drafting request; at least one approved knowledge source (policy Wiki,
procedure doc, product/pricing sheet). Optional: prior similar Q&A or precedent notes; a target
audience/format for drafting requests.
Git required: No.

**Method**
Retrieve from approved knowledge only (Project Knowledge → Platform Knowledge, per the existing
retrieval order in §28 of the parent catalogue). Ground every claim in a specific cited source. If
the source is silent, ambiguous, or conflicting, say so explicitly rather than filling the gap —
and for support-style use, escalate to a human instead of guessing.

**Deliverables**
Grounded answer or draft, with citations; an explicit ambiguity/gap flag where the approved
knowledge doesn't cover the question; an escalation flag where appropriate (support use case).

**Boundary**
KB Sandbox answers/drafts from approved knowledge only. A human owns anything the knowledge base
doesn't already settle — this method should refuse to speculate rather than sound confident and be
wrong, which matters most for Sales Proposal Copilot (never invent pricing/capabilities) and
Customer Support Copilot (escalate rather than bluff).

---

### UC20 — Guided Onboarding / Role-Specific Guide Assembly

**Goal**
Assemble a role-specific onboarding guide from already-approved policies and processes.

**Requirements**
Required: target role definition; approved policy/process sources covering that role. Optional:
manager notes; team-specific supplementary docs.
Git required: No.

**Method**
Classify which approved policies/processes apply to the target role, sequence them into a guided
reading/task path, and assemble the result as a single artifact. Flag any step of the role's
onboarding that has no corresponding approved source yet.

**Deliverables**
Onboarding Guide artifact (role-specific); a gap list naming anything the guide had to skip because
no approved source existed.

**Boundary**
A curated compilation of existing approved material, not new policy authored on the fly. HR
approves the assembled guide before it's used.

---

### UC21 — Document/Policy Comparison (with a Regulatory-Impact variant)

**Goal**
Compare two versions of the same document and identify material changes — or, in the variant, take
one new external rule and identify which internal documents/processes it affects.

**Requirements**
Required (comparison mode): two document versions; comparison criteria (what counts as
"material"). Required (impact variant): the new rule/regulation text; the corpus of internal
policies/processes to check it against. Optional: change rationale, prior similar impact
assessments.
Git required: No.

**Method**
Comparison mode: diff at clause/section level, classify each change (material / clarifying /
administrative), summarize the practical effect of each material change. Impact variant: for each
candidate internal document, assess relevance and conflict against the new rule, and classify the
impact (must change / should review / no impact).

**Deliverables**
Change Summary; Material Changes list; Evidence Map back to the specific clauses compared. (Impact
variant: an Affected-Documents list with impact classification per document.)

**Boundary**
Findings for human review — legal/HR/compliance decides what to actually change. No automatic
adoption of new policy text.

---

### UC22 — Structured Rule-Based Review with Human Approval

**Goal**
Check a submitted item — an expense claim, a contract, a supplier's compliance evidence — against a
defined rule or requirement set, and flag exceptions for a human to decide.

**Requirements**
Required: the item(s) to review; the rule/policy/requirement set to check against; defined approval
authority. Optional: prior exception history; a Corrective Action Plan (CAP) template, for
compliance-audit uses.
Git required: No.

**Method**
Extract the item's relevant structured fields/claims, evaluate each one against the applicable
rule, and flag violations or ambiguous cases rather than silently approving or rejecting. For
compliance-audit uses, draft the CAP against each flagged gap.

**Deliverables**
Findings; flagged Exceptions; a Recommendation; (compliance variant) a draft Corrective Action
Plan; an Approval record once a human has decided.

**Boundary**
KB Sandbox flags and recommends. A human approves or rejects every exception — this method should
never auto-approve or auto-reject on its own, which is the whole point for expense claims, contract
deviations, and supplier audit findings alike.

---

### UC23 — Reusable Workflow/Checklist Generation

**Goal**
Generate a step-by-step checklist or workflow from documented procedures, informed by relevant
notes from prior runs.

**Requirements**
Required: procedure documentation to generate from. Optional: prior run notes or known exceptions
from previous cycles.
Git required: No.

**Method**
Extract the procedure's steps, sequence them, and fold in lessons from prior-run notes (e.g., a
step that's commonly missed). Produce the result as a reusable artifact/template, not a one-off
answer.

**Deliverables**
Checklist/Workflow artifact, designed to be reused each cycle; a gap list where the underlying
procedure is undocumented or ambiguous.

**Boundary**
Compiled from existing approved procedure. Does not invent new procedure steps — an undocumented
step becomes a gap flag, not an assumption.

---

### UC24 — Multi-Document Comparative Scoring

**Goal**
Score and compare multiple candidate documents — vendor proposals, vendor products, tools — against
one common requirement set.

**Requirements**
Required: the requirement set (an RFP or spec); two or more candidate documents. Optional: a
weighting/scoring rubric.
Git required: No.

**Method**
For each candidate, extract its claims against each requirement, score coverage and fit, and
surface gaps or risks a human reviewer should specifically check. Rank the candidates against the
common requirement set — never against each other's marketing framing.

**Deliverables**
Comparison Matrix; per-candidate Scoring; Gaps/Risks; a Recommendation.

**Boundary**
KB Sandbox scores based on the evidence each candidate actually submitted. Procurement (or whoever
owns the decision) makes the award — this method surfaces the comparison, it doesn't decide.

---

### UC25 — Structured Incident/Failure Investigation

**Goal**
Investigate a reported failure or incident using a defined structured framework (e.g., 8D:
Team → Problem Description → Containment → Root Cause → Corrective Action → Implementation →
Prevention → Closure), grounded in submitted evidence rather than speculation.

**Requirements**
Required: the incident/failure report; the relevant process/quality data; the investigation
framework to use (e.g., 8D). Optional: historical records of similar incidents.
Git required: No.

**Method**
Walk the structured framework step by step. Ground each step's content in the evidence actually
submitted, and explicitly flag any step where the evidence needed to complete it is missing, rather
than filling it in speculatively.

**Deliverables**
A Structured Investigation Report, organized by framework step; an Evidence Map; an explicit list
of open items still needing further data or a human decision.

**Boundary**
KB Sandbox drafts the structured investigation. The quality/process owner approves the root-cause
finding and the corrective action before the investigation is closed — root-causing a
manufacturing failure is exactly the kind of judgment call this method should surface evidence for,
not make unilaterally.

---

### UC26 — Multimodal/Edge AI Architecture Placement

**Goal**
Determine where each stage of a multimodal pipeline (e.g., CCTV inference, storage, cross-camera
correlation) should physically run — cloud, regional, or edge/local — for a system like a smart-city
deployment.

**Requirements**
Required: a representative multimodal workload description; telemetry/latency/bandwidth
constraints; privacy/data-residency constraints. Optional: existing edge hardware inventory; cost
targets.
Git required: Depends on workload.

**Method**
The same evaluation shape as UC12 (Local vs Cloud AI), but applied per pipeline stage rather than
to a single model-placement decision — inference, storage, and correlation/aggregation can each
land in a different tier, and usually should.

**Deliverables**
A Placement Architecture naming the tier for each pipeline stage; a latency/cost/privacy tradeoff
analysis; a Recommendation.

**Boundary**
An architecture recommendation. No autonomous deployment or reconfiguration of actual camera/edge
infrastructure.

## 6. Open decisions before drafting these into the real Handbook

1. **Do the 5 new "Everyday Business" methods (UC19–UC24) get authored as generic, department-agnostic
   Handbook articles** (the way the existing catalogue keeps Code Review/Refactoring generic to any
   codebase), **or department-specific variants**? Recommend generic-with-examples, matching how
   UC10/UC12 already read.
2. **Numbering** — UC19–UC26 here are provisional. The existing catalogue's own numbering already
   collided once with the platform roadmap's M5–M7 (noted in its own status section) — worth
   picking final numbers only once these are actually being written into the Handbook.
3. **Category storage** — confirm the `details.showcase_category` approach in §2 before any of
   these become real Projects, so the ~24 showcase projects don't get created twice under two
   different conventions.
4. Given the size (8 new methods, 24 projects), this is a natural place to sequence by category —
   Technology & Modernization and AI Engineering are the fastest wins (8 of 9 reuse existing
   methods with zero new Handbook work); Everyday Business needs the 5 new methods written first;
   Industry Labs needs the 2 fully-new methods (UC25, UC26) and is the highest-effort category.

## 7. OrderLunch Agent — superseded by the Food Outlet AI-Readiness Showcase dev request

**Update, 2026-08-27:** the dev request landed. It broadened this from "build one Lunch Agent" into
a full showcase project demonstrating the governed Method -> Builder -> Agent Registry -> Sandz
deployment pipeline for converting any ordinary business into an AI-accessible service. See
`docs/dev-request-food-outlet-ai-readiness-showcase.md` for the full request (phases, roles,
commercial model, IP boundary, certification framework) and the **"Food Outlet AI-Readiness
Showcase"** project (with a seeded Phase 1 workstream and its full deliverables list) for where
that now lives. The narrower "OrderLunch Agent (Lunch Agent)" placeholder still exists but is
cross-referenced as folded into this broader project's Phase 1, not a separate initiative.

Only the Phase 1 project + workstream placeholder is built. The architecture notes below are kept
for context — **nothing about the actual Agent Registry/Agent Gateway/MCP boundary is implemented.**

- **KB Sandbox is the control plane, not the runtime.** It stores/governs the agent's spec, owner,
  permitted projects/users, available skills, required credentials (references only, never the
  secrets themselves), spending/transaction limits, human-approval requirements, endpoint/protocol,
  eval results, and run/audit history. It does not host arbitrary customer-written agent code.
- **The agent runs externally** — customer server/container, Sandz-managed regional infrastructure,
  a serverless service, the customer's own agent platform (LangGraph, Langflow, etc.), or
  eventually a KB Sandbox-native runtime for approved standard agents. For the Sandz partnership
  specifically: KB Sandbox designs/governs, Sandz hosts on regional infrastructure, customer
  credentials/transactional data stay in-region, KB Sandbox invokes and observes.
- **Reached through a standard boundary** — MCP preferred for a multi-tool agent, HTTPS/OpenAPI as
  the alternative for simpler services. Ember calls the registered agent; it never talks to an
  individual outlet API directly.
- **Skills are replaceable per-outlet adapters** (a Jollibee skill, a McDonald's PH skill, a
  GrabFood skill, a local-canteen skill, a phone/manual fallback, etc.) — the agent owns the common
  intent ("order lunch"), each skill translates that intent into one outlet's specific interface,
  and skills can be added incrementally without rewriting the agent.
- **Not everything is AI reasoning.** Understanding the request is AI; everything from querying
  approved outlet skills through pricing, building order options, and placing the order should be
  deterministic. A structured preview (outlet, items, total, ETA, payment method) plus an explicit
  human Confirm-order action is a hard gate — an order is never submitted from conversational text
  alone ("that looks good" must never be interpreted as authorization to spend money).
- **Credentials/payment never live in prompts, Method definitions, or ordinary KB Sandbox tables** —
  customer/Sandz-managed secret storage, short-lived tokens, explicit spending limits, idempotency
  keys against duplicate orders, and an immutable transaction receipt. KB Sandbox records that an
  approved transaction occurred, not the underlying payment details.
- **Longer-term shape:** three KB Sandbox layers — **Methods** (Agent Design, already UC13, covers
  the guidance), an **Agent Registry** (approved external agents/skills/versions/endpoints/access),
  and an **Agent Gateway** (secure invocation, confirmation, tracing, result capture). Execution
  itself stays external throughout.
- **Suggested build sequence** (for when the dev request lands): Agent Design method walkthrough ->
  external reference implementation (the Lunch Agent as its own service) -> one simple outlet skill
  first (a controlled canteen or mock API, not browser automation against a live consumer site) ->
  register it in KB Sandbox -> expose to Ember through an agent/tool gateway, scoped to permitted
  users -> require structured preview + human confirmation from day one -> evaluate (accuracy,
  wrong-item rate, price discrepancies, duplicate-order protection, latency) before adding more
  outlet skills.
