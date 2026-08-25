# Development Request: Project Evidence Access Controls

**Status:** Proposed  
**Priority:** Pilot security requirement before real customer pricing or confidential evidence is uploaded  
**Audience:** Product, architecture, development, security, data, and test teams  
**Related method draft:** [`docs/workbench-method-project-access-evidence-authority-design.md`](workbench-method-project-access-evidence-authority-design.md)

## Summary

Add evidence-level access controls within a project so project membership does not automatically expose every source, Wiki article, artifact, or derived result to every project participant.

The motivating example is customer pricing history. A salesperson may upload historical proposals, discounts, margins, contract terms, or sales records for one customer. That evidence should be usable only by the relevant sales, pricing, finance, and authorized management users. A technical consultant, support engineer, customer reviewer, unrelated platform curator, or member of another project must not retrieve it merely because they can open the project.

This request deliberately separates four concepts:

1. **Project role** — what project administration or contribution actions a person may perform.
2. **Business function** — why the person participates, such as Sales, Finance, Architecture, or Support.
3. **Evidence access** — which information the person may view or allow into an AI context.
4. **Approval authority** — which decisions the person may approve.

None of these should silently grant another.

## Product principle

> Project membership grants participation, not universal knowledge access.

> Approval authority grants decision rights, not automatic evidence access.

The retrieval system must authorize evidence before its content, embedding match, summary, citation, or metadata enters the model context.

## Problem

The current project boundary prevents cross-project access, but it remains too broad for cross-functional client work. A project may contain:

- customer pricing history and discount information;
- internal margins and negotiation notes;
- contracts and non-standard commercial terms;
- security findings and vulnerabilities;
- customer personal or regulated information;
- technical designs and operational runbooks;
- customer-visible deliverables; and
- broadly reusable vendor documentation.

These materials have different audiences even inside the same project.

A single project membership role cannot safely express those differences. Treating `owner`, `lead`, `curator`, `consultant`, or platform `admin` as universal evidence access would recreate the same leakage risk inside the project boundary.

## Goals

1. Classify sensitive project evidence at upload, attachment, or creation time.
2. Grant access through explicit project access groups or named-user assignments.
3. Enforce the same rules for pages, actions, APIs, vector retrieval, Assistant context, citations, artifacts, exports, and journals.
4. Keep project roles, business functions, evidence access, and approval authorities independent.
5. Allow an approver to be identified while visibly warning if they lack access to the review evidence.
6. Prevent owners, leads, curators, and platform administrators from silently acquiring restricted customer evidence.
7. Preserve a durable audit trail of classification and access changes.
8. Make safe defaults simple enough for a small Sandz pilot.

## Non-goals

The first release must not become:

- a general identity-governance or IAM product;
- a free-form policy language;
- a replacement for CRM, CPQ, contract-management, HR, or finance systems;
- attribute-based access control over arbitrary external identity attributes;
- a regulated records-management platform;
- an automatic legal or privacy classification engine;
- an AI-controlled access-granting system; or
- a way for platform staff to bypass customer authorization invisibly.

## Conceptual model

### 1. Project role

Project roles govern project participation and administration. The planned role set may include:

- `owner`
- `lead`
- `curator`
- `consultant` or contributor
- `reviewer`
- `client_reviewer`
- `viewer`

Adding a `lead` role is a related membership change, but a lead must not automatically receive restricted commercial, security, legal, or customer evidence.

### 2. Business function

Business function is descriptive and helps suggest access or approval needs. Initial values may include:

- Business Development / Sales
- Finance / Pricing
- Legal / Commercial
- Architecture / Engineering
- Security / Compliance
- Customer Support / Operations
- Delivery / Consulting
- Customer Representative
- Project Governance
- Other

Business function must not itself satisfy an RLS access check. It may generate an editable recommendation that a human access steward confirms.

### 3. Access group

Use bounded project-scoped access groups. Provide safe defaults and permit a limited custom group name where needed.

Suggested initial groups:

- `project_general`
- `sales_commercial`
- `finance_pricing`
- `technical_delivery`
- `security_compliance`
- `support_operations`
- `customer_visible`
- `named_users_only`

An access group is not a job title and is not an approval authority. A member may belong to several groups.

### 4. Evidence access policy

Each governed resource has an explicit access policy:

- project and resource;
- sensitivity/classification;
- permitted access groups and/or named users;
- whether customer users may access it;
- access steward responsible for changes;
- purpose or justification;
- created/changed by and timestamps; and
- optional review or expiry date.

Suggested classifications:

- `project_general`
- `internal_confidential`
- `commercial_confidential`
- `security_restricted`
- `customer_confidential`
- `customer_visible`

Classification is a meaningful label; the access policy is the enforceable rule.

### 5. Approval authority

Keep the existing project approval-authority model separate. A pricing authority may approve a pricing decision only when:

- their active authority covers the decision; and
- they are independently authorized to see the evidence used for the review.

If one is missing, show a governance gap. Do not silently grant access from authority or authority from access.

## Required resource coverage

Stage 1 should cover the resources most likely to enter project RAG:

- knowledge sources and their current/historical versions;
- document chunks and `kb_vectors` retrieval;
- project-associated Wiki articles;
- project/workstream artifacts; and
- structured citations and navigation destinations.

Before release, audit related derived surfaces:

- Assistant messages and conversation summaries;
- generated proposals and other artifacts;
- journal exports;
- assessments and evaluation evidence;
- search caches, logs, traces, and retrieval provenance;
- shared links and public project pages; and
- future MCP resources/tools.

If a derived surface cannot yet enforce inherited restrictions, it must not accept restricted evidence.

## Safe defaults and inheritance

- Existing project resources may be backfilled to `project_general` only if current project membership already represents their intended audience.
- New customer pricing, contracts, margins, discount histories, negotiation notes, and commercial assumptions should default to `commercial_confidential`, not project-general.
- New security findings should default to `security_restricted`.
- Customer-uploaded or customer-specific evidence should default to `customer_confidential` unless explicitly approved as customer-visible or reusable.
- Vendor documentation may remain project-general or shared according to its existing project/Wiki visibility.
- Derived artifacts inherit the most restrictive classification of the evidence materially used to generate them unless an authorized human completes a deliberate sanitization/release review.
- Removing a citation or hiding a source label does not declassify derived content.

## Upload and attachment experience

When a user uploads or attaches evidence to a project, ask:

1. What kind of information is this?
2. Who needs access to perform the work?
3. Does it contain customer, pricing, contract, security, personal, or regulated information?
4. May customer reviewers see it?
5. Who is responsible for reviewing access later?

Recommend a classification and access group, but require explicit confirmation for restricted material. Display a concise explanation such as:

> Commercial confidential — available only to authorized Sales/Commercial and Finance/Pricing members. Project membership alone does not grant access.

Do not place confidential content in a project name, filename preview, broadly visible note, notification, search suggestion, or access-request message.

## Access management experience

Add a project **Access & Evidence** area for the owner and authorized access stewards.

It should show:

- project members and business functions;
- access-group memberships;
- resources by classification;
- named-user exceptions;
- users with approval authority but insufficient evidence access;
- access grants awaiting review or approaching expiry; and
- an audit history.

### Lead permissions

If the related project-role change introduces `lead`, the recommended boundary is:

- owner and lead may add ordinary project members;
- lead cannot remove, deactivate, demote, or replace the owner;
- lead cannot promote another user to owner;
- lead cannot grant themselves restricted access;
- lead cannot grant commercial, security, legal, or named-user-only access unless separately designated as an access steward for that group; and
- every restricted-access change is audited.

## Suggested data model

Exact names may follow repository conventions after schema inspection.

### `project_access_groups`

- `id`
- `project_id`
- `group_type`
- `name`
- `description`
- `is_system_group`
- `created_by`, `created_at`, `updated_at`

Unique project/group-type-or-name constraints as appropriate.

### `project_access_group_members`

- `id`
- `project_access_group_id`
- `project_member_id`
- `effective_from`
- `expires_at`
- `granted_by`, `granted_at`
- `revoked_by`, `revoked_at`, `revocation_reason`
- `status`
- optional justification

Require active project membership. Deactivating project membership must remove effective access without deleting history.

### `project_access_stewards`

- `project_id`
- `project_access_group_id`
- `project_member_id`
- grant/revoke audit fields

Use this only if owner-only management is too restrictive. Do not infer stewardship from business function.

### `resource_access_policies`

- `id`
- `project_id`
- `resource_type`
- `resource_id`
- `classification`
- `customer_visible`
- `access_steward_user_id` or group
- `review_at`
- `created_by`, `created_at`, `updated_at`
- optional rationale

Unique resource type/resource ID constraint.

### `resource_access_grants`

- `resource_access_policy_id`
- either `project_access_group_id` or named `project_member_id`
- grant/revoke audit fields
- constraint requiring exactly one grantee form

Avoid copying user IDs directly onto every chunk. Chunks and embeddings should inherit through their stable knowledge source/version and policy relationship.

## Authorization and RLS

Enforce access before retrieval. At minimum:

- the user must be an active project member;
- the resource must be project-general/customer-visible as applicable, or the user must have an active group/named-user grant;
- platform Admin/Curator status alone must not grant access to restricted approved customer evidence;
- service-role execution may not substitute for authorization checks;
- access checks must cover the resource's exact project and current policy;
- expired/revoked group membership grants nothing;
- customer reviewers may see only explicitly customer-visible material;
- cross-project and cross-customer access is denied;
- metadata pages, filenames, snippets, counts, vector matches, citations, and source URLs do not leak restricted evidence; and
- access changes do not rewrite historical audit records.

Create a single, reviewed database authorization function for resource access and use it consistently. Avoid slightly different permission logic in pages, actions, vector RPCs, and Assistant tools.

## Assistant and RAG behavior

The Assistant must:

1. Resolve the user and project-bound conversation.
2. Resolve active evidence access before searching or assembling context.
3. Filter vector/RPC candidates within the database query, not after text is returned.
4. Include only authorized source text, metadata, citations, and navigation links.
5. Tag evidence classifications in internal provenance without unnecessarily exposing sensitive classification details to unauthorized users.
6. Refuse or explain when relevant evidence exists but is inaccessible without revealing its content or sensitive title.
7. Preserve restrictions on generated artifacts and shared outputs.

Do not tell an unauthorized user, “A document named Customer A Secret Discount Schedule exists.” A safe response is:

> Some information needed to answer this question is not available in your current project access scope. Ask the project owner or designated access steward to review your access.

The model must never decide or change access.

## Audit requirements

Record immutable events for:

- resource classified or reclassified;
- access group created or changed;
- member granted, expired, or revoked;
- named-user exception granted or revoked;
- access steward assigned or removed;
- restricted resource retrieved through UI, Assistant, API, export, or MCP where proportional logging is appropriate;
- derived artifact classified or released; and
- unauthorized access attempt at a useful, non-content-leaking level.

Audit access must itself be restricted.

## Implementation stages

### Stage 1 — Access model and restricted source retrieval

- Schema, constraints, audit fields, and RLS.
- Default project access groups.
- Membership and access-management UI.
- Classification during project source upload/attachment.
- Enforcement for knowledge sources, versions, chunks, vector RPCs, source pages, and citations.
- Pricing-history live scenario.

### Stage 2 — Wiki, artifacts, and derived-content inheritance

- Project Wiki and workstream/project artifact policies.
- Most-restrictive-source inheritance.
- Deliberate sanitized-release/reclassification workflow.
- Customer-visible review boundary.
- Approval-authority/access-gap warnings.

### Stage 3 — Conversation, export, evaluation, and tool hardening

- Conversation summaries, journals, exports, caches, traces, and eval evidence.
- Structured Assistant access explanations.
- Future MCP enforcement contract.
- Access-security evaluation suite and operational monitoring.

Stop and report after every stage. Do not upload or use real customer pricing during development or live verification; use synthetic test data.

## Acceptance criteria

### Pricing scenario

- A synthetic Customer A historical-pricing source is classified `commercial_confidential`.
- Only active Sales/Commercial, Finance/Pricing, or explicitly named authorized members can list, open, search, cite, or use it in the Assistant.
- A technical project member can use general Zadara product documentation but cannot discover or retrieve the restricted pricing source.
- A platform Admin who is not an authorized project member/access-group member cannot access it.
- A Customer B project member cannot access it.
- A pricing approver without evidence access sees an access gap, not the evidence.
- Granting access makes the evidence available on the next authorized request.
- Revoking access removes it immediately from new retrieval and navigation.

### Derived content

- A proposal generated using restricted pricing inherits `commercial_confidential`.
- It cannot be marked customer-visible merely by editing its title or removing citations.
- An authorized human can create and approve a customer-visible sanitized version without changing the original restricted artifact.

### Isolation

- Unauthorized content never enters model context, tool output, client payloads, logs, citations, autocomplete, counts, or error details.
- Direct page, Server Action, Data API, vector RPC, forged-ID, cache, export, and MCP-style access attempts are denied consistently.

## Required tests

Add automated and live tests for:

- each access group and classification;
- role versus business-function versus access versus authority independence;
- active, expired, and revoked group membership;
- named-user grants;
- owner, lead, curator, consultant, customer reviewer, and platform Admin behavior;
- cross-project and cross-customer isolation;
- source metadata, version, chunk, vector, citation, and navigation enforcement;
- Assistant project-bound retrieval with mixed general and restricted evidence;
- restrictive inheritance and sanitized release;
- approval authority without access and access without approval authority;
- project-member deactivation;
- service-role action authorization;
- crafted direct calls that bypass UI controls; and
- migration/backfill behavior for existing project resources.

Run focused tests, the full suite, TypeScript, lint, production build, migration verification, and live role-based verification using synthetic evidence only.

## Open design decisions

1. Who may appoint the first access steward for each restricted group?
2. Should the owner always retain access, or may customer policy exclude the owner from some evidence? The safer default is no automatic owner bypass.
3. Which metadata, if any, may be disclosed when relevant evidence exists but the user lacks access?
4. Which artifact types currently support immutable versions suitable for sanitization/release?
5. Should restricted access expire automatically at project completion?
6. How will customer identity and organization boundaries be represented when an organization model is introduced?
7. Which access events require logging without creating a new sensitive activity dataset?

Resolve these explicitly before implementation assumptions become invisible security rules.

