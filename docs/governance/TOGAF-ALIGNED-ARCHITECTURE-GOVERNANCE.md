# KB Sandbox TOGAF-Aligned Architecture Governance and Compliance Framework

**Document status:** Draft for review  
**Version:** 0.1  
**Created:** 21 August 2026  
**Document owner:** To be appointed  
**Approval authority:** Architecture Board or designated governance authority  
**Review cycle:** At least annually and after material governance changes  
**Roadmap alignment:** M7 — Govern: Risk + controls + guardrails + approvals

## 1. Purpose

This document defines a practical architecture-governance and compliance framework for KB Sandbox and for AI systems governed through KB Sandbox. It is intended to ensure that architecture work:

- supports stated business outcomes;
- is subject to clear decision rights and accountable ownership;
- uses approved principles, standards, patterns, and controls;
- identifies and treats architectural, security, data, operational, and AI risks;
- records decisions, evidence, conditions, and approved exceptions;
- remains reviewable as systems, models, data, vendors, and business needs change.

The framework turns governance into an evidence-backed lifecycle rather than a retrospective documentation exercise.

## 2. Positioning and conformance statement

This is a **TOGAF-aligned internal governance framework**. It is not:

- a declaration that KB Sandbox, a customer, a project, or an organization is officially “TOGAF compliant”;
- a certification or accreditation issued by The Open Group;
- a reproduction of the TOGAF Standard;
- legal, regulatory, audit, or certification advice;
- a substitute for an organization's corporate, information-security, privacy, financial, procurement, or regulatory governance.

The framework adapts publicly described TOGAF governance concepts to KB Sandbox's product model. An organization adopting it must tailor roles, decision thresholds, standards, evidence requirements, and review depth to its size, risk, industry, and applicable obligations.

TOGAF® is a registered trademark of The Open Group. Use and distribution of licensed TOGAF materials must follow the applicable Open Group license. This document uses original language and links to authoritative sources rather than reproducing licensed standard text.

## 3. Authoritative basis

The Open Group describes the TOGAF Standard, 10th Edition as a modular enterprise-architecture standard that organizations configure for their own practices. Its materials include an Architecture Development Method, governance framework, architecture content, and supporting guidance.

This framework is informed by:

- [The TOGAF Standard and Series Guides](https://publications.opengroup.org/standards/togaf);
- [The Open Group overview of the TOGAF Standard, 10th Edition](https://www.opengroup.org/togaf);
- [The Open Group benefits and applicability summary](https://www.opengroup.org/togaf/benefits);
- [The Open Group's public Architecture Compliance guidance](https://www.opengroup.org/architecture/togaf7-doc/arch/p4/comp/comp.htm);
- [The Open Group's public Architecture Board guidance](https://www.opengroup.org/architecture/togaf7-doc/arch/p4/board/ab.htm);
- [TOGAF Standard licensing information](https://www.opengroup.org/togaf-standard-10th-edition-downloads).

The public compliance and Architecture Board pages are from an earlier TOGAF publication but remain useful primary-source explanations of compliance-review and board concepts. A formal adoption should be checked against the organization's licensed, current TOGAF materials.

## 4. Scope

### 4.1 In scope

This framework governs:

- enterprise, solution, platform, data, application, technology, security, and AI architecture decisions;
- KB Sandbox itself as a software platform;
- AI systems inventoried or governed through KB Sandbox;
- models, providers, prompts, agents, tools, graphs, retrieval configurations, knowledge sources, and deployment profiles;
- architecture principles, standards, reference architectures, patterns, and approved technology choices;
- projects and workstreams whose outcomes materially affect governed architecture;
- evaluation gates, approvals, exceptions, and compliance evidence;
- material architecture changes across the system lifecycle.

### 4.2 Out of scope

Unless separately adopted, this framework does not govern:

- detailed corporate governance outside architecture concerns;
- full enterprise GRC functionality;
- human-resources or employee-performance decisions;
- financial authorization unrelated to architecture;
- legal interpretations of regulatory obligations;
- routine low-risk implementation choices already delegated by an approved architecture.

### 4.3 Tailoring

Governance must be proportional to risk. A small internal, read-only knowledge assistant should not require the same review depth as an autonomous system processing sensitive data or triggering external actions.

Tailoring may change the evidence depth, reviewers, timing, or checklist, but it must not remove:

- accountable ownership;
- decision traceability;
- applicable mandatory controls;
- explicit treatment of material non-conformance;
- re-evaluation triggers;
- authorization boundaries.

## 5. Governance objectives

Architecture governance should:

1. align architecture decisions with business strategy and measurable outcomes;
2. clarify who may propose, review, approve, reject, or grant an exception;
3. encourage reuse of approved standards, patterns, services, and evidence;
4. identify risk early enough for correction to be practical;
5. make compliance status and decision rationale visible to authorized stakeholders;
6. permit justified innovation through controlled, time-bound exceptions;
7. connect evaluation results to architecture and deployment decisions;
8. preserve evidence sufficient to reconstruct significant decisions;
9. monitor whether controls remain effective after approval;
10. improve governance using findings, incidents, outcomes, and stakeholder feedback.

## 6. Governance principles

### G1. Business alignment first

Every material architecture decision must identify the business capability, outcome, constraint, or risk it supports. Technical elegance alone is not sufficient justification.

### G2. Evidence before assertion

Compliance claims, approvals, and exceptions must cite relevant evidence. Raw AI output is not authoritative evidence unless reviewed and connected to reliable sources.

### G3. Human accountability

AI may collect, compare, summarize, or propose. Named humans or authorized governance bodies remain accountable for risk acceptance, exceptions, and final approval.

### G4. Standards and reuse before unnecessary variation

Teams should prefer approved principles, standards, reference architectures, shared services, and proven patterns. A different approach may be used when its benefit and risk are documented.

### G5. Proportionality

Review depth, evidence, approval level, monitoring, and control strength scale with risk, materiality, novelty, and reversibility.

### G6. Transparency with controlled access

Authorized stakeholders should be able to see decisions, rationale, evidence, conditions, and exceptions. Transparency does not override confidentiality, least privilege, project isolation, or privacy.

### G7. Independence and conflict management

Material reviews should include a reviewer who is not solely responsible for delivering the solution. Conflicts of interest must be disclosed and managed.

### G8. Secure and privacy-aware by design

Data classification, access, retention, model/provider handling, residency, security boundaries, and abuse cases must be considered before approval—not after deployment.

### G9. Controlled exceptions

Non-conformance may be accepted only through an explicit decision that records rationale, owner, compensating controls, risk, expiry, and remediation or review conditions.

### G10. Continuous governance

Approval is not permanent immunity from review. Material changes, incidents, control failures, new obligations, model/vendor changes, and observed performance can trigger re-assessment.

## 7. Governance organization and roles

Organizations may rename or combine roles, but decision rights and accountability must remain explicit.

### 7.1 Executive Sponsor

Accountable for organizational support, authority, and resources for the architecture-governance practice.

Responsibilities:

- sponsor the Architecture Board;
- ensure governance has appropriate organizational authority;
- resolve escalated business conflicts;
- review whether the governance model remains effective.

### 7.2 Architecture Board

The primary cross-functional architecture decision body.

Responsibilities:

- approve architecture principles, standards, reference architectures, and material changes;
- approve, conditionally approve, reject, or defer material architecture submissions;
- decide or escalate significant exceptions;
- monitor architecture compliance and recurring systemic issues;
- resolve cross-domain disputes;
- ensure architecture supports business needs;
- sponsor improvements to the architecture practice.

Recommended membership should represent business, enterprise architecture, technology, data, security/privacy, operations, and relevant delivery interests. Membership should be small enough to decide while broad enough to represent material concerns.

### 7.3 Chief Architect / Architecture Governance Lead

Accountable for coherence of the enterprise architecture and operation of the governance framework.

Responsibilities:

- maintain the governance framework and architecture repository;
- coordinate reviews and agendas;
- verify that submissions are ready for decision;
- recommend review scope and participants;
- monitor conditions, exceptions, and remediation;
- report architecture health and systemic risks to the Architecture Board.

### 7.4 Enterprise and Domain Architects

Responsible for architecture development and stewardship across business, data, application, technology, security, AI, and other configured domains.

Responsibilities:

- develop and maintain principles, standards, patterns, roadmaps, and target architectures;
- assess project and system alignment;
- identify dependencies, reuse opportunities, and cross-domain impacts;
- provide or review architecture evidence;
- monitor approved architecture through delivery.

### 7.5 Architecture Review Coordinator

Responsible for the administration and integrity of the review process.

Responsibilities:

- schedule and track reviews;
- confirm scope, participants, evidence, and decision deadlines;
- record questions, findings, decisions, votes where applicable, and actions;
- protect the completeness and immutability of the decision record;
- track conditions and exception expiry.

The coordinator administers the decision; they do not acquire authority to approve merely by coordinating it.

### 7.6 System / Project Owner

Accountable for the business outcome, system risk, resources, and response to governance findings.

Responsibilities:

- define business purpose, scope, stakeholders, and success measures;
- ensure architecture evidence is complete and accurate;
- assign remediation owners;
- accept residual risk only within delegated authority;
- ensure approved conditions are implemented.

### 7.7 Solution / Project Architect

Responsible for the architecture submission and its technical coherence.

Responsibilities:

- document baseline, target, decisions, interfaces, data, risks, and standards alignment;
- maintain traceability from requirements and principles to decisions;
- identify non-conformance proactively;
- update the architecture when material delivery changes occur.

### 7.8 Security, Privacy, Data, Risk, Operations, and Compliance SMEs

Responsible for evaluating concerns in their areas and defining applicable controls or conditions.

### 7.9 Delivery Team

Responsible for implementing the approved architecture and raising material deviations before they become irreversible.

### 7.10 Internal Audit / Independent Assurance

Where present, independently assesses whether governance processes and controls are designed and operating effectively. It should not own the controls it audits.

## 8. Decision-rights model

| Decision | Proposes | Reviews | Approves | Records / monitors |
|---|---|---|---|---|
| Architecture principles and enterprise standards | Chief/Domain Architect | Stakeholders and SMEs | Architecture Board | Governance Lead |
| Project architecture | Solution Architect / Owner | Domain Architects and SMEs | Delegated Architect or Architecture Board, by risk | Review Coordinator |
| High-risk AI system | System Owner / AI Architect | Security, Privacy, Data, Risk, Operations, EA | Architecture Board and any required corporate authority | Governance Lead |
| Low-risk, conformant change | Delivery Team / Architect | Delegated reviewer | Delegated architecture authority | System record owner |
| Material exception | Solution Architect / Owner | Standard owner, risk owner, affected SMEs | Architecture Board or delegated exception authority | Exception owner and Coordinator |
| Standard retirement/change | Standard owner | Affected domains and delivery representatives | Architecture Board | Architecture repository owner |
| Emergency deviation | Operational owner | Available architecture/security authority | Defined emergency authority | Retrospective Board review |

Delegation thresholds must be documented. An individual must not approve an exception that exceeds their risk authority or where they have an unmanaged conflict of interest.

## 9. Governed architecture records

The architecture repository should contain or reference:

- business outcomes, capabilities, stakeholders, and concerns;
- architecture principles and policies;
- baseline and target architectures;
- roadmaps and transition states;
- standards, patterns, reference architectures, and technology lifecycle status;
- architecture decision records;
- system and AI-system inventory;
- models, providers, prompts, agents, tools, graphs, knowledge sources, and deployment profiles;
- data classifications and information flows;
- security, privacy, resilience, and operational controls;
- evaluations, quality gates, and monitoring results;
- compliance assessments, findings, conditions, and remediation;
- exceptions / dispensations and expiry;
- approvals and decision history;
- incidents, lessons, and re-evaluation triggers.

Records should be generated from operational configuration where practical. Governance must avoid duplicating facts that KB Sandbox can derive reliably from the same configuration used to run a system.

## 10. Governance lifecycle and gates

### Gate 0 — Intake and triage

Determine:

- business objective and accountable owner;
- scope and affected architecture domains;
- novelty, materiality, reversibility, and dependencies;
- data sensitivity and regulatory context;
- AI autonomy, tools, external actions, and impact;
- preliminary risk tier;
- required review path and evidence.

**Output:** registered architecture item, owner, scope, risk tier, review plan.

### Gate 1 — Architecture direction

Confirm:

- alignment with business outcomes and principles;
- stakeholders and concerns;
- baseline constraints and target direction;
- applicable standards, reference architectures, and roadmap;
- candidate options and major trade-offs.

**Decision:** proceed, proceed with discovery conditions, revise, or stop.

### Gate 2 — Architecture definition

Review:

- architecture views appropriate to scope;
- requirements traceability;
- data, integration, identity, security, privacy, operations, resilience, and cost;
- AI models, providers, knowledge, tools, prompts, guardrails, and human oversight where relevant;
- risks, assumptions, dependencies, and decisions;
- declared conformance and exceptions.

**Decision:** approve design, approve with conditions, require redesign, or escalate.

### Gate 3 — Delivery readiness

Confirm:

- critical findings resolved or accepted;
- evaluation gates and mandatory controls defined;
- implementation plan, ownership, test strategy, monitoring, rollback, and operational readiness;
- vendor and deployment constraints addressed;
- conditions and exceptions assigned and dated.

**Decision:** approve for implementation/deployment candidate, conditional approval, or hold.

### Gate 4 — Pre-production / transition compliance

Verify implemented evidence against the approved architecture:

- material design decisions and controls are present;
- evaluations meet risk-based thresholds;
- security/privacy/operational evidence is complete;
- deviations are resolved or covered by approved exceptions;
- required human approvals are recorded.

**Decision:** conformant, conformant with conditions, non-conformant, exception approved, or not applicable.

### Gate 5 — Operational review

Monitor:

- quality, risk, incidents, failures, cost, latency, and user impact;
- control effectiveness;
- changes in data, models, vendors, tools, prompts, knowledge, or dependencies;
- exception expiry and remediation;
- continuing business alignment.

**Decision:** continue, remediate, re-assess, restrict, suspend, or retire.

## 11. Architecture compliance assessment

### 11.1 Purpose

A compliance assessment determines whether a specific architecture or implementation aligns with applicable business objectives, principles, standards, approved architecture, roadmap, and mandatory controls.

The review should catch material issues early, support delivery, reveal gaps in standards, identify reuse opportunities, and provide evidence for decisions. It is not intended to punish teams or replace collaboration between architects and delivery.

### 11.2 Review timing

Reviews should occur at points where enough design or implementation exists to assess, but meaningful correction remains possible. Mandatory trigger points should be configured by risk tier.

### 11.3 Required inputs

At minimum:

- review request and scope;
- accountable owner and architect;
- business objective and affected capabilities;
- applicable principles, standards, policies, and roadmap items;
- architecture description and important decisions;
- inventory of systems, data, integrations, technologies, AI components, and external services in scope;
- risks, assumptions, constraints, and dependencies;
- evaluation and control evidence appropriate to the gate;
- known deviations and requested exceptions;
- prior decisions and unresolved conditions.

### 11.4 Review procedure

1. Register the review and define decision required.
2. Confirm scope, risk tier, applicable criteria, participants, and conflicts.
3. Verify evidence completeness.
4. Tailor the checklist to material risks and differentiators.
5. Conduct independent and/or meeting-based review.
6. Record observations and evidence references.
7. Classify findings by severity and ownership.
8. Allow the project team to clarify or provide missing evidence.
9. Decide compliance status and conditions.
10. Record decision, rationale, approver, date, and next review.
11. Track remediation and exception expiry.
12. Feed systemic findings into standards and governance improvement.

### 11.5 Compliance statuses

| Status | Meaning |
|---|---|
| **Conformant** | Applicable criteria are satisfied and no unresolved material findings remain. |
| **Conformant with conditions** | Progress is authorized subject to explicit, owned, dated conditions. |
| **Non-conformant** | One or more material criteria are not met and no approved exception covers them. |
| **Exception approved** | A defined non-conformance is temporarily or permanently accepted by authorized decision-makers with recorded treatment. |
| **Not applicable** | A criterion does not apply; rationale is recorded. |
| **Insufficient evidence** | The reviewer cannot make a reliable determination from available evidence. |

Compliance is not a percentage alone. A high aggregate score cannot compensate for an unmet mandatory control.

### 11.6 Finding severity

| Severity | Definition | Expected treatment |
|---|---|---|
| **Critical** | Creates unacceptable business, security, privacy, safety, regulatory, or operational exposure. | Stop/hold unless emergency authority explicitly accepts the risk. |
| **Major** | Material breach of principle, standard, approved architecture, or mandatory control. | Resolve before gate or obtain authorized exception. |
| **Moderate** | Meaningful weakness that should be corrected but may not block the current gate. | Owned remediation with due date. |
| **Minor** | Low-impact inconsistency or improvement opportunity. | Track or accept according to local practice. |
| **Observation** | No current non-conformance; may inform future improvement. | No mandatory action unless promoted. |

## 12. Exception / dispensation process

An exception is not an informal waiver. The request must include:

- criterion, principle, standard, or control not met;
- affected systems, versions, environments, and scope;
- business and technical rationale;
- alternatives considered and why they were rejected;
- risk and affected stakeholders;
- compensating controls;
- accountable owner;
- start date and expiry or permanent-review basis;
- remediation or migration plan where applicable;
- monitoring and escalation conditions;
- requested approving authority.

The decision record must include approver, decision, rationale, conditions, date, and next review.

Exceptions should be:

- limited to the narrowest necessary scope;
- time-bound by default;
- visible to affected stakeholders;
- reviewed before expiry;
- revoked when conditions fail or risk materially changes;
- analyzed collectively to identify obsolete standards or recurring delivery problems.

Emergency deviations require retrospective review within a defined period.

## 13. Change control and re-evaluation triggers

A previously approved architecture must be re-evaluated when a material change may affect its compliance or risk. Triggers include:

- changed business purpose, users, decisions, or impact;
- new or materially changed regulation, contract, or policy;
- data-classification or residency change;
- new model, provider, model version, fine-tune, or deployment location;
- significant prompt, agent, tool, graph, permission, or autonomy change;
- new external integration or write capability;
- material knowledge-source, retrieval, or guardrail change;
- architecture pattern or critical dependency change;
- major performance, reliability, security, privacy, safety, or quality incident;
- control failure or evaluation regression;
- exception expiry;
- merger, acquisition, geographic expansion, or major organizational change;
- retirement or deprecation of an applicable standard or technology.

The governance authority should define materiality thresholds so routine changes do not create unnecessary review load.

## 14. Risk-tiered control expectations

### Lower risk

Typical example: internal, read-only assistant using approved non-sensitive sources with no external actions.

Minimum expectations:

- owner and business purpose;
- approved sources and access controls;
- model/provider identification;
- basic quality evaluation;
- provenance and logging;
- user disclosure and correction path;
- delegated architecture approval.

### Moderate risk

Typical example: research or consulting assistant using external sources and producing recommendations subject to human review.

Additional expectations:

- data classification and provider-handling review;
- evaluation suite and thresholds;
- citation and uncertainty controls;
- explicit human-review gate;
- tool/iteration/cost limits;
- monitoring and periodic review;
- domain and security/privacy review.

### Higher risk

Typical example: operational agent processing sensitive data, modifying systems, making consequential recommendations, or triggering external actions.

Additional expectations:

- Architecture Board review;
- named risk owner and residual-risk acceptance;
- least-privilege tool authorization and action confirmation;
- independent security/privacy/compliance assessment;
- adversarial and failure-mode testing;
- deterministic enforcement boundaries;
- rollback, kill switch, incident response, and operational monitoring;
- strict evaluation/promotion gates;
- shorter review cycle and change-trigger requirements.

Risk tier does not override a mandatory legal, contractual, security, or privacy requirement.

## 15. Compliance checklist

Tailor this checklist to the review. Mark each item **Conformant**, **Condition**, **Non-conformant**, **Exception**, **Not applicable**, or **Insufficient evidence**, and cite evidence.

### A. Business and scope

- [ ] Business purpose, outcomes, owner, users, and scope are defined.
- [ ] Architecture decisions trace to business and stakeholder concerns.
- [ ] Material assumptions, constraints, dependencies, and out-of-scope items are explicit.
- [ ] Benefits and success measures are defined.

### B. Principles, standards, and roadmap

- [ ] Applicable architecture principles and standards are identified.
- [ ] The solution aligns with approved target architecture and roadmap.
- [ ] Reuse and approved patterns were considered before custom solutions.
- [ ] Technology lifecycle, support, portability, and exit risks are addressed.
- [ ] Deviations are declared rather than hidden.

### C. Architecture completeness

- [ ] Relevant business, data, application, technology, security, integration, and operational views exist.
- [ ] Interfaces, trust boundaries, dependencies, and external services are documented.
- [ ] Important decisions and alternatives are recorded.
- [ ] Implementation and transition stages preserve architectural integrity.

### D. Data, privacy, and knowledge

- [ ] Data owners and classifications are recorded.
- [ ] Collection, purpose, access, sharing, retention, deletion, and residency are addressed.
- [ ] Sensitive data is minimized and protected.
- [ ] Knowledge and evidence sources have authorization, provenance, freshness, and approval status.
- [ ] Project, user, and organization isolation boundaries are defined and tested.

### E. Security and identity

- [ ] Threats, abuse cases, trust boundaries, and attack surfaces are assessed.
- [ ] Identity, authentication, authorization, and least privilege are designed.
- [ ] Secrets and credentials are stored and rotated appropriately.
- [ ] Dependencies, supply chain, logging, monitoring, and incident response are addressed.
- [ ] Security controls have evidence of implementation and testing.

### F. AI models and providers

- [ ] Every model/provider/version has an identifiable inventory record.
- [ ] Selection considers quality, reliability, cost, context limits, structured output, and tool use.
- [ ] Provider data handling, retention, residency, and contractual considerations are assessed.
- [ ] Model limitations, fallback behavior, deprecation, and change monitoring are defined.
- [ ] Model changes trigger proportionate re-evaluation.

### G. Agents, tools, prompts, and autonomy

- [ ] Agent purpose, owner, instructions, model, knowledge, tools, and graph are versioned.
- [ ] Permitted and prohibited actions are explicit.
- [ ] Tool authorization is enforced outside model reasoning.
- [ ] Confirmation/approval rules match action risk.
- [ ] Iteration, cost, timeout, termination, and escalation limits exist.
- [ ] Prompt-injection, unsafe tool use, and indirect data-exposure risks are tested.
- [ ] Human accountability is preserved for consequential decisions.

### H. Quality and evaluation

- [ ] Evaluations represent the intended use and relevant failure modes.
- [ ] Thresholds are risk-based and approved before promotion.
- [ ] Critical failures cannot be hidden by aggregate scores.
- [ ] Human review and corrections are preserved.
- [ ] Evaluation results identify configuration and evidence versions.
- [ ] Regressions block or condition promotion as defined.

### I. Operations and resilience

- [ ] Capacity, latency, availability, cost, and dependency limits are understood.
- [ ] Monitoring covers quality, failures, controls, security, and business impact.
- [ ] Failure handling, rollback, recovery, continuity, and retirement are defined.
- [ ] Operational ownership and support model are assigned.
- [ ] Significant events can be reconstructed from retained evidence.

### J. Governance and decision evidence

- [ ] Required reviewers participated and conflicts were managed.
- [ ] Findings have severity, owner, evidence, and due date.
- [ ] Conditions and exceptions are explicit and authorized.
- [ ] Decision, rationale, approver, date, and next review are recorded.
- [ ] All mandatory controls are satisfied or covered by an authorized exception.

## 16. Architecture Compliance Record template

### Identification

- Record ID:
- Review title:
- System / project / workstream:
- Architecture version / commit / configuration:
- Review gate:
- Risk tier:
- Review date:
- Next review date:

### Accountability

- Business owner:
- System owner:
- Lead architect:
- Review coordinator:
- Decision authority:
- Participating SMEs:
- Conflicts disclosed:

### Review basis

- Business outcome:
- Scope:
- Applicable principles:
- Applicable standards and reference architectures:
- Applicable policies / obligations:
- Evidence package:
- Prior decisions / exceptions:

### Findings

| ID | Domain | Criterion | Status | Severity | Evidence | Required action | Owner | Due date |
|---|---|---|---|---|---|---|---|---|
| F-001 |  |  |  |  |  |  |  |  |

### Exceptions

| Exception ID | Non-conformance | Rationale | Risk | Compensating controls | Owner | Approver | Expiry |
|---|---|---|---|---|---|---|---|
| E-001 |  |  |  |  |  |  |  |

### Decision

- Compliance status:
- Decision:
- Rationale:
- Conditions:
- Residual risks:
- Approver:
- Approval date:
- Required follow-up:
- Re-evaluation triggers:

## 17. Evidence and recordkeeping

For significant decisions, KB Sandbox should retain or reference:

- the submitted architecture and evidence package;
- exact versions of relevant systems, models, prompts, agents, tools, graphs, knowledge, and controls;
- reviewer questions and responses;
- evaluation and test results;
- findings and remediation;
- exceptions and compensating controls;
- decision, rationale, authority, date, and conditions;
- changes between reviewed and approved versions;
- operational outcomes and incidents relevant to continued approval.

Retention must be proportionate and governed. “Log everything forever” is not a compliant strategy. Records must have defined ownership, access, retention, deletion, and integrity controls.

## 18. Metrics and reporting

Metrics should improve decisions rather than reward administrative volume.

Suggested measures:

- percentage of governed systems with named owners and current inventory;
- review lead time by risk tier and gate;
- percentage of reviews completed before irreversible implementation;
- conformant / conditional / non-conformant outcomes;
- open findings by severity and age;
- overdue conditions and exceptions;
- exception recurrence by principle or standard;
- evaluation-gate failure and regression rates;
- time from material change to re-assessment;
- incidents linked to known findings, expired exceptions, or architecture deviation;
- reuse of approved standards/patterns;
- stakeholder feedback on review usefulness;
- standards updated because compliance reviews revealed systemic gaps.

Do not use raw finding counts to compare individuals or teams. A healthy practice may report more findings because it identifies risk earlier and more transparently.

## 19. KB Sandbox capability mapping

| Governance capability | Current KB Sandbox foundation | M7 target / gap |
|---|---|---|
| Evidence and provenance | Source/chunk provenance, Wiki sources, workstream artifacts, provider/model snapshots | Connect all governance decisions to authoritative evidence and versioned configurations. |
| Human review | Chunk review, Wiki draft/review/approval, evaluation human review | General approval records and configurable architecture/governance gates. |
| Architecture repository | Projects, workstreams, Wiki, artifacts, design notes | Governed architecture objects, principles, standards, decisions, roadmaps, exceptions. |
| System inventory | Models, Agents, graphs, projects, knowledge sources exist separately | Unified AI-system inventory with accountable owner and live configuration references. |
| Risk classification | Product brief and free-text guardrails | Versioned risk model that determines mandatory controls and approval authority. |
| Controls | RLS, roles, bounded tools, approval gates, free-text guardrails | Versioned reusable control/guardrail definitions with evidence and enforcement mapping. |
| Compliance assessment | Evaluations and architecture-review Workbench method | Formal compliance review record, criteria, findings, conditions, decision, and re-review. |
| Exceptions | No general exception register | Authorized, scoped, time-bound exception/dispensation workflow. |
| Change control | Immutable Wiki/graph/Agent versions and provenance | Material-change detection and governance re-evaluation triggers across governed systems. |
| Reporting | Dashboard, findings, artifacts, test reports | Architecture Board dashboard and recurring governance reports. |
| Audit trail | Operation logs and version histories in selected areas | Unified, access-controlled decision and control evidence with retention policy. |

## 20. Suggested KB Sandbox data model direction

This section is directional and requires a separate implementation design.

Potential records:

```text
governed_systems
architecture_principles
architecture_standards
architecture_decisions
governance_risk_assessments
governance_controls
governed_system_controls
compliance_reviews
compliance_criteria
compliance_findings
governance_decisions
governance_conditions
governance_exceptions
governance_evidence_links
```

Design rules:

- use stable record identities and immutable/versioned content where decisions depend on historical state;
- reference existing projects, workstreams, artifacts, evaluations, models, Agents, graphs, Wiki content, and operation logs instead of copying them;
- distinguish a proposed control from an implemented and verified control;
- distinguish AI assessment from human decision;
- make approvals and exceptions append-only or otherwise tamper-evident;
- apply RLS and project/organization isolation to every governance record;
- avoid a single free-text “compliant” flag;
- require evidence and authority for final compliance status;
- permit configurable criteria and workflows without weakening mandatory controls.

## 21. Implementation sequence

### Phase 1 — Policy and inventory foundation

- appoint governance owner and interim Architecture Board;
- approve principles, scope, roles, decision rights, and risk tiers;
- define the minimum AI-system inventory;
- define compliance statuses, finding severities, and evidence requirements;
- pilot the Architecture Compliance Record template manually.

### Phase 2 — KB Sandbox governance records

- implement governed-system inventory and accountable ownership;
- add risk assessments and control definitions;
- connect controls to existing evaluations and configuration;
- implement compliance review, findings, decisions, and conditions;
- create governance dashboards and reminders.

### Phase 3 — Exceptions and change control

- implement exception/dispensation workflow and expiry;
- define material-change triggers;
- connect configuration/version changes to re-evaluation;
- add Architecture Board reporting.

### Phase 4 — Executable governance

- enforce risk-tier evaluation gates;
- bind versioned guardrails to Agent/tool execution;
- block promotion when mandatory evidence or controls are missing;
- support controlled emergency paths and retrospective review;
- evaluate control effectiveness from operational evidence.

### Phase 5 — Continuous improvement

- analyze recurring findings and exceptions;
- update standards and reference architectures;
- refine risk models and thresholds using outcomes;
- perform periodic governance-process reviews;
- expand organization-specific governance configuration.

## 22. Minimum viable governance pilot

Pilot this framework on one moderate-risk KB Sandbox capability, such as the Workbench Assistant with Wiki retrieval and bounded tools.

The pilot should produce:

1. a governed-system inventory record;
2. business purpose and accountable owner;
3. architecture description and evidence map;
4. data, model/provider, knowledge, tool, and access inventory;
5. risk classification;
6. applicable principles and controls;
7. evaluation results and known failures;
8. compliance findings;
9. decision with conditions;
10. any exception and expiry;
11. monitoring and re-evaluation triggers;
12. lessons for improving this framework and the M7 implementation design.

## 23. Approval and maintenance

This framework becomes effective only when approved by the designated governance authority. Until then, it is guidance for designing the M7 governance capability and conducting pilots.

On approval, record:

- approving body and members;
- approval date;
- effective date;
- version approved;
- conditions;
- document owner;
- review date;
- superseded version, if any.

The framework should be reviewed at least annually and when significant changes occur to organizational governance, the TOGAF basis used by the organization, KB Sandbox architecture, applicable obligations, or observed control effectiveness.

## Appendix A — RACI starter matrix

Key: **A** accountable, **R** responsible, **C** consulted, **I** informed.

| Activity | Executive Sponsor | Architecture Board | Chief Architect | Domain/Project Architect | System Owner | SMEs | Review Coordinator | Delivery Team |
|---|---|---|---|---|---|---|---|---|
| Approve principles/standards | I | A | R | C | C | C | I | I |
| Define solution architecture | I | I/C | C | R | A | C | I | R/C |
| Triage review/risk | I | I | A | R | C | C | R | I |
| Conduct compliance review | I | C/A by tier | A/R | R/C | C | R/C | R | C |
| Approve high-risk system | I/C | A | R | C | C | C | R | I |
| Remediate findings | I | I | C | R | A | C | monitors | R |
| Approve exception | I/C | A by threshold | R | C | R/C | C | records | I |
| Monitor conditions | I | I | A | R | R | C | R | R |
| Improve governance process | C | A | R | C | C | C | R | I |

## Appendix B — Questions for organizational tailoring

1. What body will act as the Architecture Board?
2. Which decisions require Board approval and which are delegated?
3. How are risk tiers defined and who may change them?
4. Which principles, standards, and reference architectures are mandatory?
5. Which legal, regulatory, contractual, privacy, and security authorities must participate?
6. What evidence is mandatory at each lifecycle gate?
7. What findings automatically block progression?
8. Who may accept residual risk and at what level?
9. What is the maximum exception duration?
10. How are emergency deviations authorized and retrospectively reviewed?
11. Which system/model/data/tool changes trigger re-evaluation?
12. What records must be retained, where, and for how long?
13. How will organization, project, and user confidentiality be protected?
14. How will governance effectiveness be measured?
15. How will teams challenge or appeal a decision?

## Appendix C — Terminology

**Architecture governance:** The system of direction, oversight, decision rights, accountability, and controls applied to architecture work and outcomes.

**Compliance assessment:** A review of a defined architecture or implementation against applicable objectives, principles, standards, approved architecture, and controls.

**Condition:** A required action attached to an authorization or approval.

**Control:** A technical, procedural, organizational, or contractual measure intended to modify risk or assure an objective.

**Exception / dispensation:** An authorized, documented acceptance of a defined non-conformance under specified scope and conditions.

**Finding:** A review conclusion supported by evidence, classified by status and severity.

**Governed system:** A system or material configuration placed under this governance framework.

**Mandatory control:** A control that must be implemented or covered by an authorized exception before a defined gate may pass.

**Residual risk:** Risk remaining after controls and treatments are applied.

**Standard:** An approved requirement or constraint intended to produce consistency, interoperability, quality, or risk reduction.
