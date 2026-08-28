# Workbench Method Draft: Client Knowledge Workspace Onboarding

**Status:** Draft for implementation in the Workbench Handbook and Method catalogue  
**Proposed method ID:** Assign during implementation; do not renumber existing Methods silently  
**Related Methods:** Organization Knowledge Base; Project Access, Evidence & Authority Design; Legacy System Understanding; Security Review

## Quick help

Use this Method when onboarding a client, department, programme, or business capability into KB Sandbox and deciding which Projects and knowledge bases should be shared, specialized, or isolated.

## Goal

Create an approved workspace topology in which:

- each Project has a clear business purpose and explicit membership;
- reusable knowledge bases are attached only to authorized Projects;
- departmental, commercial, customer, HR, security, and other restricted knowledge remains appropriately separated;
- source documents and Wiki knowledge retain provenance and visibility;
- Ember conversations use the correct project context; and
- named humans remain accountable for access, knowledge approval, and consequential business decisions.

The Method produces a usable onboarding design before large volumes of client material are uploaded.

## Why it matters

Organizations rarely have one undifferentiated body of knowledge. Company information may be reusable across many teams, while HR policies, pricing history, customer documents, contracts, incident evidence, and security findings require narrower audiences.

Without an explicit topology, teams tend either to place too much information into one broadly accessible workspace or create many disconnected repositories that cannot reuse approved knowledge.

This Method treats:

> **Projects as governed workspaces and knowledge bases as reusable, access-controlled bodies of evidence that authorized Projects may use.**

## When to use

Use this Method when:

- onboarding a new client deployment or pilot;
- creating the first departmental or capability Projects for an organization;
- moving from a shared folder, document repository, informal AI notebook, or lightweight CRM arrangement;
- deciding which organizational knowledge should be reusable across Projects;
- separating HR, commercial, customer, support, technical, security, or regulated information;
- creating a customer-specific proposal or delivery workspace;
- restructuring Projects after access or retrieval concerns; or
- preparing a scalable structure before adding more users and sources.

## When not to use

Do not use this Method:

- as a substitute for legal, privacy, records-management, information-security, or enterprise-IAM review;
- to imply that KB Sandbox currently has a native Organization or multi-tenant customer object;
- when one temporary Project with one clearly bounded source set is sufficient;
- to design an API or MCP server—the MCP Architecture Method should follow after business capabilities and boundaries are understood;
- to grant access merely because users work for the same company; or
- to make an AI model responsible for approving access, publication, pricing, contracts, HR decisions, or customer release.

## Requirements

### Required

- Client or deployment context
- Intended business capabilities or departments
- Initial Project owner or onboarding lead
- Proposed Project membership for each workspace
- Inventory of expected information domains and source types
- Initial information classifications
- Known customer, confidentiality, privacy, security, regulatory, and contractual constraints
- Named human responsible for confirming the workspace topology
- Named knowledge curator or reviewer for each restricted domain

### Strongly recommended

- Current document, folder, notebook, CRM, DMS, or knowledge-repository map
- Data-classification and records-handling policy
- Department and business-function map
- Existing user groups or IAM roles
- Retention and offboarding expectations
- List of decisions requiring named business authority
- Representative access-denial test scenarios

### Optional

- Existing taxonomy or ontology
- Historical knowledge-access matrix
- Legacy-system capability inventory
- Existing API or integration catalogue
- Geographic or residency constraints
- Proposed future Organization/tenant model

### Requirement states

For each prerequisite, record:

- **Available**
- **Needed**
- **Optional**
- **Can be produced elsewhere**

If sensitive information is expected but no accountable human can approve its placement and access, stop before upload and record **Information authority needed**.

**Git required:** No.

## Core distinctions

### Client or organization context

The real-world company or customer being onboarded. In the current product this is a design and deployment convention, not a native Organization database object. Do not assume that users sharing an email domain or employer automatically share access.

### Project / workspace

The primary working and collaboration boundary. A Project contains its purpose, explicit members, workstreams, notes, assessments, artifacts, governance authorities, attached knowledge, and project-bound Ember entry point.

### Knowledge base

A reusable collection of approved source-derived knowledge. A Project may attach more than one knowledge base, and an active knowledge base may be attached to more than one explicitly authorized Project.

Attachment creates permitted Project context; it does not override source visibility, membership, or other access controls.

### Source document

The versioned original material uploaded for parsing, review, approval, retrieval, and provenance. A source is evidence; it is not automatically approved Wiki guidance.

### Wiki knowledge

Human-reviewed guidance synthesized from approved evidence or authored manually. Wiki visibility may be platform-wide or project-scoped. Approval does not make private customer knowledge public.

### Workstream

A bounded unit of work inside a Project. It records a goal, Method, execution context, deliverables, and resulting artifacts.

### Artifact

A versioned output such as a topology map, proposal, assessment, review, test result, or implementation handoff. An artifact should retain its evidence and access context.

### Ember conversation

A durable, user-owned conversation. When initiated from an authorized Project, the conversation preserves that project binding so retrieval uses the Project's authorized evidence plus applicable platform guidance. A general unbound conversation must not retrieve project-private evidence merely because the user belongs to that Project.

### Platform role

The user's application-wide administrative role, such as admin, curator, consultant, viewer, or anonymous where applicable.

### Project role

The user's relationship to one Project: owner, curator, consultant, or viewer. Explicit active membership is required.

### Business approval authority

A separate, named authority for a consequential decision such as pricing, commercial terms, technical design, security acceptance, proposal release, HR policy approval, or customer acceptance. Neither platform role nor Project role automatically supplies every business authority.

## Method

### Step 1 — Establish the onboarding boundary

Record:

- client or deployment name;
- business sponsor;
- reason for onboarding;
- initial departments, capabilities, customers, or programmes;
- expected users and external participants;
- known sensitive information; and
- systems that remain authoritative outside KB Sandbox.

State explicitly whether the deployment currently serves one client or multiple clients. Until a native Organization boundary exists and is tested, do not represent naming conventions as tenant isolation.

### Step 2 — Inventory knowledge domains

List the bodies of information expected to enter KB Sandbox. Typical domains include:

- organization-general information;
- approved branding and proposal templates;
- product and vendor guidance;
- HR policies and employee material;
- sales and proposal knowledge;
- pricing and commercial history;
- customer support procedures;
- customer-specific requirements and evidence;
- contracts and legal material;
- security and architecture information; and
- public reference material.

For each domain, identify its owner, audience, sensitivity, source authority, version expectations, reuse potential, AI-processing eligibility, and retention needs.

### Step 3 — Classify each domain

Use the organization's authoritative classification policy where available. At minimum, distinguish:

- public or externally shareable;
- organization-general internal;
- departmental restricted;
- commercial restricted;
- customer confidential;
- security restricted;
- personal or regulated; and
- prohibited from the proposed AI/workspace boundary.

Do not place credentials, secrets, payment data, unnecessary personal data, or unlicensed content into a knowledge base merely because access can be restricted.

### Step 4 — Design the Project topology

Create a Project for each durable combination of:

- business purpose;
- membership;
- information boundary;
- approval structure; and
- expected outputs.

Do not create a separate Project only because two documents have different topics. Conversely, do not combine functions whose members or evidence should not overlap.

Customer-specific proposals or delivery engagements should normally use separate Projects once they contain confidential customer information.

### Step 5 — Design reusable knowledge bases

For each domain, decide whether its knowledge base should be:

- reusable across several explicitly authorized Projects;
- restricted to one department or capability;
- restricted to one customer Project;
- replaced by a project-scoped Wiki article or source set; or
- excluded from KB Sandbox.

Prefer one authoritative shared knowledge base over copying the same documents into many Projects. Use a specialized knowledge base where membership, ownership, lifecycle, confidentiality, or retrieval purpose differs materially.

### Step 6 — Map Projects to knowledge bases

Create a proposed attachment matrix before uploading content.

| Project | Shared knowledge | Specialized knowledge | Explicit exclusions |
|---|---|---|---|
| Sandz–Zadara | Sandz Shared KB | Zadara Product KB | HR, unrelated customer evidence |
| Sandz HR | Sandz Shared KB | Sandz HR KB | Pricing, customer proposals, technical support cases |
| Sandz Call Center | Sandz Shared KB | Zadara Product KB; Call Center KB | HR and restricted commercial evidence |
| Sandz Sales & Proposals | Sandz Shared KB | Zadara Product KB; Proposal Method KB | HR and individual customer-confidential evidence |
| Healthcare Customer Proposal | Sandz Shared KB | Zadara Product KB; customer-specific proposal KB | HR; other customers; unrelated pricing histories |

An attached knowledge base is available only within the implemented access rules. Test those rules rather than assuming the diagram enforces them.

### Step 7 — Assign membership and authorities

For each Project:

1. assign one accountable owner;
2. add only the users who require participation;
3. assign the minimum suitable Project role;
4. identify knowledge curators and information owners;
5. configure applicable business approval authorities;
6. record authority gaps; and
7. define offboarding and periodic access review.

Do not state that “all users in the organization” can continue a workstream. They must first be explicitly added to the relevant Project with an appropriate active role.

### Step 8 — Ingest, review, and approve sources

For each approved knowledge base:

1. identify the authoritative source owner;
2. upload the correct current version;
3. inspect parsing and extracted content;
4. review and approve or reject source chunks;
5. verify provenance and retrieval metadata;
6. supersede documents through versioning rather than silently duplicating or deleting history; and
7. record any source that remains incomplete, disputed, expired, or unapproved.

### Step 9 — Create governed Wiki guidance

Where reusable explanation is needed:

1. draft the article from approved evidence or manual expert knowledge;
2. cite its sources;
3. attach it to the appropriate Project or Projects before narrowing visibility;
4. select the correct visibility boundary;
5. conduct human review; and
6. approve only when the content, provenance, audience, and ownership are correct.

Wiki approval and public publication are distinct from source review and Project attachment.

### Step 10 — Establish project-bound Ember use

For each Project, define representative questions Ember should answer and questions it must not answer.

Verify that:

- the user enters through the Project's Ember action;
- the conversation visibly retains its Project context;
- retrieval uses only authorized attached knowledge and project-scoped guidance;
- citations resolve only to resources the user may open;
- general unbound chat does not retrieve the Project's private evidence;
- missing evidence produces a clear gap rather than an invented answer; and
- generated artifacts remain associated with the correct Project and evidence boundary.

### Step 11 — Run positive and negative isolation tests

Use synthetic material and test at least:

- Project owner;
- Project curator;
- Project consultant;
- Project viewer;
- eligible business approver;
- signed-in non-member;
- platform admin who is not a Project member;
- member of another department Project; and
- member of another customer Project.

Test direct pages, source links, Wiki listings, search, Ember retrieval, citations, artifacts, exports, guessed identifiers, revoked membership, and detached knowledge bases.

### Step 12 — Approve and record the topology

The accountable client representative and appropriate security/privacy/information owners review:

- Project purposes and memberships;
- knowledge-base ownership and attachments;
- source and Wiki visibility;
- business authorities;
- positive and negative test evidence;
- unresolved risks and exclusions;
- operational ownership; and
- the trigger for future review.

Store the approved topology as a versioned Project artifact. Review it when a Project, member, knowledge domain, customer obligation, or deployment boundary changes.

## Standard deliverables

1. **Client Workspace Topology Map** — Projects, purposes, relationships, and deployment assumptions.
2. **Knowledge Domain Inventory** — owners, classifications, reuse expectations, and source authority.
3. **Project-to-Knowledge-Base Attachment Matrix** — approved attachments and explicit exclusions.
4. **Project Membership Matrix** — named members, Project roles, functions, and review dates.
5. **Approval Authority Matrix** — decision rights, scopes, limits, gaps, and required evidence access.
6. **Source Onboarding Register** — source owner, current version, review state, classification, and destination knowledge base.
7. **Wiki Visibility Plan** — platform and Project-scoped guidance with reviewers and approvers.
8. **Ember Context and Retrieval Test Plan** — permitted questions, prohibited retrieval, citations, and expected gap behavior.
9. **Isolation Test Results** — positive and negative persona evidence.
10. **Open Risks and Future Requirements** — including any dependency on a future Organization/tenant model.
11. **Human Approval Record** — reviewers, decision, conditions, and date.

## Suggested artifact template

### Onboarding context

- Client/deployment:
- Sponsor:
- Onboarding lead:
- Intended capabilities:
- Authoritative systems outside KB Sandbox:
- Review date:

### Knowledge domains

| Domain | Owner | Classification | Intended audience | Reuse scope | AI processing? | Destination KB | Status |
|---|---|---|---|---|---|---|---|

### Project topology

| Project | Purpose | Owner | Members/functions | Attached KBs | Explicit exclusions | Authorities |
|---|---|---|---|---|---|---|

### Sources

| Source | Owner | Version/current date | Classification | Knowledge base | Review status | Supersedes |
|---|---|---|---|---|---|---|

### Ember and isolation tests

| Persona and entry point | Question/action | Expected sources | Prohibited sources | Expected result | Actual evidence | Pass/fail |
|---|---|---|---|---|---|---|

### Approval

- Open gaps:
- Conditions:
- Approved topology version:
- Approved by:
- Decision/date:

## Evaluation

Evaluate the Method using:

- percentage of knowledge domains with a named owner and classification;
- percentage of Projects with explicit membership and an accountable owner;
- percentage of knowledge-base attachments justified by the topology;
- unauthorized content, metadata, citation, and existence-disclosure rate: target zero;
- authorized retrieval success rate for representative questions;
- proportion of Ember answers with valid, accessible citations;
- unresolved access or approval-authority gaps;
- duplicated authoritative sources across knowledge bases;
- time required to add, revoke, or move a user safely;
- time required to onboard or supersede a source;
- user confidence that the correct workspace and knowledge are being used; and
- human reviewer confidence that the implemented structure matches the approved topology.

## Failure modes

- Treating the conceptual client name as a technically enforced Organization tenant.
- Assuming employees of the same company automatically share access.
- Using one Project for HR, sales, support, customer, and security material.
- Creating a new knowledge base for every document.
- Copying one authoritative document into several knowledge bases without version ownership.
- Attaching a broadly reusable knowledge base that contains one restricted source.
- Treating Project membership, platform role, and business approval authority as interchangeable.
- Making customer-specific proposal evidence retrievable from a general sales Project.
- Treating source approval as Wiki publication or public release.
- Allowing an unbound Ember conversation to retrieve Project-private evidence.
- Returning inaccessible filenames, snippets, citations, links, counts, or existence indicators.
- Claiming AI-grounded answers cannot hallucinate rather than testing grounding and gap behavior.
- Exposing database table names or internal implementation language to ordinary users.
- Creating a navigation label without a valid authorized link.
- Building a CRM, DMS, QMS, or call-center replacement before determining which lightweight workflow the client actually needs.

## Current implementation boundary

### Available today

- Projects as governed workspaces
- Explicit Project membership and Project roles
- Named Project approval authorities
- Many-to-many Project-to-knowledge-base attachment
- Versioned source documents and curated source chunks
- Project-scoped and platform Wiki knowledge
- Workstreams and artifacts
- Durable user conversation history
- Project-bound Ember retrieval from authorized project evidence and platform guidance
- Citation and direct-resource access enforcement

### Conceptual or future capability

- Native Organization/tenant entity and organization-wide membership
- Automatic inheritance from parent Projects or organization policy
- Fully configurable DMS/BPM workflows and retention automation
- Fine-grained evidence groups inside a single Project beyond implemented controls
- Automated onboarding wizard that generates and provisions the entire topology
- External MCP access to the onboarding and management capabilities

Until the native Organization model exists, use an explicitly documented deployment and Project convention. Do not claim that naming Projects with the same company prefix creates a technical tenant boundary.

## Sandz worked example

```text
Conceptual Sandz client/deployment boundary
│
├── Sandz Shared Knowledge Base
│   ├── organization profile
│   ├── approved general policies
│   ├── branding and reusable templates
│   └── general operating guidance
│
├── Sandz–Zadara Project
│   ├── Sandz Shared KB
│   └── Zadara Product KB
│
├── Sandz HR Project
│   ├── Sandz Shared KB
│   └── restricted Sandz HR KB
│
├── Sandz Call Center Project
│   ├── Sandz Shared KB
│   ├── Zadara Product KB
│   └── Call Center Procedures KB
│
├── Sandz Sales & Proposals Project
│   ├── Sandz Shared KB
│   ├── Zadara Product KB
│   └── Proposal Methods and Templates KB
│
└── Healthcare Customer Proposal Project
    ├── Sandz Shared KB
    ├── Zadara Product KB
    ├── authorized proposal guidance
    └── customer-specific proposal sources and KB
```

The Healthcare Customer Proposal Project has its own explicit members and authorities. Its customer evidence must not become retrievable from the general Sales & Proposals Project or any other customer Project.

## Practical experiment

1. Create synthetic Sandz Shared, HR, Zadara Product, Call Center, and Customer Proposal sources.
2. Establish four departmental/capability Projects and one customer proposal Project.
3. Attach the approved knowledge bases according to the example matrix.
4. Add representative members with owner, curator, consultant, and viewer roles.
5. Configure a proposal-release authority for the customer Project.
6. Begin a project-bound Ember conversation in each Project and ask the same cross-domain question.
7. Confirm relevant shared knowledge is reusable.
8. Confirm HR and customer evidence never appears outside its authorized Project.
9. Confirm an unbound Ember conversation cannot retrieve any private Project evidence.
10. Detach a knowledge base and revoke a member, then confirm retrieval and direct access stop.
11. Generate a topology artifact and preserve the test results.
12. Have the accountable client representative approve or revise the structure.

## Recommended next action

Open [Projects](https://kbsandbox.tech/projects) and create or select a temporary onboarding-design Project. Add a **Workspace Topology Design** workstream and produce the Knowledge Domain Inventory and Project-to-Knowledge-Base Attachment Matrix before uploading sensitive client documents.

## Boundary

KB Sandbox can guide the onboarding design, implement supported Project and knowledge attachments, preserve evidence, run representative access tests, and help users work through Ember.

Human client representatives decide the organizational structure and information ownership. Human Project owners and access stewards decide membership. Named business authorities approve consequential outcomes. External legal, privacy, security, IAM, records-management, CRM, DMS, BPM, and transactional systems remain authoritative where applicable.
