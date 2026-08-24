# Development Request: Project Approval Authorities and Governance

**Status:** Proposed  
**Priority:** Next major project-governance increment  
**Audience:** Product, architecture, development, security, and test teams

## Summary

Add project-scoped authority planning and approval governance to KB Sandbox.

When a user creates a project, the Project Wizard should identify which kinds of human approval the project is likely to require and prompt the project creator to assign appropriate authorities. Authority assignments can be completed during project creation or left visibly unresolved and updated later from the project.

Do not replace or overload the existing platform roles:

- Consultant
- Curator
- Admin

Platform roles continue to govern platform-wide access and curation responsibilities. Project participation, business function, and approval authority must be modeled as separate concerns.

The initial implementation should support useful project governance without becoming a general workflow engine.

## Product principle

> Roles determine what someone can access and work on. Approval authorities determine what decisions they may make.

An administrator is not automatically authorized to approve pricing, commercial terms, a technical design, or customer acceptance. Likewise, a sales, finance, support, legal, engineering, or customer representative may have authority within a project without receiving platform administration rights.

The AI Assistant may prepare recommendations, pricing material, proposals, review packages, and approval requests. Consequential approval decisions remain explicit human actions performed by an authorized person.

## Problem

Projects may involve different organizations, clients, delivery models, commercial arrangements, and governance preferences. A fixed global role list cannot represent these differences safely.

Examples:

- A proposal may require Business Development and Technical approval before it is shared with a client.
- Pricing may require Finance approval and an additional Sales Director approval above a discount threshold.
- Non-standard commercial terms may require Legal review.
- A support commitment may require Customer Support or Operations approval.
- A design may require Architecture, Security, or Compliance approval.
- A delivered result may require a named customer representative to provide formal acceptance.

Today KB Sandbox has project membership and platform roles, but it does not capture who is authorized to approve which decisions, whether required authorities have been assigned, or whether an edited artifact still corresponds to its prior approval.

## Goals

1. Prompt for appropriate approval authority during project creation.
2. Allow authority assignments and approval policies to be updated later.
3. Keep platform roles, project roles, business functions, and approval authority separate.
4. Support client-specific approval requirements without hard-coding one workflow per client.
5. Record approval requests and decisions against an exact version or snapshot.
6. Prevent unauthorized or self-incompatible approvals.
7. Preserve internal/customer visibility boundaries.
8. Provide a clear audit trail.
9. Give the Assistant read-only awareness of missing authorities and approval state.

## Non-goals

The first release must not introduce:

- a general-purpose BPM/workflow designer;
- arbitrary customer-authored executable rules;
- automatic approval by an AI model;
- electronic signatures or regulated digital-signature certification;
- contract lifecycle management;
- CRM replacement;
- invoicing, payment processing, or financial accounting;
- a new set of global platform roles for every job title;
- approval delegation chains beyond the bounded model below; or
- organization-wide hierarchy modeling beyond what the first project use cases require.

## Conceptual model

### 1. Platform role

Continue using the existing profile role:

- Consultant
- Curator
- Admin

This controls platform capabilities. It does not confer project-specific business approval authority.

### 2. Project membership role

Project roles control participation and access within one project.

Use or evolve the existing project-membership model to support:

- `owner` — accountable for the project and membership;
- `lead` — coordinates project work and prepares decisions;
- `contributor` — creates and edits project material;
- `reviewer` — reviews project evidence and deliverables;
- `client_reviewer` — reviews released customer-visible material;
- `viewer` — read-only access.

Before changing the existing project-role enum, audit all current role values, RLS helpers, actions, tests, and UI assumptions. Provide a compatibility migration for existing memberships.

### 3. Business function

Business function describes why a member participates. It helps route approval work but does not independently grant authority.

Initial suggested functions:

- Business Development / Sales
- Finance / Pricing
- Legal / Commercial
- Customer Support
- Delivery / Consulting
- Architecture / Engineering
- Security / Compliance
- Customer Representative
- Project Governance
- Other

Use stable identifiers and user-facing labels. Allow a short custom description when `other` is selected.

A member may have more than one function within a project if the data model supports it cleanly. For the first release, one primary function plus optional notes is acceptable.

### 4. Approval type

Start with a bounded catalogue:

- `technical`
- `pricing`
- `commercial`
- `security_compliance`
- `support_commitment`
- `proposal_release`
- `customer_acceptance`
- `knowledge_publication`
- `production_change`

The catalogue should be extensible through migrations/configuration later, but the first release does not require an admin UI for inventing arbitrary approval types.

### 5. Authority assignment

An authority assignment states that a person is permitted to decide a particular approval type within a defined scope.

Record at least:

- project;
- organization/customer context if available;
- authorized project member/user;
- approval type;
- effective date;
- optional expiry date;
- optional monetary limit;
- optional discount-percentage limit;
- optional conditions or notes;
- active/revoked state;
- granted by and granted at;
- revoked by, revoked at, and reason; and
- whether self-approval is permitted for this authority.

Do not permit a plain email address to serve as an authority without a corresponding active user/project membership. If inviting external users is out of scope, allow an authority requirement to remain unassigned rather than creating a fake identity.

### 6. Project approval policy

A project policy defines which approval types apply and under what basic conditions.

For each approval requirement, record:

- approval type;
- required or optional;
- sequence/order where meaningful;
- minimum number of approving authorities;
- whether the requester may approve their own request;
- whether all assigned authorities or any one authorized person may approve;
- optional monetary/discount trigger;
- internal or customer-facing decision scope;
- whether approval is required before an artifact can be released; and
- policy notes/rationale.

Keep conditions deliberately bounded. Do not implement a free-form expression language in the first release.

### 7. Approval request and decision

An approval request must refer to an exact subject:

- project artifact/version;
- assessment/version;
- workstream artifact/version;
- proposal/pricing document snapshot; or
- another explicitly supported project record.

Store:

- project and approval type;
- subject type and subject ID;
- immutable version/snapshot identifier or content hash;
- title and concise decision requested;
- requester and request timestamp;
- status: `draft`, `pending`, `approved`, `rejected`, `returned`, `cancelled`, or `superseded`;
- internal/customer visibility;
- decisions, comments, and timestamps;
- authority assignment used for each decision;
- required and completed approvals; and
- superseded/invalidation reason.

An edit to the approved subject must not silently retain approval. If the content/version/hash changes, mark the approval request `superseded` or otherwise make it visibly no longer applicable.

## Project creation experience

Extend the Project Wizard with a bounded **Governance & Approvals** step. This should occur after the project purpose/team are sufficiently known and before final creation/confirmation.

### Intent-based recommendations

Use project type and answers already collected by the wizard to recommend approval requirements.

Examples:

| Project characteristic | Suggested approval requirements |
|---|---|
| Client/consulting project | Proposal release, commercial, customer acceptance |
| Includes pricing or discount | Pricing, commercial |
| Commits support/SLA terms | Support commitment, commercial |
| Changes production systems | Technical, security/compliance, production change |
| Publishes customer-visible knowledge | Knowledge publication, customer acceptance |
| Internal experiment with no production effect | Technical review may be optional |

Recommendations are editable suggestions, not hidden rules. Explain why each type was suggested.

### Wizard interaction

For each suggested or manually added approval type:

1. Confirm whether it is required, optional, or not applicable.
2. Select one or more existing project members as authorities.
3. Capture relevant limits/conditions if applicable.
4. Show whether self-approval is permitted.
5. Show whether the assignment is complete.

The project creator must be able to finish creation without assigning every authority, provided unresolved requirements are clearly recorded as **Authority needed**. Do not force the creator to invent a person merely to pass the wizard.

Before final project creation, show a summary:

- project roles;
- business functions;
- required approval types;
- assigned authorities;
- unresolved authority gaps; and
- any selected limits or separation-of-duty rules.

## Post-creation management

Add a project-level **Governance** area accessible to the project owner and appropriately authorized managers.

It should provide:

- Approval Policy
- Authority Assignments
- Open Approval Requests
- Approval History
- Missing/Expired Authorities

Allow policy and authority updates after creation with audit records. A policy change must not rewrite historical approval decisions.

Revoking or expiring an authority should prevent new decisions but retain the historical record of decisions made while the authority was valid.

## Approval interaction

An authorized reviewer should be able to:

- inspect the exact subject/version being approved;
- inspect relevant evidence and previous decisions;
- approve;
- reject with a required reason;
- return for changes with a required comment; or
- abstain if a conflict exists.

The interface must state:

- what decision is being made;
- which authority permits the decision;
- whether the decision is internal or customer-visible;
- whether other approvals remain; and
- whether the subject has changed since the request was created.

Do not expose internal pricing assumptions, margins, negotiation notes, internal comments, or other private evidence to client reviewers unless an explicit visibility decision allows it.

## Assistant behavior

The Assistant may:

- explain the project approval policy;
- identify missing or expired authority assignments;
- suggest likely approval types during project planning;
- prepare an approval request or review summary;
- show which decisions remain outstanding;
- navigate the user to the Governance or approval page; and
- retrieve approval history that the current user is authorized to see.

The Assistant must not:

- approve or reject on behalf of a human;
- invent an authority assignment;
- claim that an approval covers a changed version;
- disclose internal approval evidence to unauthorized customer users; or
- bypass confirmation, separation-of-duty, monetary, discount, expiry, or membership checks.

Any future MCP tools for approvals must call the same service layer as the UI and enforce the same identity and authorization rules.

## Suggested data model

Exact names may be adjusted to existing conventions after schema inspection.

### `project_approval_policies`

- `id`
- `project_id`
- `approval_type`
- `requirement_status`
- `sequence`
- `minimum_approvals`
- `approval_mode` (`any_authorized`, `all_assigned`)
- `allow_self_approval`
- `monetary_trigger`
- `discount_trigger_percent`
- `visibility_scope`
- `required_before_release`
- `notes`
- `created_by`, `created_at`, `updated_at`

Unique project/type constraint unless the implementation has a clear need for multiple conditional rows of one type.

### `project_authority_assignments`

- `id`
- `project_id`
- `user_id` or `project_member_id`
- `business_function`
- `approval_type`
- `monetary_limit`
- `discount_limit_percent`
- `conditions`
- `effective_from`, `expires_at`
- `status`
- `allow_self_approval`
- `granted_by`, `granted_at`
- `revoked_by`, `revoked_at`, `revocation_reason`

### `project_approval_requests`

- `id`
- `project_id`
- `approval_type`
- `subject_type`, `subject_id`
- `subject_version_id` and/or `subject_hash`
- `title`, `decision_requested`
- `status`
- `visibility_scope`
- `requested_by`, `requested_at`
- `superseded_at`, `superseded_reason`
- `created_at`, `updated_at`

### `project_approval_decisions`

- `id`
- `approval_request_id`
- `authority_assignment_id`
- `decided_by`
- `decision` (`approved`, `rejected`, `returned`, `abstained`)
- `comment`
- `decided_at`
- immutable snapshot of relevant authority limits/conditions at decision time

### Business function on membership

Prefer adding a bounded `business_function` plus optional `function_notes` to `project_members`, unless a separate membership-function table is justified by a demonstrated multi-function use case.

## Authorization and RLS

RLS and the service layer must enforce at least:

- only active project members may see internal project approval data;
- client reviewers see only approval requests and evidence explicitly marked customer-visible;
- only the project owner or specifically permitted governance manager may modify policy/authority assignments;
- a user may decide only when an active, effective authority assignment covers that approval type and applicable limits;
- expired or revoked assignments cannot be used;
- the decision subject still matches the requested version/hash;
- self-approval restrictions are enforced deterministically;
- project and organization boundaries cannot be crossed; and
- platform Admin status alone does not fabricate business approval authority.

Administrative emergency access, if retained for support, must be distinguishable from business approval and must not create an approval decision.

Use database constraints/functions for critical invariants and service-layer checks for clear error reporting. Add integration/static RLS tests consistent with the existing repository approach.

## Audit and provenance

Record immutable events for:

- policy created or changed;
- authority granted, changed, expired, or revoked;
- approval requested, cancelled, or superseded;
- decision recorded;
- release blocked or permitted; and
- subject changed after approval.

Every audit event should identify actor, timestamp, project, affected record, previous/next state where appropriate, and source surface (UI, Assistant, MCP, or system).

Historical decisions must remain intelligible even if a user's current role, function, name, or authority later changes.

## Notifications

For the first release, in-app notification/needs-attention indicators are sufficient:

- authority assignment requested;
- approval requested;
- request returned/rejected;
- approval completed;
- authority missing or expiring; and
- approved subject superseded by an edit.

Email or external messaging can be a later increment. Do not couple approval correctness to successful notification delivery.

## Dashboard and project visibility

Add concise indicators:

- **Authority needed**
- **Approvals pending**
- **Returned for changes**
- **Approved**
- **Approval superseded**

The project should clearly distinguish an incomplete governance setup from a project delivery issue.

## Migration and compatibility

- Preserve existing Consultant, Curator, and Admin roles.
- Preserve existing projects and memberships.
- Map current project roles carefully after auditing actual values.
- Existing projects begin with no required approval policy unless a deliberate backfill is approved.
- Do not infer historical approvals from project status or comments.
- Do not automatically grant business authority to existing admins, owners, or curators.
- Provide an optional setup prompt for existing project owners to configure Governance & Approvals.

## Implementation stages

### Stage 1 — Authority planning foundation

- Schema and RLS for policy and authority assignments.
- Business function on project membership.
- Governance & Approvals step in Project Wizard.
- Project Governance management page.
- Missing-authority indicators.
- No executable approval requests yet.

### Stage 2 — Approval requests and decisions

- Versioned/snapshotted approval requests.
- Approve, reject, return, abstain, cancel, and supersede behavior.
- Separation-of-duty and limit checks.
- Approval history and project/dashboard attention indicators.
- Internal/customer visibility enforcement.

### Stage 3 — Assistant and navigation

- Read-only Assistant tools for policy, authority gaps, requests, and history.
- Assistant preparation of draft approval requests.
- Structured navigation targets to Governance/approval pages.
- No model-executed approval decisions.

Stop and report after each stage. Do not silently expand into notifications integrations, CRM synchronization, contract management, or a generic rule engine.

## Acceptance criteria

### Project creation

- The wizard recommends approval types based on project intent and explains each recommendation.
- The creator can accept, remove, or add approval requirements.
- Authorities can be assigned from active project members.
- Unassigned required authorities are saved as visible gaps rather than fabricated assignments.
- The final summary clearly distinguishes member role, business function, and approval authority.

### Authority management

- Authorized project governance users can grant, update, revoke, and expire assignments.
- Historical decisions retain the authority snapshot used at decision time.
- Admin/Curator platform roles alone do not authorize business decisions.
- Customer users remain project-scoped.

### Approval enforcement

- Unauthorized, expired, revoked, over-limit, cross-project, or prohibited self-approval attempts are rejected.
- Approval applies only to the exact subject version/snapshot.
- Editing an approved subject visibly invalidates/supersedes the approval.
- Required approvals can block release where policy requires it.
- Client reviewers cannot access internal-only evidence or comments.

### Auditability

- Every policy, authority, request, and decision change is attributable and timestamped.
- Approval history is readable after role or authority changes.
- UI, Assistant, and future MCP surfaces use the same service-layer rules.

## Required tests

Add automated coverage for:

- migration of existing project roles/memberships;
- project and customer visibility boundaries;
- policy creation/update permissions;
- authority effective/expiry/revocation rules;
- monetary and discount limits;
- self-approval restrictions;
- one-of/all-assigned approval completion;
- wrong-project and inactive-member attempts;
- immutable decision subject/version;
- approval supersession after edits;
- release gating;
- historical audit preservation;
- Assistant read-only behavior and authorization; and
- crafted Server Action/Data API calls bypassing UI controls.

Run focused tests, the full suite, TypeScript, lint, production build, and live role-based verification using at least:

- project owner;
- contributor/requester;
- internal authorized approver;
- internal unauthorized member;
- client reviewer;
- platform admin without assigned business authority; and
- anonymous/non-member access where relevant.

## Live verification scenario

Use a temporary client project:

1. Create the project with pricing, commercial, technical, and customer-acceptance requirements.
2. Leave one authority deliberately unassigned and confirm **Authority needed** is visible.
3. Assign Sales, Finance, Technical, and Customer authorities.
4. Prepare a versioned proposal/pricing artifact.
5. Confirm an unauthorized member and an unassigned Admin cannot approve it.
6. Confirm the authorized approvers can make their respective decisions.
7. Confirm a discount above the authority limit is rejected or escalated.
8. Confirm customer reviewers cannot see internal pricing evidence/comments.
9. Edit the approved artifact and confirm approval becomes superseded.
10. Re-request approval for the new version and complete the required decisions.
11. Confirm the full audit trail.

Delete temporary test data only after explicit confirmation.

## Open design decisions to resolve before Stage 2

1. Which current project artefact types have durable versions suitable for approval?
2. Should the first release support monetary amounts in one project currency only?
3. Does “all assigned” include temporarily inactive/expired assignments, or only those active when the request is submitted?
4. Who may grant the initial project owner's approval authorities?
5. Should customer acceptance require an externally visible acknowledgement statement?
6. Which project actions are initially release-gated by approval?
7. Is organization-level authority needed immediately, or can all first-release assignments remain project-scoped?

Resolve these explicitly; do not let implementation assumptions become invisible governance rules.

