# MCP Architecture: Evidence-Led Development for an Existing Application

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `mcp-architecture-evidence-led-development`
**Proposed status:** Draft → human review → approved
**Audience:** Product managers, architects, developers, security reviewers, operations teams, and subject-matter experts

## Overview

An MCP server can give AI assistants controlled access to the data and functions of an existing application. Generative AI can accelerate its construction, particularly when the application already provides a good OpenAPI specification. However, generating MCP tools directly from OpenAPI does not guarantee functional completeness, preservation of business rules, or safe access.

OpenAPI describes an HTTP interface. It can reveal operations, parameters, schemas, authentication mechanisms, and documented errors. It usually does not completely describe user roles, approval processes, state transitions, scheduled jobs, database rules, UI-only behavior, operational procedures, exceptional cases, or knowledge retained by experienced staff.

The correct development objective is therefore not:

> Convert every API endpoint into an MCP tool.

It is:

> Identify the business capabilities required for a stated purpose, determine how the existing application implements and governs them, and expose an intentional, traceable, and tested subset through MCP.

The proposed process begins with project intent and capability discovery. OpenAPI discovery is one evidence source within that process. Each proposed MCP capability must be traced to business purpose, authoritative implementation, permissions, rules, side effects, and test evidence. Delivery should proceed incrementally, beginning with low-risk read operations and introducing consequential actions only when identity, authorization, confirmation, audit, and recovery controls are proven.

## The problem

The apparent development path is attractively simple:

1. Produce an OpenAPI specification for the existing application.
2. Give the specification to an AI development assistant.
3. Ask it to generate an MCP server.
4. Connect an AI client and begin using the application conversationally.

This can produce a functioning technical demonstration. It does not, by itself, establish that the MCP server:

- represents everything the application does;
- preserves its business rules;
- respects all user and organizational permissions;
- handles exceptional and failure conditions;
- maintains required audit records;
- prevents unsafe or unintended combinations of operations; or
- supports the actual objective of the project.

The central risk is **false completeness**. A generated server may expose every documented endpoint and still omit important business capabilities. It may also expose low-level operations that should never be independently controlled by an AI model.

## Begin with intent

There is no single definition of a "complete" MCP server. Completeness is relative to the intended use.

Examples include:

| Project intent | What completeness means |
|---|---|
| UI enhancement | The new interface can perform the selected user activities while preserving existing behaviour and permissions. |
| Notifications or reporting | Required information can be retrieved, filtered, explained, and distributed without changing protected transactions. |
| New product feature | New user stories are supported alongside the existing capabilities and constraints they affect. |
| MCP enablement | Selected application capabilities are safely available to authorized AI clients. |
| Legacy modernization | Existing behaviour is either preserved or deliberately retired, with each decision documented. |
| Operations support | Operators can investigate, diagnose, and perform approved recovery actions without uncontrolled production changes. |
| System integration | Required cross-system processes preserve data meaning, integrity, permissions, and failure handling. |

The project should therefore start with a short **Intent and Scope Statement** defining:

- the users and business outcomes in scope;
- the activities the AI client should support;
- behaviour that must be preserved;
- behaviour that may be changed or replaced;
- explicitly excluded capabilities;
- acceptable levels of autonomy;
- risk and compliance constraints; and
- the evidence required before release.

Without this statement, teams cannot determine which gaps matter or whether the MCP server is finished.

## OpenAPI is evidence, not the complete requirements set

An accurate OpenAPI specification is extremely valuable. It can establish:

- available HTTP operations;
- request parameters and bodies;
- response structures;
- documented authentication schemes;
- status codes and error shapes;
- data types and validation constraints;
- API-level descriptions and examples; and
- the initial technical mapping for MCP tools.

It may not establish:

- which business role may perform an operation in each context;
- field-level or tenant-level access restrictions;
- valid sequences of operations;
- approval and segregation-of-duty rules;
- calculations or decisions implemented below the API layer;
- database constraints, triggers, or stored procedures;
- scheduled and asynchronous processing;
- UI validations or guided workflows;
- manual work performed outside the application;
- undocumented integrations and side effects;
- operational recovery procedures;
- rarely used but business-critical exceptions; or
- the rationale for existing behaviour.

An OpenAPI operation proves that an interface exists. It does not necessarily prove what business capability it fulfils or under which conditions its use is correct.

## Discover the business system

The discovery process should construct a **Business Capability Register** before final MCP tool design.

For each capability, record:

- name and business purpose;
- users, roles, and accountable owner;
- initiating event or user goal;
- inputs and required preconditions;
- outputs and business outcomes;
- business rules and invariants;
- approval or confirmation requirements;
- state transitions;
- side effects, notifications, and downstream dependencies;
- data classification and tenant boundaries;
- failure, retry, reversal, and recovery behaviour;
- current implementation surfaces;
- supporting evidence and confidence; and
- proposed treatment in the MCP scope.

Evidence should be collected from more than the API specification. Useful sources include:

- source code and code-level authorization checks;
- database schema, constraints, triggers, and stored procedures;
- application screens and recorded walkthroughs;
- role and permission matrices;
- user guides and standard operating procedures;
- batch and scheduler inventories;
- integration catalogues;
- production support cases and incident reports;
- existing automated and manual tests;
- audit and compliance material; and
- interviews with developers, users, operations staff, and subject-matter experts.

Experienced legacy developers are important, but they should not be the only authority. Business rules often exist in operations, data, user practice, and organizational policy as well as application code.

**Where source code is unavailable** — for example, when the existing application belongs to a vendor or partner rather than the team doing the MCP work — a published, versioned REST API reference can still serve as strong OpenAPI-equivalent evidence, even though it is not itself a downloadable OpenAPI file. In that situation, evidence for everything code would normally reveal (roles, approval flows, operational procedure) has to come from the vendor's own admin/user guides and from the people who actually operate the application day to day, not from a repository. See the worked example below.

## Trace capabilities to implementation and decisions

The project should maintain a traceability matrix such as:

| Business capability | Current implementation | API evidence | Roles | MCP treatment | Confidence | Gaps |
|---|---|---|---|---|---|---|
| Find a customer | Web UI and customer service API | `GET /customers` | Adviser, manager | Read-only tool | High | None known |
| Prepare a refund | UI workflow and pricing rules | Multiple operations | Adviser | Draft/prepare tool | Medium | Some rules are UI-only |
| Approve a refund | Manager approval screen | `POST /refunds/{id}/approve` | Manager | Human-approved action | High | Confirmation design required |
| Daily reconciliation | Scheduled database job | None | System, operations | Not exposed initially | Medium | Job logic requires documentation |
| Export audit evidence | Manual report | None | Auditor | API gap | Low | New service required |

Every identified capability should have an explicit disposition:

- included;
- included with restrictions;
- deferred;
- excluded;
- replaced by a new capability; or
- unresolved pending evidence.

This register, rather than the generated tool count, is the basis for completeness claims.

## Design MCP tools around business intentions

A mechanical one-endpoint-to-one-tool conversion is useful for prototyping but weak as a final design principle.

MCP tools should describe meaningful actions that a user and reviewer can understand. For example:

- `find_customer`
- `explain_order_status`
- `prepare_refund_request`
- `submit_refund_for_approval`
- `retrieve_audit_evidence`

A business action may require orchestration of several API operations. Conversely, some low-level endpoints may be unsafe or meaningless when exposed independently.

Each MCP tool definition should specify:

- user-facing purpose;
- permitted roles and scopes;
- input and output schemas;
- required context and preconditions;
- authoritative system operations invoked;
- business-rule enforcement point;
- read/write classification;
- data sensitivity;
- side effects;
- confirmation or approval requirements;
- idempotency and retry behaviour;
- errors expressed in useful business language;
- audit events;
- rate or usage limits; and
- evaluation scenarios.

Tool descriptions guide the model, but prompts and descriptions are not security controls. Authorization and business rules must be enforced by deterministic application code and the authoritative underlying service.

## Classify the permitted level of agency

Every proposed capability should receive an exposure classification:

1. **Not exposed** — the capability remains unavailable through MCP.
2. **Resource/read-only context** — information can be retrieved but no action is performed.
3. **Read-only tool** — the model may execute a bounded query or calculation.
4. **Prepare or draft** — the model assembles a proposed transaction, document, or decision for review.
5. **Confirmed action** — the model can initiate the action only after explicit user confirmation.
6. **Approval-governed action** — execution requires an authorized organizational approver.
7. **Bounded automation** — the operation may run automatically within explicit limits, monitoring, and recovery controls.
8. **Human-only** — the model may explain or prepare evidence, but it cannot perform the decision or transaction.

This prevents "available through an API" from being confused with "appropriate for autonomous model use."

## Identity, authorization, and accountability

The MCP server must act for an identified user or system principal. It should not become a privileged shortcut around the existing application.

The design must establish:

- how the MCP client authenticates;
- how the end-user identity is resolved;
- how tenant, role, and scope restrictions are applied;
- whether authorization is delegated or service-based;
- how downstream credentials are obtained and isolated;
- how consequential tool calls are confirmed;
- how approvals and segregation of duties are preserved;
- how sensitive output is filtered;
- how tokens and secrets are protected;
- what is recorded in the audit trail; and
- how access is revoked.

The MCP server should use upstream APIs wherever possible so that established business and authorization controls remain authoritative. Direct database access should not be introduced merely to work around missing API operations; doing so can bypass validation, permissions, events, and audit behaviour.

Where an API gap exists, the preferred response is to design a proper application service operation with explicit ownership and tests, then expose that operation through MCP if appropriate.

## Guardrails and confirmation

Guardrails should be layered:

### Model-facing guidance

- accurate tool names and descriptions;
- bounded input schemas;
- clear instructions about when a tool should or should not be used;
- explicit statements about required confirmation; and
- responses that distinguish retrieved facts from model inference.

### Deterministic server controls

- authentication and authorization;
- schema and semantic validation;
- state-transition checks;
- data minimization;
- rate and transaction limits;
- idempotency controls;
- tenant isolation;
- confirmation tokens or approval records;
- audit logging; and
- safe error handling.

### Operational controls

- monitoring and alerts;
- feature flags and kill switches;
- staged rollout;
- rollback and reconciliation procedures;
- incident response; and
- periodic review of tools, permissions, and model behaviour.

A model instruction such as "only managers may approve refunds" is useful context, but the tool must still reject a non-manager deterministically.

## Evaluation and parity testing

Testing must demonstrate business behaviour, not merely successful API connectivity.

The evaluation suite should include:

- representative end-to-end user scenarios;
- every applicable role and permission boundary;
- valid and invalid state transitions;
- required confirmations and approvals;
- incomplete and ambiguous user requests;
- duplicate execution and retry cases;
- partial downstream failures;
- timeout and unavailable-service behaviour;
- cross-user and cross-tenant isolation attempts;
- prompt injection and malicious tool arguments;
- sensitive-data leakage attempts;
- audit-record verification;
- reversal or recovery behaviour; and
- comparison with the existing application for capabilities intended to remain equivalent.

Each scenario should identify:

- source requirement or evidence;
- initial state;
- user role;
- prompt or tool invocation;
- expected tool selection;
- expected arguments;
- expected application outcome;
- expected side effects;
- expected audit record; and
- acceptance result.

Human review remains necessary for business-critical scenarios, especially where legacy behaviour is poorly documented.

## Incremental delivery

The recommended release sequence is:

### Phase 1: Discovery and design

- agree project intent;
- build the capability and evidence register;
- verify the OpenAPI specification;
- identify API and knowledge gaps;
- define MCP exposure decisions; and
- approve the threat and authorization model.

### Phase 2: Read-only pilot

- expose a small number of high-value read operations;
- validate identity and tenant filtering;
- establish logs, monitoring, and evaluations; and
- test with a controlled user group.

### Phase 3: Draft and preparation tools

- allow the model to assemble reports, requests, or proposed actions;
- retain human review before submission; and
- compare prepared results with existing user workflows.

### Phase 4: Confirmed and approved actions

- introduce carefully selected write operations;
- enforce confirmations and organizational approvals;
- prove idempotency, audit, recovery, and failure handling; and
- expand only after observed evidence supports it.

### Phase 5: Bounded automation

- consider autonomous execution only for well-understood, reversible, monitored operations;
- define quantitative limits and escalation triggers; and
- retain an immediate suspension mechanism.

The legacy interface should remain available until capability parity and operational confidence are demonstrated for the intended scope. Incremental replacement reduces the risk of treating undocumented behaviour as expendable.

## Required development artefacts

Before implementation is considered ready for production, the project should maintain:

1. Intent and Scope Statement.
2. Business Capability Register.
3. Evidence Register with provenance and confidence.
4. Verified OpenAPI specification.
5. API and capability gap analysis.
6. Role and authorization matrix.
7. Business-rule and state-transition register.
8. MCP tool catalogue.
9. Capability-to-API-to-tool traceability matrix.
10. Exposure and human-control decisions.
11. Threat and misuse assessment.
12. Evaluation and parity test suite.
13. Audit, monitoring, and operational support design.
14. Phased rollout and rollback plan.
15. Unresolved-question and accepted-risk register.

These artefacts should be versioned alongside the MCP implementation because application behaviour, APIs, risks, and tool boundaries will continue to evolve.

## Definition of done

An MCP server for an existing application is not complete merely because it connects and its tools execute successfully. It is complete for its stated scope when:

- the intended users and outcomes are agreed;
- all in-scope business capabilities have an explicit disposition;
- every exposed tool traces to authoritative evidence and implementation;
- roles, tenant boundaries, and business rules are enforced in code;
- consequential actions use appropriate confirmation or approval;
- side effects, retries, failures, and recovery are understood;
- audit and operational monitoring are active;
- business and security evaluations pass;
- excluded and unresolved capabilities are visible; and
- accountable business, technical, security, and operational reviewers approve release.

## Questions for the development team

The first design workshop should answer:

1. What exact user and business outcome will the first MCP release support?
2. Is the MCP server an interface to the existing application, part of its modernization, or a foundation for new features?
3. Which capabilities must be equivalent to the existing application?
4. Which capabilities are explicitly out of scope?
5. What evidence exists beyond OpenAPI?
6. Which roles, approvals, and tenant boundaries apply?
7. Which operations are safe as read-only, draft, confirmed, approval-governed, or automated tools?
8. Where are business rules currently enforced?
9. Which missing APIs must be created rather than bypassed?
10. What tests would convince the application owner that existing behaviour has been preserved?
11. What tests would convince security and operations teams that AI access is controlled?
12. What is the rollback plan if an exposed capability behaves incorrectly?

## Relationship to the MCP Architecture and OpenAPI Discovery methods

This article is the supporting methodology for two of the Workbench's guided methods (see the method catalogue in `docs/design-notes/guided-workbench-methods-design.md`): **OpenAPI Discovery** and **MCP Architecture**. Several artefacts above map directly onto those methods' existing Standard Deliverables:

| This article | MCP Architecture / OpenAPI Discovery deliverable |
|---|---|
| Business Capability Register | Capability Inventory |
| Evidence Register | Evidence Map |
| MCP tool catalogue | Proposed Tools |
| Threat and misuse assessment | Dangerous-operation classification |
| Phased rollout and rollback plan | Implementation backlog/handoff |

Two things here are genuinely new detail, not currently spelled out in either method's terse deliverable list: the **Intent and Scope Statement** as an explicit first artefact, and the **8-level exposure classification** applied per capability rather than to the server as a whole.

A worked example applying this method to a real, source-inaccessible vendor product is available at `docs/design-notes/zadara-sandz-mcp-use-cases.md`.

## Conclusion

AI-assisted generation can substantially reduce the effort required to implement an MCP server. It cannot determine the intended business scope or reliably reconstruct an entire application from its API contract alone.

OpenAPI should be treated as a strong technical input within a larger evidence-led process. The project must begin with intent, discover business capabilities, trace them to authoritative behaviour, make explicit exposure decisions, preserve deterministic controls, and validate outcomes incrementally.

The governing principle is:

> **OpenAPI describes the callable surface. Capability discovery describes the business system. MCP exposes a deliberately governed subset of that system to AI.**
