# Development Request — AI-Accessible Application Discovery and MCP Method Extension

**Status:** Proposed — near future  
**Priority:** P2 — begin after current pilot-gating work  
**Public roadmap alignment:** M2 Organize, M3 Evaluate, M5 Apply, M7 Govern  
**Extends:** Legacy Feature Introduction (Workbench Method); MCP Architecture: Evidence-Led Development for an Existing Application  
**Reference case:** KB Sandbox itself

## Objective

Extend two existing Workbench Methods so KB Sandbox can help organizations make legacy applications safely accessible to AI assistants and agents. Use KB Sandbox as the first reference case, beginning with a living catalogue of its user workflows and navigation, then use selected capabilities to evaluate a future KB Sandbox MCP interface.

Do not create a third overlapping Method. Keep the responsibilities explicit:

- **Legacy Feature Introduction** discovers business intent, workflows, roles, rules, evidence, gaps and the approved AI-accessible scope.
- **MCP Architecture** converts the approved scope into service/API boundaries, MCP tools, authorization, guardrails and test evidence.

The reusable traceability chain is:

`business capability → user workflow → business rule → authority → service/API → MCP tool → guardrail → test evidence`

## Why this matters

OpenAPI discovery describes a callable interface but rarely captures the full business system. Important behavior may exist only in screens, role checks, approval procedures, staff knowledge, reports, notifications or operational conventions. Generating an MCP server directly from an OpenAPI specification can therefore omit essential features or expose operations without their intended controls.

The Workbench should guide teams from business discovery to a deliberately governed AI interface. The process must work whether implementation is performed by an internal team, a local software house, students, a specialist consultant or an external AI coding environment.

## Stage 1 — Living KB Sandbox Capability and Navigation Catalogue

Create a docs-as-code living document at:

`docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md`

The catalogue is committed with the application and updated in the same change as material user-visible behavior. It is not a release-note database or a separate documentation workflow.

For each verified workflow, record:

- user intent;
- capability name and short purpose;
- applicable role or project relationship;
- prerequisites and required state;
- starting page and stable route pattern;
- shortest supported navigation sequence;
- important decisions, approvals and side effects;
- what Ember may explain, navigate to or perform;
- current limitations and alternative paths;
- applicable application version or last verification date; and
- related service/tool capability where known.

Classify each capability as one or more of:

- UI guidance only;
- Ember-readable;
- Ember-actionable;
- candidate for external MCP read access;
- candidate for external MCP action;
- confirmation or authority required; or
- prohibited from agent exposure.

### Discovery procedure

Build the initial catalogue through evidence from:

1. anonymous/public browsing;
2. authenticated browsing as each supported role;
3. project-owner, project-member and non-member scenarios;
4. empty, populated, pending-review and approved states;
5. application route and service-layer inspection; and
6. existing automated and live test evidence.

A browser crawl alone is insufficient because conditional, role-specific and empty-state workflows may not be visible in one session.

### Ember use

Convert the catalogue into concise product-navigation knowledge available to Ember through the existing committed UI-knowledge mechanism. Ember should:

- answer where a feature is and who may use it;
- identify missing prerequisites before suggesting navigation;
- offer the correct stable KB Sandbox link when possible;
- distinguish navigating to an action from completing that action;
- avoid links containing test or user-specific identifiers unless derived from the authorized current context; and
- state when a workflow has not been verified.

## Stage 2 — Extend Legacy Feature Introduction

Add an optional **AI-Accessibility Track** to the existing Legacy Feature Introduction Method.

### Additional discovery questions

- Which user outcomes should an AI assistant or external agent support?
- Which existing features and business behaviors must remain unchanged?
- Which roles, authorities and separation-of-duty rules apply?
- Which rules are enforced by code, UI, staff procedure or external system?
- Which actions are read-only, draft-producing, consequential or irreversible?
- What must always remain human-only?
- Which capabilities already have APIs, and which depend on UI-only behavior?
- What evidence proves that the discovered workflow is complete?
- What operational, legal, privacy and commercial constraints apply?

### New or extended deliverable

Produce an **AI-Accessible Capability Catalogue** with at least:

| Field | Purpose |
|---|---|
| Capability and user outcome | States the business intent |
| Actors and authority | Identifies who may request, approve and execute |
| Current workflow | Captures UI, API, human and external-system steps |
| Rules and side effects | Preserves behavior that OpenAPI may omit |
| Evidence and confidence | Shows how the claim was established |
| Interface status | Existing API, inadequate API, UI-only or missing |
| AI exposure classification | Read, draft, confirm, authority-gated or prohibited |
| Gaps and required change | Defines work before safe exposure |

The Method ends with an approved scope and capability catalogue. It does not generate or deploy an MCP server by itself.

## Stage 3 — Extend MCP Architecture

Update **MCP Architecture: Evidence-Led Development for an Existing Application** so the AI-Accessible Capability Catalogue is a preferred input when modernizing a legacy application.

For every proposed MCP tool, require traceability to:

- an approved business capability and intended user outcome;
- authoritative workflow and business-rule evidence;
- the acting user or system identity;
- underlying service/API operations;
- project, tenant and data-access boundaries;
- side effects and reversibility;
- confirmation or approval authority;
- errors, retries, timeouts and idempotency;
- audit and observability requirements; and
- functional, authorization and adversarial test evidence.

### Required exposure decision

Every discovered capability must be explicitly classified as:

1. not exposed;
2. MCP read-only;
3. MCP draft/proposal only;
4. MCP action after explicit confirmation;
5. MCP action requiring named project/business authority; or
6. deferred until missing controls or APIs exist.

### Extended deliverables

- Capability-to-service-to-tool traceability matrix
- MCP resource and tool contract
- Authentication and delegated-authorization design
- Human-confirmation and approval map
- Error, retry and idempotency contract
- Audit, logging and operational monitoring plan
- Evaluation dataset and acceptance evidence
- Versioning, compatibility and rollback plan
- Implementation handoff for the selected external engineering environment

## Stage 4 — KB Sandbox reference exercise

Use KB Sandbox to validate the extended Methods without immediately exposing the whole product externally.

1. Complete the Capability and Navigation Catalogue.
2. Select a small set of low-risk, high-value capabilities.
3. Map those capabilities to the existing Workbench service layer and Ember's bounded internal tools.
4. Identify missing services, authorization inconsistencies and UI-only rules.
5. Produce a proposed external MCP contract and threat/authority review.
6. Implement an external transport only after a concrete consumer and authentication design are approved.

Good early read candidates may include:

- list projects available to the authenticated caller;
- retrieve an authorized project summary;
- search approved project knowledge;
- search approved platform guidance;
- list applicable Workbench Methods and requirements; and
- retrieve workstream or approval status.

Possible later write candidates may include creating a draft workstream or attaching an externally produced artifact. Publishing, approval, commercial release and consequential external-agent invocation should remain excluded or authority-gated until separately justified and tested.

## Reuse for clients

The revised Methods must remain platform-neutral. A client engagement should be able to apply the same process to:

- ERP, billing and invoicing systems;
- customer support and call-center applications;
- food ordering, delivery and logistics platforms;
- healthcare administrative systems;
- legacy portals and line-of-business applications;
- document and approval workflows; and
- applications hosted or modernized by Sandz and regional software partners.

KB Sandbox guides discovery, evidence, architecture, governance and evaluation. Implementation may occur outside KB Sandbox and return as versioned artifacts and test evidence.

## Guardrails

- Do not equate route discovery with authorization to invoke an action.
- Do not treat OpenAPI as proof of business completeness.
- Do not expose a database operation merely because it is technically callable.
- The MCP layer must act as an identified principal and must not become a privileged shortcut around application authorization.
- Preserve tenant, project, role, evidence and approval boundaries through the shared service layer.
- Consequential actions require explicit confirmation and, where applicable, the correct named authority.
- Never place secrets, live credentials or sensitive customer evidence in the catalogue or Method templates.
- Keep the legacy interface available until intended-scope parity and operational confidence are demonstrated.
- Prefer deterministic code for validation, calculations, access checks and state changes; use models for interpretation and bounded judgment.

## Acceptance criteria

1. The KB Sandbox Capability and Navigation Catalogue exists as a committed living document with a clear update convention.
2. The initial catalogue covers public, ordinary-user, curator/admin and project-scoped workflows using verified evidence.
3. Ember can use the catalogue to provide correct role-aware navigation without implying it completed restricted actions.
4. Legacy Feature Introduction contains the optional AI-Accessibility Track and produces the AI-Accessible Capability Catalogue.
5. MCP Architecture accepts that catalogue and produces capability-to-tool traceability.
6. Each proposed tool has an explicit exposure classification and authority requirement.
7. The KB Sandbox reference exercise identifies a small external-MCP candidate scope without assuming the external transport is already approved.
8. A non-member or wrong-role caller cannot gain capability merely through the MCP design.
9. At least one UI-only or procedurally enforced business rule is captured that would have been missed by OpenAPI alone.
10. Method examples demonstrate reuse for at least one client legacy application outside KB Sandbox.
11. Automated or repeatable checks detect stale route patterns and broken Ember navigation targets.
12. The final artifacts distinguish current implementation, proposed interface and future capability.

## Recommended delivery sequence

1. Catalogue template and update convention.
2. KB Sandbox workflow discovery and initial catalogue.
3. Ember navigation-knowledge integration and link checks.
4. Legacy Feature Introduction Method amendment.
5. MCP Architecture Method amendment.
6. KB Sandbox capability-to-service mapping and small candidate MCP scope.
7. Client-oriented worked example and reusable implementation handoff.

## Explicitly deferred

- External MCP transport and OAuth/token issuance
- Broad write access to KB Sandbox
- Autonomous publication or approval
- Automatic UI crawling in production
- Treating every application route as an MCP tool
- Replacing existing client interfaces before parity and acceptance are demonstrated

