# Workbench Method Draft: Project Access, Evidence & Authority Design

**Status:** Draft for implementation in the Workbench Handbook and method catalogue  
**Proposed method ID:** Assign during implementation; do not renumber existing methods silently  
**Related development request:** [`docs/dev-request-project-evidence-access-controls.md`](dev-request-project-evidence-access-controls.md)

## Quick help

Use this method when a project includes sensitive or customer-specific information and the team must decide who may participate, who may access each kind of evidence, and who may approve consequential decisions.

## Goal

Create an explicit, reviewable project access design that separates:

- project participation;
- business function;
- evidence access;
- approval authority; and
- customer-visible release.

The outcome should allow people to perform their work without granting every project member access to every source.

## Why it matters

Client projects frequently combine material with very different audiences. Vendor documentation may be appropriate for the whole delivery team, while pricing history, internal margins, contracts, security findings, or customer personal information may require narrower access.

Without an explicit method, teams tend to make one of two unsafe choices:

1. put everything in one project and expose too much; or
2. fragment the project into disconnected systems and lose useful context, provenance, and governance.

This method designs controlled knowledge layers inside a project while preserving a coherent project record.

## When to use

Use this method when:

- creating a client or consulting project;
- uploading historical proposals, pricing, discounts, margins, or sales records;
- using contracts, SLAs, privacy policies, or regulated information;
- combining technical, sales, finance, support, security, and customer teams;
- assigning pricing, commercial, technical, security, publication, or customer-acceptance authorities;
- deciding what the project-bound Assistant may retrieve for different users;
- preparing customer-visible outputs from internal evidence; or
- reviewing access after membership, project phase, or customer requirements change.

## When not to use

Do not use this method as:

- a substitute for enterprise IAM, legal advice, privacy impact assessment, or regulated records management;
- permission to upload information the organization is not authorized to process;
- a way to infer access solely from job titles;
- a mechanism for an AI model to grant access or approval authority; or
- justification for giving platform administrators unrestricted customer-data access.

## Requirements

### Required

- Project purpose and customer/organization context
- Initial project owner
- Proposed participants or participant groups
- Types of evidence expected in the project
- Known confidentiality, customer, commercial, security, privacy, or regulatory constraints
- Decisions likely to require human approval
- At least one accountable human who can confirm the access design

### Strongly recommended

- Data-classification or information-handling policy
- Customer contract and confidentiality terms
- Privacy and security requirements
- Existing project approval policy
- Retention and project-offboarding expectations
- Named information owners or access stewards

### Optional

- Historical access matrix
- Organizational role catalogue
- Separation-of-duty requirements
- Geographic or data-residency restrictions
- External customer-reviewer list
- Existing IAM groups

### Requirement states

For each missing prerequisite, record one of:

- **Available**
- **Needed**
- **Optional**
- **Can be produced elsewhere**

If the project expects sensitive evidence but lacks an accountable access decision-maker, stop before upload and record **Access authority needed**.

**Git required:** No.

## Core distinctions

### Project role

What may this person administer or contribute within the project?

Examples: owner, lead, curator, consultant, reviewer, customer reviewer, viewer.

### Business function

Why is this person participating?

Examples: Sales, Finance, Legal, Architecture, Security, Support, Delivery, Customer Representative.

### Evidence access

Which sources, Wiki articles, artifacts, and derived information may this person view or use through the Assistant?

Examples: project-general, sales/commercial, finance/pricing, technical delivery, security/compliance, customer-visible, or named-user-only.

### Approval authority

Which decisions may this person approve, under what scope, conditions, limits, and time period?

Examples: pricing, commercial terms, technical design, security/compliance, proposal release, customer acceptance.

### Release visibility

Who may receive the resulting artifact?

Internal access to evidence does not automatically authorize customer release.

## Method

### Step 1 — Define the project boundary

Record:

- project and customer context;
- intended outcome;
- internal and external participants;
- project phases;
- likely knowledge sources and outputs; and
- systems or organizations outside the boundary.

### Step 2 — Inventory evidence classes

Identify expected evidence without unnecessarily copying sensitive content.

Typical classes include:

- vendor/public documentation;
- project-general working information;
- customer-confidential documents;
- historical sales and proposals;
- pricing, discounts, margins, and negotiation assumptions;
- contracts and legal advice;
- security findings and credentials;
- personal or regulated information;
- technical architecture and operational runbooks; and
- customer-visible deliverables.

For each class, identify its owner, source, version expectations, sensitivity, retention need, and whether it may enter AI processing.

### Step 3 — Identify participants and functions

List the minimum people or groups needed to perform the work. Assign project roles and business functions separately.

Do not use broad membership as a shortcut for evidence access.

### Step 4 — Design access groups

Create the smallest practical set of access groups. Start with bounded groups rather than one group per document.

Example:

| Evidence | Classification | Permitted access | Customer-visible? |
|---|---|---|---|
| Zadara public product documentation | Project general | Whole project team | Where license/terms permit |
| Customer A historical pricing | Commercial confidential | Sales/Commercial and Finance/Pricing | No |
| Internal margin assumptions | Commercial confidential | Named pricing managers | No |
| Proposed technical architecture | Internal confidential | Technical Delivery plus approved reviewers | Not until released |
| Customer-approved proposal | Customer visible | Project team and named customer reviewers | Yes |

Use named-user-only access sparingly; groups are easier to review and maintain.

### Step 5 — Assign access stewards

Identify who may grant or revoke restricted access. Avoid allowing a person to grant themselves access to pricing, security, legal, or named-user-only evidence.

Define:

- who may add ordinary project members;
- who manages each restricted group;
- who reviews access expiry;
- who handles urgent access needs; and
- whether any audited emergency-access route exists.

### Step 6 — Map approval authorities

Identify required decisions and authorized approvers. For each authority, verify independently:

- active project membership where required;
- decision type and scope;
- limits and expiry;
- self-approval restrictions; and
- access to the evidence required for review.

Record gaps rather than fabricating an authority or silently expanding access.

### Step 7 — Define Assistant and retrieval boundaries

For each user group, specify which knowledge layers the project-bound Assistant may retrieve.

Confirm that:

- filtering occurs before text reaches the model;
- unauthorized filenames, snippets, counts, citations, and links are not exposed;
- general chat cannot retrieve project evidence;
- generated artifacts inherit evidence restrictions;
- customer-facing responses exclude internal pricing and reasoning; and
- the Assistant cannot grant access or approve decisions.

### Step 8 — Define release and sanitization

Describe how internal work becomes customer-visible.

A customer-visible artifact should be a deliberate version or release produced through review. Removing citations or copying text into a new title must not automatically remove the original restrictions.

### Step 9 — Test representative personas

Test at least:

- project owner;
- project lead;
- Sales/Commercial member;
- Finance/Pricing member;
- technical consultant;
- support member;
- customer reviewer;
- platform administrator without project authorization; and
- member of another customer project.

Use synthetic evidence. Verify direct pages, search, Assistant retrieval, citations, exports, and attempts using forged resource IDs.

### Step 10 — Review and approve the access design

The accountable human reviews:

- whether access is sufficient for work;
- whether any group is unnecessarily broad;
- whether approval authorities have required evidence access;
- whether customer visibility is explicit;
- whether retention/offboarding is defined; and
- whether unresolved gaps block sensitive-data upload.

Record the approved design as a versioned project artifact.

## Standard deliverables

1. **Project Participation Map** — people, project roles, and business functions.
2. **Evidence Classification Inventory** — evidence types, owners, sensitivity, source/version expectations, and AI-processing eligibility.
3. **Project Access Matrix** — evidence classes mapped to access groups and named exceptions.
4. **Access Stewardship Plan** — who may grant, revoke, review, and respond to access gaps.
5. **Approval Authority Matrix** — decision rights, limits, expiry, separation of duty, and required evidence access.
6. **Assistant Retrieval Boundary** — authorized knowledge layers and prohibited disclosures by persona.
7. **Customer Release Boundary** — internal-to-customer sanitization and approval path.
8. **Access Test Plan and Results** — positive and negative persona tests.
9. **Open Gaps and Decisions** — unresolved access, authority, privacy, or implementation requirements.
10. **Human Approval Record** — named reviewer, decision, conditions, and date.

## Suggested artifact template

### Context

- Project:
- Customer/organization:
- Outcome:
- Access-design owner:
- Review date:

### Participants

| Person/group | Project role | Business function | Customer/internal | Notes |
|---|---|---|---|---|

### Evidence inventory and access

| Evidence class | Classification | Owner | Permitted groups/users | AI use allowed? | Customer-visible? | Review/expiry |
|---|---|---|---|---|---|---|

### Approval authority

| Decision | Authority | Scope/limit | Self-approval? | Required evidence access | Gap/status |
|---|---|---|---|---|---|

### Assistant boundary

| Persona | Permitted retrieval | Prohibited retrieval/disclosure | Permitted outputs |
|---|---|---|---|

### Release controls

- Sanitization method:
- Required reviewers:
- Customer-visible version:
- Restrictions retained from source evidence:

### Tests

| Persona/scenario | Expected result | Actual result | Evidence | Pass/fail |
|---|---|---|---|---|

### Open gaps and approval

- Gaps:
- Conditions:
- Approved by:
- Decision/date:

## Failure modes

- Treating project membership as universal access.
- Treating business function as an enforceable permission.
- Giving project owners, leads, curators, or platform Admins invisible access to all customer evidence.
- Assuming a pricing approver may automatically read pricing evidence.
- Filtering restricted vector results only after content has reached the application or model.
- Revealing restricted filenames, snippets, citations, counts, or existence through error messages.
- Allowing leads or access stewards to grant themselves restricted access.
- Copying restricted material into a customer-visible artifact without sanitization review.
- Retaining access after project membership is revoked or expires.
- Recording sensitive evidence in broadly visible audit messages or notifications.
- Creating so many bespoke groups that access can no longer be reviewed.

## Evaluation

Evaluate the method using:

- unauthorized retrieval rate: target zero;
- unauthorized metadata/citation disclosure rate: target zero;
- required-work success rate for authorized personas;
- percentage of evidence with an explicit classification and steward;
- unresolved authority/access mismatches;
- time required to onboard and offboard a member;
- number of overly broad or unused access grants found during review;
- correctness of derived-artifact inheritance; and
- human reviewer confidence that the access matrix reflects the intended project boundary.

## Governance considerations

- Use least privilege without preventing legitimate work.
- Require explicit human decisions for restricted access.
- Keep access and approval authority separate.
- Preserve customer and project isolation.
- Make emergency access exceptional, audited, and separately designed.
- Review access when membership, project phase, evidence sensitivity, or customer terms change.
- Do not treat AI recommendations as authorization decisions.
- Avoid retaining sensitive content in logs, traces, notifications, or evaluation fixtures.

## Practical experiment

Use a synthetic Sandz pricing scenario:

1. Create a test customer project.
2. Attach general Zadara product documentation for all project members.
3. Upload a synthetic historical-pricing document classified `commercial_confidential`.
4. Grant access to one Sales/Commercial member and one Finance/Pricing member.
5. Withhold access from a technical consultant, support member, platform Admin, and member of another project.
6. Ask the project-bound Assistant the same pricing question as each persona.
7. Confirm authorized users receive properly cited evidence.
8. Confirm unauthorized users receive no content, filename, snippet, citation, or existence disclosure.
9. Generate a proposal and confirm it inherits the commercial restriction.
10. Produce a sanitized customer-visible version through explicit human review.
11. Revoke the salesperson's access and confirm new retrieval stops immediately.
12. Record results and unresolved gaps in the Access Test Plan.

## Boundary

KB Sandbox can guide the access-design process, record the approved matrix, enforce implemented access policies, and evaluate representative personas.

Human owners and designated access stewards decide access. Human approval authorities decide consequential business outcomes. External IAM, legal, privacy, security, and records-management obligations remain authoritative where applicable.

