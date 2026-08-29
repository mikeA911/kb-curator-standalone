# Development Request: Enterprise Shadow AI Governance — Later Phases

**Status:** Proposed — post-classification roadmap
**Created:** 29 August 2026
**Area:** AI Governance / Ember / Model Operations / Project Knowledge
**Priority:** Near-future strategic capability; not required to complete the initial information-classification release
**Depends on:** Information Sensitivity Classification and AI-provider eligibility currently being implemented
**Source concept:** “Shadow AI Is Already Inside the Enterprise. The Answer May Not Be to Ban It.”

## Purpose

Extend the initial manual information-sensitivity classifier into a governed AI-processing policy system that can decide—before inference—whether information may be sent to a particular AI environment and what safe alternative should be offered when it may not.

The completed direction should let an organization provide employees with a useful sanctioned AI Workbench while retaining control over:

- which models and deployments may process which information;
- what must be redacted, routed, approved or blocked;
- which evidence and policy produced each decision;
- how exceptions are authorized and expire;
- how model performance, cost and policy events are evaluated without turning the platform into employee surveillance; and
- when private or regional AI infrastructure is justified by measured workload.

This is a phased design request. Do not implement it as one large release.

## Current baseline

The initial release establishes the necessary first layer:

1. a separate `information_sensitivity` axis for Public, Internal, Confidential and Restricted information;
2. continued separation from the existing human evidence-access classification;
3. a maximum sensitivity setting for approved AI providers;
4. evaluation of the effective sensitivity of retrieved evidence;
5. a normal Ember policy-block response when a selected provider is ineligible; and
6. correction of anonymous access for approved public Wiki articles.

That work is valuable, but it is not yet a complete Shadow AI governance design. In particular, it does not yet provide deterministic content inspection and redaction, model-aware automatic routing, approval and exception workflows, governance reporting or the proposed Enterprise Shadow AI Governance showcase.

## Immediate architecture safety gate for the current release

The eligibility decision must occur **before classified content is serialized into, or sent with, any model request**.

Do not implement the control only after a tool iteration has completed if the retrieved tool output can already be included in the next model invocation. A safe sequence is:

1. resolve the proposed provider/model or deployment;
2. retrieve authorized evidence through deterministic application code;
3. calculate the effective sensitivity of that evidence;
4. evaluate the applicable AI-processing policy;
5. transform, reroute, request approval or block as required; and
6. only then construct and send the inference request containing that evidence.

If Ember requires an initial model call to decide whether to search, that call must not include classified project evidence that has not passed the gate. Project metadata placed in system prompts must also be reviewed against this rule.

This is a completion criterion for the initial classifier, not a request to implement every later phase now.

## Architectural principles

### 1. Human access and AI processing remain separate decisions

“May this person see this resource?” and “May this AI environment process this resource?” are separate policy axes. Passing one must never imply passing the other.

### 2. The policy gate sits before every outbound AI boundary

The rule applies not only to Ember’s conversational model, but eventually to:

- external research providers;
- embedding, reranking, extraction and classification models;
- registered customer agents;
- MCP tools that transmit content;
- OCR, transcription and document-processing services;
- image and multimodal models;
- journal or document generators; and
- evaluation or observability services that receive prompts, responses or evidence.

### 3. Most restrictive evidence wins unless an authorized release exists

If a request uses one Restricted source among otherwise Internal sources, the assembled request is Restricted. A lower classification requires a deliberate sanitized-release decision, not an automatic average or majority rule.

### 4. Deterministic controls enforce policy

AI may recommend a classification, identify likely sensitive spans or explain a decision. It must not be the only enforcement layer deciding whether protected information leaves the environment.

### 5. No silent routing or silent downgrade

When the platform changes the selected model, removes content, requests approval or blocks a request, Ember must explain what happened in plain language. The user should know which model actually answered and why it was eligible.

### 6. Policies and decisions are versioned evidence

Every consequential decision should identify the policy version, effective sensitivity, evidence involved, chosen outcome and responsible human or system rule.

### 7. Governance must not become employee surveillance

Management reporting should emphasize approved model adoption, costs, use-case patterns, policy events, evaluation results and control effectiveness. Access to individual prompt content should remain exceptional, purpose-bound and audited.

## Phased delivery

## Phase 2 — Policy foundation and complete inference-boundary coverage

### Goal

Move from one provider ceiling to a versioned AI-processing policy that applies consistently to every relevant information path.

### Capabilities

- Define organization or deployment-level AI-processing policies with explicit versions and effective dates.
- Support Project defaults and resource-level overrides without weakening stricter source classifications.
- Extend classification coverage to all content that can enter AI context, including:
  - knowledge sources and their current versions;
  - Wiki articles;
  - workstream artifacts;
  - uploaded chat attachments;
  - generated documents and journals;
  - retrieved structured records;
  - user-provided prompt attachments; and
  - tool results returned by external systems.
- Build an internal **context manifest** before inference containing the resource identifiers, classifications and transformations applied to the proposed request.
- Enforce the gate in a shared service used by Ember, evaluations, generators and future agents rather than duplicating checks in individual UI actions.
- Record a policy-decision event without unnecessarily copying confidential prompt or evidence content into logs.
- Provide a dry-run policy evaluator for administrators before a policy is activated.

### Provider, model and deployment identity

The later policy must become more precise than provider-only eligibility. One provider may offer several materially different environments—for example consumer endpoints, enterprise no-training endpoints, regional deployments and private capacity.

Policy subjects should therefore be capable of identifying:

- provider;
- model;
- deployment or endpoint;
- region and residency;
- contractual handling profile;
- retention or training terms;
- private/local status;
- supported data types; and
- certification state.

The initial provider ceiling can remain as a coarse default, but model/deployment rules should override it when introduced.

### Completion criteria

No classified evidence can reach a model, tool or external agent without one shared policy decision. Automated tests prove the gate executes before transmission on every supported path.

## Phase 3 — Deterministic detection, redaction and request transformation

### Goal

Introduce the five policy outcomes proposed in the Shadow AI article:

- **Allow**
- **Redact**
- **Route to an eligible environment**
- **Require human approval**
- **Block**

### Detection strategy

Begin with transparent deterministic detectors appropriate to the organization, such as:

- credential and secret patterns;
- government or customer identifiers;
- financial-account patterns;
- known source-code or repository markers;
- regulated health-data patterns;
- customer-defined terms, project names or document markings; and
- structured-field classifications supplied by an upstream system.

Allow optional AI-assisted classification only as an advisory signal. Record confidence and require human confirmation where the recommendation would raise or lower sensitivity.

### Redaction behavior

- Redaction occurs before inference.
- The user can see that content was removed and the applicable reason, without exposing material they are not authorized to view.
- The system maintains a protected transformation manifest linking redacted spans to the source and rule.
- Redacted content must not leak through filenames, metadata, citations, logs, error messages or tool parameters.
- When redaction would destroy the usefulness or meaning of the request, route, request approval or block instead.

### Sanitized-release workflow

Provide a deliberate process for creating a lower-sensitivity derived artifact:

1. produce or upload the proposed sanitized version;
2. identify the source and transformations;
3. evaluate for residual sensitive content;
4. obtain approval from the required information authority;
5. record the released classification and permitted purpose; and
6. retain the relationship to the original without exposing it to unauthorized users.

## Phase 4 — Policy-aware model routing and portfolio optimization

### Goal

Let users ask Ember for help without requiring them to understand every model’s privacy, contractual or residency properties.

### Routing inputs

Model selection may consider:

- effective information sensitivity;
- organization and Project allow-lists;
- required residency or private-inference status;
- model capability and tool support;
- customer acceptance and certification state;
- evaluation results for the intended task;
- latency and availability;
- cost budget; and
- provider concentration or continuity policy.

### Routing behavior

- Prefer an eligible model that satisfies the workload’s approved quality threshold.
- Never fall back to a less-protected environment because a preferred private model is unavailable.
- Ask for user or authority confirmation where routing changes cost, quality or an important operational consequence.
- Explain the selected environment and relevant policy in response details.
- Preserve the provider, model, deployment, policy version and routing reason in per-message provenance.
- Support a strict “no eligible model” outcome without converting it into a generic provider failure.

### Evaluation relationship

Routing policy should use KB Sandbox evaluation evidence rather than public benchmark reputation alone. The platform should be able to show that a cheaper eligible model is sufficient for one workload while a private model is necessary for another.

## Phase 5 — Approval, exception and recertification workflows

### Goal

Support legitimate exceptional use without creating permanent invisible bypasses.

### Approval request

For a `REQUIRE HUMAN APPROVAL` outcome, Ember should prepare a structured request containing:

- intended purpose;
- Project and requester;
- proposed model/deployment;
- effective sensitivity;
- evidence categories involved;
- transformations already applied;
- residual risk;
- requested duration or single-use scope; and
- the authority required to decide.

The approver should never receive content they are not otherwise authorized to view.

### Exceptions

Every exception must be:

- explicitly justified;
- scoped to a requester, Project, purpose, model/deployment and data class;
- time-limited or single-use;
- approved by the correct authority;
- visible in governance reporting;
- revocable immediately; and
- re-evaluated when the source, model, deployment or policy changes.

No generic administrator bypass should silently satisfy customer authorization.

### Recertification triggers

Require re-evaluation when:

- provider terms or retention behavior change;
- a model or endpoint version changes materially;
- data residency changes;
- a Project’s sensitivity increases;
- evaluation performance falls below threshold;
- a security incident occurs; or
- an exception expires.

## Phase 6 — Organizational AI governance view

### Goal

Give authorized governance users enough aggregated evidence to manage AI adoption while minimizing access to employee content.

### Initial measures

- approved providers, models and deployments by certification state;
- usage by business use case, Project category and sensitivity tier;
- model cost, latency, failure and quality trends;
- policy outcomes: allow, redact, route, approval and block;
- repeated blocks that may indicate an unmet legitimate need;
- exceptions by owner, expiry and status;
- unclassified or stale resources;
- workloads for which no eligible model exists;
- human-intervention and correction rates; and
- private-inference workload volume and performance.

### Privacy constraints

- Aggregate by default.
- Do not expose prompt text or conversation contents in ordinary management views.
- Apply minimum group sizes or suppression where small counts could identify an individual.
- Separate operational debugging access from workforce reporting.
- Make detailed access purpose-bound, time-limited and audited.
- Document retention periods for decision logs and content-bearing diagnostics separately.

### Infrastructure evidence

The view should help answer whether private or regional infrastructure is justified by showing the volume, performance requirements and evaluation results of workloads that cannot use approved external models.

## Phase 7 — Enterprise Shadow AI Governance showcase

### Goal

Use a synthetic organization to evaluate the full approach before claiming enterprise readiness.

### Scenario

Create a synthetic organization whose employees currently use several public AI services for sales, software development, customer support and engineering investigation.

Configure KB Sandbox as the sanctioned interface through Ember, using at least:

- one approved general cloud model;
- one enterprise or regionally controlled model;
- one private/local model;
- Public, Internal, Confidential and Restricted sources;
- one request requiring redaction;
- one request routed automatically;
- one request requiring human approval; and
- one request that must be blocked.

### Experiments

Compare:

1. unrestricted employee model choice;
2. manual classification and blocking;
3. deterministic redaction;
4. policy-aware routing;
5. private-model use for Restricted workloads; and
6. the same controls under model outage and policy change.

Measure quality, policy correctness, unauthorized-transmission attempts, false blocks, redaction usefulness, latency, cost, user completion rate, approval time and user trust.

### Showcase principle

The purpose is to discover missing capabilities and operational burdens, not to construct a demonstration that can only pass. Findings must be allowed to change the product roadmap and managed-service design.

## Conceptual data model

The implementation plan should consider—but not commit prematurely to—the following concepts:

- **AI processing policy** — named policy, scope, version, status and effective dates;
- **Policy rule** — condition, target environment and outcome;
- **AI environment profile** — provider/model/deployment handling characteristics;
- **Sensitivity decision** — effective tier, resource manifest, policy version and outcome;
- **Transformation manifest** — deterministic redactions or sanitization applied;
- **Approval request and decision** — authority, rationale, scope and expiry;
- **Exception** — bounded override with lifecycle and recertification triggers;
- **Policy event** — privacy-preserving operational record; and
- **Environment evaluation profile** — workload-specific quality, cost and reliability evidence.

Prefer immutable decision history plus explicit superseding records for consequential changes. Do not overwrite historical policy identity attached to earlier AI responses.

## Ember experience

Ember should remain helpful when policy intervenes.

Examples:

### Block

> This request includes Restricted project information. The selected model is not approved to process it, so no project evidence was sent. You can use the approved private model or ask an authorized project lead to review the request.

### Route

> This request uses Confidential evidence, so I used the organization-approved enterprise deployment instead of the general default. View Response details for the model and policy record.

### Redact

> I removed two credential-like values before sending the request. The answer may be incomplete because those values were not provided to the model.

### Approval required

> This action requires approval from the Project’s information authority. I prepared a request showing the intended purpose, model and evidence classifications.

The interface must never imply that content was protected if the control ran after transmission.

## Administrative experience

Administrators and authorized governance owners need:

- a clear distinction between human-access classification and AI-processing sensitivity;
- policy simulation before activation;
- visibility into which resources remain unclassified;
- provider/model/deployment eligibility and certification;
- safe defaults for missing rules;
- conflict detection where Project and organization rules disagree;
- an emergency suspension switch for an environment or agent;
- an auditable change history; and
- clear warnings before a change could allow more sensitive information to leave the environment.

Customer authorization must remain distinct from platform administration.

## Security and failure behavior

- Fail closed when policy, classification or environment identity cannot be resolved.
- Do not include protected content in policy error messages.
- Do not log full prompts or evidence merely to prove the policy ran.
- Apply classification before embedding or reranking through external services, not only before final answer generation.
- Treat citations, filenames, metadata and retrieved snippets as potential disclosure paths.
- Prevent retries from switching to an ineligible fallback.
- Preserve idempotency for approval and exception decisions.
- Suspend affected environments immediately after a material incident or eligibility change.
- Ensure deletion, retention and legal-hold behavior is defined for policy records and any transformation artifacts.

## Evaluation requirements

Build an adversarial evaluation suite containing:

- one high-sensitivity source among lower-sensitivity evidence;
- unclassified content;
- conflicting Project and resource defaults;
- secrets embedded in ordinary prose;
- sensitive values in filenames, metadata, tables and tool parameters;
- multilingual and locally formatted identifiers;
- prompt injection attempting to disable or bypass the policy;
- an unavailable eligible model;
- an ineligible fallback model;
- an expired exception;
- a policy version change during a conversation;
- a document reclassified after earlier use; and
- a user who may access the evidence but may not send it to the selected AI environment.

For each case, verify not only the user-visible outcome but also that no unauthorized request reached the provider or external tool.

## Success measures

- Zero classified-context transmission to ineligible environments in the agreed adversarial suite.
- Every inference containing governed evidence has a policy decision and versioned provenance record.
- False blocking and redaction rates are measured against human-reviewed cases.
- Users can complete legitimate tasks through an eligible route without learning provider policy details.
- Approvals and exceptions identify the correct authority and expire as designed.
- Governance reporting provides useful adoption and cost evidence without routine exposure of individual prompt content.
- The showcase produces a documented evidence-backed decision on whether, where and how KB Sandbox should expand the feature.

## Explicitly out of scope

- claiming replacement of a mature enterprise DLP, CASB, SIEM or records-management system;
- monitoring employee activity outside sanctioned KB Sandbox and integrated agent boundaries;
- decrypting or inspecting information the requesting service is not authorized to access;
- allowing AI-generated classifications to lower sensitivity automatically;
- a universal regulatory-compliance guarantee;
- automatic legal decisions about whether data may be transferred internationally;
- hidden employee productivity scoring; and
- deploying private inference infrastructure without measured workload and evaluation evidence.

## Recommended sequencing

1. Complete and verify the initial classifier, including the pre-inference safety gate.
2. Produce a short architecture note for the shared policy-enforcement service and context manifest.
3. Implement Phase 2 coverage before adding automatic routing.
4. Add deterministic detection and redaction with a narrow, testable detector set.
5. Add approval and exception workflows before broadening consequential use.
6. Introduce routing using evaluation evidence and explicit no-eligible-model behavior.
7. Build aggregate governance reporting.
8. Run the synthetic showcase and use its findings to decide the next roadmap commitment.

## Decisions required before Phase 2 implementation

1. What is the policy owner boundary before a native Organization tenant exists?
2. Which AI services beyond conversational generation must be gated at launch?
3. Is eligibility attached first to provider, model or deployment endpoint?
4. Which classification is the safe default for unclassified Project and non-Project content?
5. Who may raise, lower or approve a sanitized release of sensitivity?
6. Which events may be aggregated for governance without exposing employee content?
7. What retention period applies to policy decisions, redaction manifests and exceptions?
8. Which Sandz/private inference environment should be used in the showcase?
