# Governed Agent Creation (Workbench Method)

## Quick help

Use this Method when a student, junior developer, software house or enterprise team wants to turn a
real-world activity into a safe AI-accessible capability. It guides the team from the original need
through evidence, architecture, implementation, deployment, registration, evaluation and human
approval.

The Method does not require the agent to run inside KB Sandbox. KB Sandbox holds the governed
Project, evidence, requirements, decisions, evaluations and handoff artifacts. The implementation
may be created with Codex, Claude Code or another approved development environment, deployed on an
appropriate host, and connected back to KB Sandbox for testing and use through Ember.

**Lifecycle:**

`Need → Evidence → Capability contract → Architecture → Guardrails → Build → Deploy → Register → Test → Human review → Demonstrate or release`

## Goal

Produce a useful, portable and testable agent capability whose behavior is grounded in evidence,
whose consequential actions remain under appropriate human control, and whose limitations are
clearly documented.

The outcome is not merely working code. It is a reviewable evidence package showing what the agent
does, what it may access, what it must never do, how it fails, how it is tested, and who is
responsible for approving and operating it.

## When to use this Method

Use it for:

- A new conversational or task-oriented agent.
- An MCP server that exposes a business capability to Ember or another authorized client.
- A connector that retrieves data or performs actions through an existing REST API or webhook.
- A reusable skill for an outlet, department, application or external platform.
- A student or builder project that will be implemented outside KB Sandbox and returned for
  evaluation.
- Modernizing a bounded part of a legacy workflow without replacing the entire legacy system.

Examples include food ordering, appointment requests, helpdesk assistance, log and metric
collection, proposal preparation, inventory checks, delivery coordination and invoice processing.

## When not to use it

Do not use this Method merely to:

- Summarize documents or answer questions from an existing knowledge base.
- Automate a poorly understood process before its owner and rules are known.
- Bypass an existing system's permissions, terms, approvals or safety controls.
- Give an LLM direct access to payment credentials, personal addresses or production secrets.
- Treat an experimental demonstration as production-ready.
- Replace regulated professional judgment without the required qualified human authority.

## Core distinctions

### Agent

An agent uses a model, instructions, state and tools to pursue a bounded objective. Ember is one
possible interface to an agent capability, but a web, mobile, kiosk or messaging application may
use the same service.

### MCP server

An MCP server exposes well-described tools through the Model Context Protocol. It is not
automatically an agent: it supplies capabilities that Ember or another agent/client may discover
and call.

### Connector

A connector integrates with another system through its supported API, webhook, file exchange or
other documented interface. A connector may sit behind an MCP server or be invoked by ordinary
application code.

### Skill

A skill is a bounded set of instructions, domain rules and tool-use behavior for a particular task
or platform. Multiple outlet or platform skills may share one agent architecture.

### Client interface

The interface is how a person uses the capability. Ember may be the first interface, but the
architecture should not unnecessarily prevent another authorized application from using the same
documented contract.

## Requirements

### Required

- A named Project with an accountable Project lead.
- A clear problem, intended users and desired outcome.
- A real process owner or qualified subject-matter contact.
- Evidence describing the present process, business rules and constraints.
- An identified system or simulated service that will supply data or perform actions.
- A test environment or safe simulation.
- Defined authorization and human-approval boundaries.
- An implementation owner and a deployment/operations owner.
- Acceptance criteria and a test plan.

### Strongly recommended

- Representative user stories and failure scenarios.
- A data classification and privacy assessment.
- API documentation or an OpenAPI-equivalent capability contract.
- Threat model and abuse-case review.
- Cost, latency and reliability targets.
- Monitoring, audit and incident-response requirements.
- A rollback, disablement and deprecation plan.
- Independent reviewer or evaluator.

### Optional

- A dedicated user interface in addition to Ember.
- Images or other licensed media returned as structured artifact links.
- Multiple skills or connectors.
- Multiple language support.
- Real payments, delivery or external transactions—but only as separately governed later phases.

## Requirement states

Mark each requirement as:

- **Available** — supplied and usable.
- **Needed** — required before the applicable stage can proceed.
- **Optional** — beneficial but not required for the present scope.
- **Can be produced elsewhere** — created in an approved external tool and returned as an artifact.
- **Not applicable** — excluded with a recorded rationale.

Do not treat a missing requirement as permission for the model to invent it.

## Procedure

### 1. Define the outcome and boundary

Write a short problem statement. Identify the user, process owner, value, trigger and desired
result. State what is outside scope. Separate the first safe demonstration from possible later
production capability.

Ask:

- Who is the agent helping?
- What decision or action should become easier?
- What must remain a human responsibility?
- What would make the demonstration useful without using production data?

### 2. Map the current process

Describe how the task works today, including participants, inputs, decisions, approvals, systems,
outputs and common failures. Do not start with tools. Start with the real business process.

Record undocumented steps discovered from users or operators as evidence requiring confirmation.

### 3. Gather and classify evidence

Collect the authoritative materials needed to design the capability: policies, menus, price lists,
forms, API documentation, sample transactions, user stories, operating rules and constraints.

For every source, record ownership, date, version, sensitivity, permitted use and approval status.
Use synthetic or anonymized data for student and public demonstrations.

### 4. Define capabilities and user stories

Break the desired behavior into bounded capabilities. For each capability document:

- Actor and intent.
- Required input.
- Authoritative source or system.
- Structured output.
- Permission required.
- Possible failure states.
- Whether the operation is read-only or consequential.
- Whether human confirmation is required.

Avoid one broad tool such as `do_everything`. Prefer small, reviewable operations.

### 5. Create the capability contract

Write an OpenAPI specification, MCP tool specification or equivalent structured contract before
implementation. Define schemas, validation, error responses, idempotency and authorization. Tool
descriptions must state important side effects and confirmation requirements.

The contract should be usable independently of one chat prompt or user interface.

### 6. Design the architecture

Show the user, client interface, KB Sandbox Project, Ember or other agent, gateway, MCP server or
API, external systems, persistent state and human gates.

Document:

- Trust boundaries and identity flow.
- Project and user authorization.
- Secrets and credential storage.
- Data movement and retention.
- Model inputs and outputs.
- Human confirmation controls.
- Audit, monitoring and disablement.
- Which operations are deterministic code and which require model judgment.

Do not place secrets or full sensitive records in ordinary model prompts.

### 7. Define guardrails and failure behavior

For each operation decide:

- What the model may propose.
- What only deterministic code may calculate or validate.
- What only a human may approve.
- What happens when evidence is absent, stale or contradictory.
- How duplicate requests are prevented.
- How timeouts, unavailable systems and partial failures are reported.
- How unsafe or unauthorized requests are refused.

Consequential operations should use a trusted confirmation interface rather than asking the model
to claim that the user confirmed.

### 8. Plan the build and evaluation

Create an implementation handoff containing the contract, architecture, acceptance criteria,
security requirements, test cases, deployment constraints and known exclusions. Select the build
environment and assign reviewers.

Prepare tests before or alongside implementation, including happy path, permission denial,
invalid input, stale data, duplicate calls, unavailable dependency and cross-user isolation.

### 9. Build outside or inside the approved environment

Use an approved coding environment to implement the agent, MCP server, connector, skill and any
client interface. Keep the implementation traceable to the agreed contract. Return design changes,
test results and discovered gaps to the KB Sandbox Project.

AI-generated code must be reviewed and tested. A plausible demonstration is not evidence of
correctness.

### 10. Deploy to a controlled environment

Deploy first to a sandbox or demonstration environment with test credentials and synthetic data.
Configure health checks, persistent state where required, secret storage, logs, metrics and a
reliable disablement mechanism.

Document the service URL and operational ownership, but never place credentials in Wiki content,
chat, screenshots or ordinary artifacts.

### 11. Register the capability with KB Sandbox

Register the deployed agent or MCP server using the applicable KB Sandbox administrative and
security workflow. Associate it with the correct Project and version. Grant only the required
tools and scopes.

Registration does not equal approval. The registered version must still pass its evaluation and
human review before broader use.

### 12. Test through Ember and an independent client

Where applicable, test the capability through Ember from the bound Project. Also test it through
another authorized client or a contract-level test harness to prove the service is portable and
not dependent on one prompt.

Capture structured evidence for:

- Correctness and completion.
- Authorization and isolation.
- Human confirmation.
- Failure and recovery.
- Latency, cost and reliability.
- Logs and audit trace.
- User and operator experience.

### 13. Evaluate and correct

Compare results with the acceptance criteria across repeated runs. Record failures honestly. Fix
material defects and rerun affected tests. Distinguish code defects, contract defects, evidence
gaps, model variability and operational failures.

### 14. Obtain human approval

The named authority reviews the evidence, limitations, residual risks and operational ownership.
The outcome should be one of:

- Demonstration approved.
- Sandbox approved with restrictions.
- Changes required.
- Rejected.
- Production review required as a separate phase.

### 15. Demonstrate, hand over and learn

Demonstrate the complete journey, not only the model response. Show evidence, architecture,
confirmation, failure handling, monitoring and operator responsibilities. Produce an operations
handover and record lessons for the next Method or version.

## Standard deliverables

1. Problem statement and scope.
2. Stakeholder and process map.
3. Evidence register and data-classification summary.
4. User stories and capability inventory.
5. OpenAPI-equivalent contract and/or MCP tool specification.
6. Architecture and trust-boundary diagram.
7. Identity, permissions and human-approval model.
8. Threat model, guardrails and failure policy.
9. Implementation handoff and repository/deployment reference.
10. Test plan and automated/human test evidence.
11. Evaluation report with defects, limitations, cost and reliability observations.
12. Human approval decision.
13. Operations and support handover.
14. Demonstration summary and next-phase roadmap.

## Evaluation criteria

| Area | What good looks like |
|---|---|
| User and operator value | Solves a clear problem and fits the real process |
| Evidence | Sources are authoritative, current, classified and traceable |
| Contract | Inputs, outputs, errors and side effects are explicit |
| Architecture | Boundaries, identity, state and data movement are understandable |
| Security and privacy | Least privilege, protected secrets, isolation and safe retention |
| Human control | Consequential actions require genuine trusted confirmation |
| Reliability | Idempotency, persistence, failure handling and repeatable testing |
| Portability | Usable through Ember and another authorized client where applicable |
| Maintainability | Versioned, documented, observable and owned |
| Learning | Gaps and failures are recorded rather than hidden |

## Student and hackathon guardrails

- Use school-approved accounts, supervision and participation rules.
- Use synthetic or organizer-approved demonstration data.
- Do not use real payment credentials, private customer addresses or production merchant secrets.
- Do not scan or connect to third-party systems without written permission.
- Use licensed, team-created or properly attributed images.
- Treat allergens, food safety and physical operations as human/operator responsibilities.
- Do not automatically place or cancel a real order during the competition.
- Provide a route to report security, safety or conduct concerns.
- Publish clear intellectual-property and licensing terms before work begins.

## Worked example: Filipino street-food ordering capability

### Initial safe scope

A team designs a simulated fishball-stand capability. A customer can browse an authoritative menu,
check availability, prepare a quotation, review pay-upon-delivery terms, explicitly confirm a test
order, and check or cancel its simulated status.

### Possible tools

- `list_outlets`
- `browse_menu`
- `check_availability`
- `prepare_quotation`
- `request_order_approval`
- `place_order`
- `get_order_status`
- `cancel_order`

The menu, prices, availability and total come from deterministic server data. The model may help
the user choose, but it must not invent menu items, prices or availability. Placement and
cancellation require separate trusted human confirmation and idempotent server operations.

### Student implementation journey

1. Create a team Project and select this Method.
2. Gather approved street-food menu, operating and safety evidence.
3. Produce the capability contract, architecture, guardrails, evaluation plan and handoff.
4. Build the agent/MCP server using an approved external coding environment.
5. Deploy it to the designated Sandz or other approved demonstration infrastructure.
6. Register the team's own service with KB Sandbox; do not reuse the showcase MCP registration.
7. Test through Ember and, optionally, a student-built web/mobile/kiosk application.
8. Submit evidence and demonstrate both successful and failed/denied journeys.

### Later phases

Only after separate review might the solution add real merchant integration, delivery addresses,
inventory, payment handoff, delivery-provider integration or invoicing. Each introduces new
evidence, contracts, permissions, operational ownership and risk controls.

## Common failure modes

- Starting to code before confirming the real process and source of truth.
- Treating an MCP server as if it were automatically a complete agent or user experience.
- Giving one tool excessive authority.
- Letting prompt text supply identity, roles, prices or confirmation.
- Copying credentials or personal information into model context.
- Demonstrating only the happy path.
- Using in-memory state for a multi-request production workflow without understanding hosting
  behavior.
- Registering a service and assuming it is therefore approved.
- Measuring one successful run instead of reliability and variance.
- Hiding gaps to make the demonstration appear complete.

## Current implementation boundary

KB Sandbox supports governed Projects, knowledge and evidence, Workbench Methods, Ember
conversations, evaluations, human review, and evolving agent/MCP registration and gateway
capabilities. The exact registration and invocation workflow must follow the currently deployed
product and its capability/navigation catalogue.

This Method is procedural guidance. It is not currently an automatically executed multi-agent
graph, and it must not imply that KB Sandbox writes, deploys or approves code autonomously.

## Recommended next action

Create or open the relevant Project, ask Ember to apply **Governed Agent Creation**, and begin with
the problem statement, process owner and available evidence. Do not begin implementation until the
capability boundary and first safe test scope are agreed.

