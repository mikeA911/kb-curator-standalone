# Development Request — Seed the Sandz–Zadara Pilot Project Structure

**Status:** Proposed  
**Type:** Configuration/data seeding; no product code changes expected  
**Priority:** P1 — pilot preparation  
**Related roadmap:** Sandz pilot, M2 Organize, M3 Evaluate, M5 Apply, M7 Govern

## Objective

Configure three clearly related Sandz–Zadara pilot projects using existing KB Sandbox capabilities:

1. **Sandz–Zadara Pilot — Governance and Evaluation**
2. **Sandz–Zadara Pilot — Sales Proposals**
3. **Sandz–Zadara Pilot — Call Center Support**

The Governance and Evaluation project acts as the pilot's coordination and common-knowledge project. The Sales Proposals and Call Center Support projects reuse the approved common Zadara/Sandz knowledge baseline and may add their own project-specific sources, Wiki guidance, members, conversations, methods, artifacts and evaluations.

## Important terminology

KB Sandbox does not currently have native parent/child projects or automatic source/access inheritance. For this pilot, **inherits** means:

- attach the same existing common knowledge base(s) to each operational project without duplicating source documents;
- explicitly configure the necessary members and access rights in each relevant authorization boundary;
- record the Governance and Evaluation project as the logical umbrella in descriptions/notes; and
- keep later changes synchronized deliberately until a governed inheritance feature is designed.

Do not claim or simulate dynamic inheritance if the existing schema does not provide it.

## Configuration-first constraint

Use existing project, membership, knowledge-base attachment, Wiki attachment, access-group, evidence-classification, authority and evaluation features. Do not modify application code or database schema merely to complete this seed request.

If restricted shared sources cannot be safely made available to authorized members of both operational projects using current controls, stop and report:

- the affected sources/classifications;
- the exact authorization limitation;
- the safest temporary configuration; and
- whether a focused product/schema change is genuinely required.

Never weaken, remove or bypass an existing restriction simply to make inheritance appear to work.

## Step 1 — Audit the current pilot

Before creating or changing records, identify and report:

- the current Sandz/Zadara pilot project and its ID;
- current owner and active members;
- attached knowledge bases;
- attached Wiki articles;
- source classifications and access grants;
- approval policies/authorities;
- existing project-bound Ember conversations;
- workstreams, artifacts and evaluations; and
- any existing records whose names already match the proposed projects.

Avoid duplicate projects and attachments. Preserve all existing conversations, artifacts, approvals and audit history.

## Step 2 — Governance and Evaluation project

Use the existing pilot project as **Sandz–Zadara Pilot — Governance and Evaluation** where safe. Prefer renaming/updating the existing project over creating a replacement so its history is preserved.

Purpose:

> Coordinate the Sandz–Zadara pilot, maintain the approved common knowledge baseline, define access and governance expectations, and evaluate the Sales Proposal and Call Center Support use cases.

Configure or verify:

- pilot owner and governance participants;
- the common approved Zadara/Sandz knowledge base(s);
- common project-private Wiki guidance;
- pilot objectives, success measures and evaluation criteria;
- common evidence classifications and named access stewards;
- governance/technical/customer-acceptance authorities where appropriate;
- notes linking to the two operational project records; and
- no real customer pricing, contract, personal or call-record data unless separately approved and correctly restricted.

This project coordinates common knowledge and evaluation. It must not become a technical workaround that grants all operational users access to every restricted source.

## Step 3 — Sales Proposals project

Create or reuse **Sandz–Zadara Pilot — Sales Proposals**.

Purpose:

> Help authorized Sandz Sales/Business Development users produce evidence-backed Zadara proposal drafts with explicit requirements, source citations, information gaps and human commercial approval.

Configure:

- explicit reference to the Governance and Evaluation project in the objective/description;
- attachment of the same common Zadara/Sandz knowledge base(s), without copying documents;
- Sales/BD project members and only the additional participants needed for review;
- Sales/Commercial and Finance/Pricing access groups if required;
- proposal-release and commercial approval requirements/authorities;
- project-specific customer requirements, approved discovery notes and proposal evidence only when access is appropriate;
- a project-private Sales Proposal guidance Wiki article if available;
- a Sales Proposal Workbench method/workstream; and
- a separate project-bound Ember conversation and evaluation set.

Project-specific commercial sources should be attached and classified here rather than automatically exposed to Call Center Support. Pricing, margins, discount histories, contracts and negotiation notes default to `commercial_confidential` with explicit grants.

## Step 4 — Call Center Support project

Create or reuse **Sandz–Zadara Pilot — Call Center Support**.

Purpose:

> Help authorized Sandz call-center staff answer Zadara-related customer questions using approved solution knowledge, useful clarification questions, citations and defined escalation guidance.

Configure:

- explicit reference to the Governance and Evaluation project in the objective/description;
- attachment of the same common Zadara/Sandz knowledge base(s), without copying documents;
- call-center/support members and designated escalation reviewers;
- project-specific approved support procedures, FAQs, troubleshooting material and escalation guidance;
- a project-private Call Center guidance Wiki article if available;
- support/technical/customer-escalation approval or responsibility boundaries where applicable;
- a Call Center Support Workbench method/workstream; and
- a separate project-bound Ember conversation and evaluation set.

Do not attach Sales pricing, margins, commercial negotiation notes or customer-confidential proposal evidence merely because it exists in the umbrella project. Call-center transcripts or personal/customer data require a separate privacy and retention decision and are excluded from this seed unless explicitly approved.

## Common-source and local-source behavior

Use this logical model:

```text
Governance and Evaluation
    └── approved common Zadara/Sandz knowledge baseline
          ├── explicitly attached to Sales Proposals
          │     └── additional Sales-only sources and guidance
          └── explicitly attached to Call Center Support
                └── additional Support-only sources and guidance
```

Common sources should retain one stable versioned identity. A new version is uploaded through the existing knowledge-source versioning flow rather than copied into each project.

Operational-project additions do not flow back to the umbrella or across to the other operational project automatically. Promotion into common knowledge requires deliberate curation, review, approval and attachment.

## Access model

Keep these concepts separate:

- project membership;
- business function;
- evidence access group or named-user grant; and
- approval authority.

Membership in Governance and Evaluation does not automatically grant Sales or Call Center membership. Membership in an operational project does not grant access to all umbrella-project evidence. Approval authority does not grant evidence access.

For unrestricted common pilot material, `project_general` may be used only when the project membership genuinely represents the intended audience. Restricted material must retain its strongest applicable classification and explicit grants.

## Logical linking

Because no native project hierarchy exists:

- use the exact shared prefix `Sandz–Zadara Pilot —`;
- reference all three project names and IDs in an umbrella project note;
- reference the umbrella project name/ID in each operational project's objective or note;
- add working navigation links where the existing structured-link mechanism supports real project IDs; and
- do not add schema fields, fake IDs or free-text URLs that imply enforced inheritance.

## Initial pilot scenarios

### Sales

Example prompt:

> Draft the outline of a Zadara storage proposal for a healthcare laboratory that needs secure retention of laboratory findings. Identify missing customer information, cite approved Zadara evidence and mark commercial decisions requiring human approval.

Expected result: a grounded proposal outline, requirements/gaps, appropriate citations, next steps and visible commercial approval boundary—not invented pricing or legal/privacy claims.

### Call Center

Example prompt:

> A customer needs resilient storage for business-critical files. What should I clarify, which approved Zadara capabilities may be relevant, and when should I escalate?

Expected result: a concise grounded answer, clarification questions, citations, safe troubleshooting/escalation guidance and no exposure of Sales-only evidence.

## Acceptance criteria

1. Exactly three intended project records exist with no accidental duplicates.
2. Existing pilot history is preserved in the Governance and Evaluation project.
3. Both operational projects explicitly reference the umbrella project.
4. The same common KB/source identities are reused rather than copied.
5. Sales and Call Center can each add and retrieve their own approved project-specific sources.
6. Project-bound Ember retrieves the appropriate common and local sources for an authorized member.
7. An unbound Ember conversation does not receive project evidence.
8. A Sales-only restricted source is not returned in Call Center search, Ember context, citation resolution or direct navigation.
9. A platform admin who is not an authorized project member cannot read project-private or restricted content through a bypass.
10. Approval authorities and evidence-access grants remain distinct.
11. Both example prompts complete with working authorized citations and appropriate missing-information/escalation behavior.
12. No real sensitive customer data is introduced during seeding or verification.
13. Any current-model limitation preventing safe shared-source access is documented rather than bypassed.

## Verification report

Report:

- project names and IDs;
- whether the existing pilot was renamed or retained unchanged;
- common KBs and Wiki articles attached to each project;
- members, access groups and authority gaps by project;
- synthetic test personas used;
- retrieval/citation results for both example prompts;
- cross-project and non-member denial results;
- any manual synchronization requirement; and
- any gap requiring a later focused development request.

Do not commit or push unrelated working-tree changes. Do not delete the existing pilot or any source, conversation, artifact, approval or evaluation record as part of this task.
