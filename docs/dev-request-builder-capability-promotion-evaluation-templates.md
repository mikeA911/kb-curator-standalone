# Builder Capability Promotion Evaluation Templates

## Status

Proposed follow-up request after Builder Operations and progress updates.

## Decision

Before a Builder-produced connector, MCP server, external agent or integration can be introduced to a customer environment, it must pass a proportionate, evidence-based evaluation.

This request concerns **capability promotion**, not promotion of a Builder account. A Builder may complete learning milestones while their produced capability remains experimental or unsuitable for customer use.

Use reusable evaluation templates rather than asking every reviewer to invent a checklist. The templates should guide Ember, Builders, evaluators and customer approvers through the same core questions while allowing a lighter review for a read-only research connector and a stronger review for a transactional agent.

## Promotion ladder

Align with the existing external-capability certification ladder:

```text
experimental
  -> sandbox_tested
  -> security_reviewed
  -> customer_accepted
  -> production_approved
```

`deprecated` and `suspended` remain available at any later stage.

Promotion is never automatic because an LLM says the work is complete. Each transition requires the template-defined evidence and the authorized decision for that stage.

## Core evaluation templates

### 1. Intended Scope and Evidence Template

**Used at:** `experimental` -> `sandbox_tested`

Checks:

- clear user problem and intended outcome;
- named capability type: connector, MCP server, external agent, webhook receiver or REST-backed integration;
- defined users, Project scope and prohibited uses;
- source system identified as authoritative;
- architecture and contract version linked;
- assumptions, known gaps and limitations recorded;
- test environment identified; and
- owner responsible for the evaluation identified.

**Gate:** no function or security claims are implied merely because the specification exists.

### 2. Functional Contract and Repeatability Template

**Used at:** `sandbox_tested`

Checks:

- tools/endpoints match the approved contract;
- required inputs, outputs and errors are documented;
- representative happy-path tests pass repeatedly;
- idempotency is tested where the operation can create, change or submit anything;
- retries, timeouts, unavailable dependencies and malformed input are tested;
- output is structured enough for Ember or another client to present safely;
- version, build/commit and deployment reference are recorded; and
- test results include evidence rather than a narrative assertion.

**Gate:** a successful demonstration once is not repeatability.

### 3. Identity Permissions and Data Handling Template

**Used at:** `sandbox_tested` -> `security_reviewed`

Checks:

- caller identity and authorization model are specified;
- Project and user boundaries are enforced server-side;
- permissions from the source system are preserved or the variance is explicitly approved;
- secrets are held outside prompts, notes and tool output;
- sensitive data classification and retention are recorded;
- logs avoid unnecessary confidential content;
- cross-user and cross-project negative tests pass; and
- delegated identity, service identity or test operator mode is clearly labeled.

**Gate:** a capability that works only because it has broad service credentials cannot be marked permission-aware.

### 4. Human Decision and Transaction Safety Template

**Used at:** `security_reviewed` and required for transactional tools

Checks:

- actions that spend money, place orders, submit records, change data or trigger irreversible work are listed;
- each consequential action has an explicit confirmation boundary;
- confirmation shows the meaningful details: target, amount, items, effect and authority;
- the model cannot treat conversational wording alone as approval;
- approval expiry, cancellation and duplicate-submission behavior are tested;
- escalation and exception route are defined; and
- operator and customer responsibilities are stated.

**Gate:** read-only capabilities may mark this template not applicable with a reviewer rationale. Transactional capabilities cannot.

### 5. Customer Acceptance and Usability Template

**Used at:** `security_reviewed` -> `customer_accepted`

Checks:

- intended customer users complete representative tasks;
- outputs, errors and citations are understandable;
- user-facing limitations are visible;
- customer confirms the scope and data-access boundary;
- relevant business owner accepts the operational behavior;
- support owner and first-line troubleshooting path are named; and
- customer acceptance is recorded as a human decision.

**Gate:** a technical reviewer cannot substitute for the customer business owner.

### 6. Production Readiness and Continuing Fitness Template

**Used at:** `customer_accepted` -> `production_approved`

Checks:

- approved deployment location and runtime version are recorded;
- health check, monitoring and alert ownership are defined;
- rate limits, cost limits and capacity assumptions are documented;
- rollback, suspension and deprecation path are tested;
- incident contact and support boundary are known;
- privacy, retention and access-review obligations are accepted;
- release notes and known limitations are published; and
- a review date or material-change trigger is recorded.

**Gate:** production approval is a point-in-time decision; it expires or reopens after a material contract, model, permission or deployment change.

## Risk profiles

Templates should select a risk profile before evaluation begins.

| Profile | Typical capability | Required templates |
|---|---|---|
| Low | Read-only public or non-sensitive research connector | 1, 2, 5, 6 proportionately |
| Moderate | Internal knowledge search with controlled sources | 1, 2, 3, 5, 6 |
| High | Private-data lookup or customer system integration | 1, 2, 3, 5, 6 with stronger reviewer authority |
| Transactional | Ordering, booking, submission or record change | All six, including 4 |

Risk profile selection is a recorded decision. A Builder cannot self-select a lower profile after a reviewer identifies data access or consequential action.

## Product behavior

### Template experience

- A Builder starts an evaluation from a capability artifact, agent/MCP registration or customer handoff.
- Ember recommends a risk profile and required templates, explaining the reasoning.
- The Builder attaches or links evidence to each check.
- Deterministic checks run where possible; e.g., contract schema validation, endpoint health, required evidence presence and test-result format.
- Ember may summarize evidence and identify gaps, but it cannot approve a gate.
- An authorized reviewer records pass, conditional pass, fail or not applicable with rationale.
- Each promotion decision is versioned and tied to the deployed/build reference.

### Re-evaluation triggers

Reopen affected templates when any of these changes:

- tool/endpoint contract;
- source-system permissions or identity approach;
- model/provider behavior that changes tool use;
- data classification or retention;
- transactional behavior or approval boundary;
- runtime, deployment region or network exposure; or
- customer-approved intended scope.

## Authorization

- The Builder prepares evidence but cannot approve their own security, customer acceptance or production promotion.
- Operator administrators may approve only within assigned authority and risk profile.
- Customer acceptance requires the customer-designated authority.
- Production approval requires the runtime/service owner and the required governance authority.
- Every decision records actor, time, capability version, stage, rationale and linked evidence.

## Scope

### In scope

- Six reusable templates and risk-profile selection.
- Versioned evidence attachments and reviewer decisions.
- Promotion gating against the existing certification ladder.
- Ember guidance and evidence-gap summaries.
- Required re-evaluation triggers.
- Read-only and transactional example templates, including the OrderLunch/OrderSnack pattern.

### Out of scope

- Automatic security certification.
- Replacing formal penetration testing, legal review or sector regulation.
- Building a full GRC product.
- Automatic testing of arbitrary third-party systems.
- A public marketplace or customer-visible capability catalogue.
- Allowing a Builder to approve their own high-risk or production capability.

## Acceptance criteria

1. A Builder can create an evaluation from a registered capability or customer handoff.
2. The system requires a risk profile and selects the appropriate templates.
3. Each template presents required checks, evidence links, reviewer state and rationale.
4. The system blocks promotion when required evidence, authority or decisions are missing.
5. Read-only capabilities can mark the transaction template not applicable with reviewer rationale.
6. Transactional capabilities cannot reach customer acceptance or production approval without a completed human-decision template.
7. A Builder cannot approve their own security, customer-acceptance or production gate.
8. Contract, permission, deployment or model/tool changes reopen the relevant evaluations.
9. Existing certification status, agent registry and Project authorization remain intact.
10. Ember can explain the next missing evaluation requirement without claiming the capability is approved.
11. Evaluation evidence and promotion decisions are visible only to authorized Builder, operator and customer roles.
12. The OrderLunch-style reference flow passes the transactional template, including explicit confirmation, expiry and idempotency tests.

## Required live validation

### Read-only connector

Evaluate a non-sensitive, read-only capability. Confirm it passes scope, functional, customer acceptance and proportionate production-readiness checks without requiring transactional approval.

### Private-data integration

Evaluate a source-retrieval capability with user and Project permissions. Confirm identity, RLS/permission negative tests and retention/logging checks are required before security review.

### Transactional agent

Evaluate an OrderLunch/OrderSnack-style agent. Confirm the evaluator rejects promotion until explicit confirmation, approval expiry, cancellation, idempotency and duplicate-click tests are attached and approved.

### Material change

Promote a capability, change its tool contract or deployment reference, and confirm the relevant evaluation stages reopen automatically while the former approval remains historically readable.
