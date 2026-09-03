# OrderLunch Builder Journey — Live Test Findings

**Date:** 2026-08-31  
**Environment:** `https://kbsandbox.tech`  
**Test account:** temporary `test-builder` account  
**Purpose:** Exercise the complete builder journey: use Ember and Workbench Methods to design an OrderLunch MCP capability, build it externally, register it in KB Sandbox, and test Ember calling it.

## Scope and safety boundary

- Use only a simulated food outlet during the first pass.
- Do not connect a real merchant, delivery service, payment method, or delivery address.
- Require a structured quotation and explicit human confirmation before the simulated `place_order` operation.
- Build the MCP-server case first. Add a separate OrderLunch agent only if evaluation evidence shows that it provides material value.

## Findings

### OL-001 — Canonical showcase Project is inaccessible to the assigned builder

**Status:** Open  
**Severity:** Medium — workflow blocker

**Observed:**

- The accessible `OrderLunch Agent (Lunch Agent)` Project explicitly says that it has been folded into the `Food Outlet AI-Readiness Showcase` Project.
- The temporary builder is a member of the former Project but receives a 404 for the canonical showcase Project.
- The administrator reported that even an admin cannot view the canonical Project and could not find a way to assign the builder a Project-specific Curator role.

**Expected:**

- A suitably authorized Project owner should be able to add the builder to the canonical Project and assign a Project role.
- Platform administration should not silently bypass private Project evidence, but there must be a deliberate, discoverable management or audited support path for resolving membership and ownership problems.

**Impact:**

- The builder must work in a Project already marked as superseded, splitting architecture, evidence and execution history.
- An inaccessible Project can become operationally orphaned if no reachable owner can manage its membership.

**Suggested resolution:**

1. Add an owner-visible Project membership and Project-role management surface.
2. Add an audited emergency/support mechanism for resolving orphaned Project ownership without granting automatic content access.
3. Distinguish clearly between the ability to administer a Project record and permission to read its protected evidence.

### OL-002 — Ember offers `create_workstream` when the caller lacks permission

**Status:** Open  
**Severity:** Medium — misleading action and failed turn

**Observed:**

- Ember presented a ready action: `Create the MCP Architecture Workstream for the OrderLunch project`.
- With the builder assigned as a Project Consultant, the tool call failed under the Project workstream RLS policy.
- The first attempt remained pending for an extended period and required conversation recovery before the actual permission failure became visible.

**Expected:**

- Ember should know whether the current caller may create a workstream before presenting an executable action.
- A denied action should return a prompt, specific explanation without a long pending state.

**Suggested resolution:**

1. Expose capability/permission metadata to Ember or make `create_workstream` return a preflight result.
2. Hide or disable the creation action when unauthorized.
3. Return a structured authorization error naming the required Project authority and the correct management page.

### OL-003 — Ember recovery guidance references an unavailable UI control

**Status:** Open  
**Severity:** Medium — navigation inaccuracy

**Observed:**

- After workstream creation failed, Ember instructed the consultant to open the Project and click `Create Workstream`.
- No such control was visible to the caller on the Project page.

**Expected:**

- Ember should consult the navigation catalogue and the caller's permissions before giving page-level instructions.
- If the action is unavailable, Ember should direct the caller to the Project owner or an actual membership/authority-management page.

**Suggested resolution:**

- Make navigation guidance role-aware and require `get_navigation_guide` before Ember names a specific page or control.

### OL-004 — Suggested human-approval design needs refinement before implementation

**Status:** Design follow-up  
**Severity:** Low during simulation; High before real transactions

**Observed:**

- Ember proposed `place_order(quote_id, human_approval_token)` and correctly required an explicit UI confirmation.
- The first-pass design does not yet specify token binding, expiry, single use, idempotency, quote immutability, authenticated principal, replay prevention, audit fields, or handling of a changed price/menu after approval.
- Ember described a missing or mismatched approval token as `403 Unauthorized`; the eventual contract should use consistent authentication/authorization and business-conflict semantics rather than treating every failure identically.

**Expected before implementation:**

- Approval must be bound to the authenticated user, Project, exact quote digest, outlet, amount/currency, expiry and one permitted operation.
- `place_order` must be idempotent and reject replay, mutation and expired-price scenarios safely.
- The server must remain the final authorization boundary; Ember's UI confirmation alone is not sufficient.

### OL-005 — Platform Curator and Project Curator are easily confused, with no available assignment path

**Status:** Open  
**Severity:** High — builder workflow blocker

**Observed:**

- The temporary account was changed from platform `consultant` to platform `curator` successfully; the header reflected the change immediately.
- Its membership on the OrderLunch Project remained `Consultant`.
- `create_workstream` continued to fail because `can_curate_project` permits a platform admin or an active Project member whose Project role is `owner` or `curator`; platform `curator` does not satisfy that Project-scoped check.
- Neither the Project page nor the available admin experience exposed a way to promote this existing Project member from Project Consultant to Project Curator.

**Expected:**

- The UI should distinguish visibly between platform role and Project role.
- An authorized Project owner should be able to assign and update Project roles.
- Ember should state that a **Project Curator/Owner** role is required, rather than using the ambiguous word “curator.”

**Suggested resolution:**

1. Add Project membership and role management for Project owners.
2. Display both roles where relevant, for example `Platform: Curator · Project: Consultant`.
3. Add a role-aware preflight response to Project-scoped Ember tools.
4. Document the platform-admin emergency bypass separately from ordinary Project membership.

**Retest result:** After temporarily elevating the account to platform `admin`, Ember successfully executed `create_workstream`. A fresh Project-page load showed `MCP Architecture Design` in draft state with `0/5 deliverables`. This confirms that the tool and persistence path work; the blocker is specifically authority assignment/discoverability rather than workstream creation generally.

### OL-006 — Model/provider failure handling is clear, but interrupted the transactional action

**Status:** Observation  
**Severity:** Low

**Observed:**

- A retry using Groq GPT-OSS 120B failed before tool execution because of a provider capacity limit.
- Ember displayed a clear provider-specific message and offered Retry/model switching.
- Retrying with Gemini worked at the model layer and again reached the same Project-authorization failure.

**Positive:**

- The UI made the provider failure distinguishable from the application permission failure.
- No duplicate workstream was created during retries.

### OL-007 — No least-privileged authenticated end-user role

**Status:** Open  
**Severity:** High before broader pilot onboarding

**Observed:**

- The lowest ordinary authenticated platform role is currently `consultant`.
- A consultant is intended to participate in project work, run permitted evaluations and attach workstream evidence; that is broader than the needs of an employee who should primarily use Ember and participate as a Project member.
- The existing distinction between platform roles and Project roles is not sufficiently visible to administrators or users.

**Required role concept:**

Introduce a least-privileged authenticated role, provisionally named **User** or **Member**, below Consultant. It should support the ordinary employee experience without granting curation, architecture, evaluation-management or evidence-administration capabilities.

**Proposed default capabilities:**

- Sign in and maintain the user's own profile and private conversation history.
- See only Projects where the user is an active member.
- Use Ember within those Projects, with retrieval constrained by both Project membership and resource-level permissions.
- Read Project pages, approved Wiki guidance, approved knowledge and sources the user is authorized to access.
- Participate in permitted Project interactions such as receiving/sending notes where policy allows.
- Invoke only certified tools/agents explicitly allowed for the user, Project, sensitivity class and action risk.
- Submit `Report a problem`, improvement suggestions and feature requests through Ember.

**Excluded by default:**

- Creating or curating Projects, Workstreams, knowledge bases, Wiki articles or evaluations.
- Uploading or attaching authoritative evidence unless separately granted.
- Registering, certifying or publishing agents/MCP servers.
- Managing Project membership, approval authorities, visibility or resource access.
- Approving consequential actions for other users.

**Design note:**

- Keep **platform role** and **Project role** independent and visible. A platform User may be a Project Member/Viewer; elevated Project participation should be an explicit assignment rather than an automatic consequence of the platform role.
- Existing users and policies require a migration/default decision. Do not silently demote existing consultants.
- Ember's available tools and UI controls should be capability-derived, not based only on labels embedded in prompts.

### OL-008 — Long architecture-artifact correction produced a production React rendering error

**Status:** Open  
**Severity:** Medium — response becomes unusable

**Observed:**

- Ember successfully generated and attached `Simulated Food Outlet Capability and OpenAPI Contract v0.1`.
- Review showed that v0.1 was a useful skeleton but omitted material requested details, so a precise corrective prompt requested v0.2.
- Instead of a response, the production chat rendered: `Minified React error #441` with a Retry action.
- The failure occurred after the request had been accepted, so it was initially unclear whether the server-side artifact attachment had completed.

**Expected:**

- Large structured responses and tool results must render safely or fall back to a bounded error presentation.
- Turn recovery should state whether tool side effects completed before offering Retry, preventing duplicate artifacts.

**Suggested resolution:**

1. Reproduce with the retained conversation and corrective prompt.
2. Inspect the production React error mapping and server/client logs for this turn.
3. Test large Markdown/YAML responses, tool-result payloads and artifact refreshes at component level.
4. Make Retry idempotent or report completed created-record references before retrying.

### OL-009 — Temporary account session ended and supplied credentials stopped authenticating

**Status:** Resolved for testing; root cause not established  
**Severity:** Medium — test continuation blocked

**Observed:**

- Following the React error, reloading the workstream redirected to `/login`.
- A controlled sign-in retry using the same previously successful temporary credentials returned `Invalid login credentials`.
- No password change was performed during this test.

**Expected:**

- A role update may invalidate a session, but should not invalidate the account password.
- If an administrator action disabled/reset the account, the management UI and audit trail should make that reason visible.

**Next check:**

- Confirm the temporary account still exists and reset/reconfirm its password before attributing this to an application defect.

**Resolution used:**

- Added a separate, deliberately narrow `scripts/seed-codex-test-users.mjs` utility without changing Claude's existing seed script.
- Reset only `test-builder@kbsandbox.local`, restored access and continued the retained Project/workstream exercise.

### OL-010 — Ember attached artifacts that did not satisfy the requested contract

**Status:** Open  
**Severity:** High for document-first implementation handoff

**Observed:**

- Ember attached OpenAPI contract v0.1, but it omitted requested capabilities and security/transaction details.
- A detailed correction request initially triggered React error #441 and attached nothing.
- A bounded retry successfully attached v0.2, but v0.2 remained a short endpoint catalogue rather than an implementation-ready OpenAPI contract: it lacked complete schemas, required fields, examples, shared error responses, capability/actor table, state transition table, audit model and the requested behavioral semantics.
- Ember nevertheless stated that the corrected artifact had been created successfully.

**Expected:**

- “Successfully attached” must not imply that an artifact satisfies its acceptance criteria.
- Document-first handoffs need explicit validation of structure and required sections before they can be treated as deliverable candidates.

**Suggested resolution:**

1. Add artifact acceptance criteria/checklists to the Method or Workstream.
2. Validate OpenAPI artifacts syntactically and report missing required contract sections.
3. Distinguish `draft generated`, `validation failed`, `ready for human review` and `human approved` states.
4. Let a reviewer supersede/reject an artifact version without deleting evidence of the earlier attempt.

### OL-011 — Artifact generation can exhaust the tool-step budget and lose obvious page context

**Status:** Open  
**Severity:** Medium — recoverable but confusing for non-technical builders

**Observed:**

- The first authentication/authorization design request exhausted Ember's allotted steps without attaching an artifact.
- A shorter retry, made while Ember was visibly opened from the target workstream, asked the user to supply the workstream ID.
- Supplying the known ID in a third message allowed the artifact to attach successfully.

**Expected:**

- A workstream-bound Ember invocation should preserve the current Project and workstream identifiers across the turn.
- If the request is too broad for the remaining step budget, Ember should say which operation remains rather than discarding known context or asking for an identifier already available to its tools.

**Suggested resolution:**

1. Bind Project/workstream IDs as trusted invocation context rather than relying on the model to infer or repeat them.
2. Reserve one final tool step for the requested attachment or return a resumable draft state.
3. Show a concise checklist of completed and outstanding side effects when the iteration limit is reached.

### OL-012 — Provider capacity fallback works, but long attachment turns remain slow

**Status:** Partially working  
**Severity:** Low for the showcase; important for predictable builder UX

**Observed:**

- Groq GPT-OSS 120B reached a provider capacity limit while creating the implementation handoff.
- Ember clearly identified the provider, offered Retry/model switching and did not falsely report success.
- Retrying the same turn with Gemini completed and attached exactly one handoff artifact.
- Both the MCP Architecture and Implementation Handoff turns displayed the durable `This is taking longer than expected` recovery state before completing.

**Positive:**

- The retained pending turn completed without a duplicate attachment.
- Model switching on Retry preserved the original user request.

**Suggested resolution:**

- Preserve this recovery behavior, add elapsed/progress detail where practical, and test that repeated Retry clicks are idempotent for every artifact-writing tool.

## Positive observations

- Project binding correctly constrained Ember's knowledge scope.
- Ember did not invent or disclose content from the inaccessible canonical showcase Project.
- Ember selected the relevant MCP Architecture and Agent Design Methods.
- Ember correctly recommended direct Ember-to-MCP orchestration for the first linear transaction instead of assuming that a separate agent was necessary.
- The response renderer handled headings, diagrams, code/tool names, citations, Project links, Requirements, next actions and Artifacts cleanly.

## Test progress

| Stage | Status |
| --- | --- |
| Temporary builder sign-in | Passed |
| Project-scoped Ember architecture discussion | Passed with findings |
| MCP Architecture Workstream creation | Passed as platform admin; role-management findings remain |
| Architecture artifact generation | Five candidate deliverables attached; human/content validation pending |
| MCP server implementation | Pending |
| Independent contract and safety tests | Pending |
| Builder Registry registration/certification | Pending |
| Ember read-tool integration | Pending |
| Simulated quotation and confirmed order | Pending |
| Separate-agent comparison | Pending / evidence-dependent |
