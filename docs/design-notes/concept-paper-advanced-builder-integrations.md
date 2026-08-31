# Advanced Builder Integrations: Connectors, APIs, Webhooks, MCP Servers and External Agents

**Document type:** Concept paper and candidate Advanced Builders Programme Wiki source  
**Status:** Proposed direction; not a statement that every capability is implemented  
**Audience:** KB Sandbox product team, Builders Programme partners, software houses, solution architects, reviewers and advanced builders

## Executive summary

Enterprise AI becomes useful when it can work with the systems an organization already relies on. Those systems expose information and operations in different ways: REST APIs, webhooks, SDKs, file exports, databases and increasingly MCP servers.

KB Sandbox should not attempt to build and own hundreds of integrations itself. Its stronger role is to become a governed **integration specification, evaluation and assurance workbench** for a regional builder ecosystem.

A builder uses KB Sandbox to understand the business intent, discover the existing application, document its capabilities and controls, design the appropriate integration, and produce an evidence-backed implementation specification. The builder then implements and hosts the connector or MCP server outside KB Sandbox, registers its versioned contract, submits it to evaluation, and makes approved capabilities available to Ember or another authorized host.

The central principle is:

> **REST APIs and webhooks connect systems. MCP makes selected capabilities understandable and callable by AI. External agents add specialized reasoning only when Ember's own bounded orchestration is insufficient. KB Sandbox governs the complete lifecycle.**

This model turns the Builders Programme into a distributed integration factory without turning KB Sandbox into an ungoverned plugin marketplace or a general-purpose integration runtime.

## Why this matters

Large enterprise AI platforms differentiate themselves partly through large connector catalogues. Glean, for example, publicly describes connectors that retrieve content, permissions and activity data, custom connectors through an Indexing API/SDK, OpenAPI-based actions, and remote MCP servers callable by its assistant and agents.

That market pattern is relevant, but KB Sandbox does not need to imitate the catalogue-building strategy directly. A regional platform serving SMEs, consulting companies and specialist industries can instead provide:

- repeatable discovery and architecture Methods;
- governed specifications;
- reusable implementation patterns;
- security and permission tests;
- certification evidence;
- Project-specific availability;
- portable contracts; and
- a community of builders able to implement the integrations customers actually need.

The resulting advantage is not the number of connectors listed on a marketing page. It is the ability to create a trustworthy new integration quickly, explain exactly what it can do, and prove that its permissions and failure behavior are appropriate.

## Five concepts that must remain distinct

### 1. REST API

A REST API is a conventional application interface used to request information or perform an operation. It normally remains the authoritative interface to an existing business system.

Examples:

- retrieve an order;
- create a support ticket;
- calculate a price;
- list available delivery slots; or
- submit an invoice.

An MCP server will commonly call one or more REST APIs underneath. MCP does not make those APIs obsolete.

### 2. Webhook or event source

A webhook notifies another service when something changes. It supports event-driven work rather than waiting for a user or agent to poll repeatedly.

Examples:

- an order was accepted;
- a delivery was dispatched;
- an invoice failed validation;
- a document was revised;
- a support incident exceeded its service target; or
- an external evaluation completed.

Webhook input should be authenticated, validated, deduplicated, timestamped and stored as a structured event. It should not be inserted directly into an AI prompt.

### 3. Knowledge connector

A knowledge connector synchronizes external content and its governing metadata into an approved knowledge lifecycle.

It may use REST APIs, webhooks, an SDK, scheduled exports or another supported source mechanism. A robust connector must consider:

- stable source identity;
- version and modification time;
- content extraction;
- provenance;
- source permissions;
- deletions and revocations;
- incremental synchronization;
- retry and reconciliation behavior; and
- sensitivity and eligible AI-processing environments.

Its output is governed knowledge. It is not automatically an executable action.

### 4. MCP server and tools

An MCP server exposes selected data and operations as tools an AI host can discover and call.

Examples:

- `search_orders`;
- `check_delivery_status`;
- `prepare_customer_quote`;
- `create_support_ticket`; or
- `submit_lunch_order`.

Good MCP tools represent bounded business capabilities rather than mirroring every low-level CRUD endpoint. The MCP server normally uses the existing application's REST API, SDK or other supported interface so that upstream validation and business rules remain authoritative.

### 5. External agent

An external agent adds its own reasoning loop, planning, state, recovery or multi-step orchestration. It may use one or more MCP servers as its tools.

Examples include:

- a proposal agent that researches requirements, checks product fit and drafts a governed response;
- an 8D investigation agent coordinating evidence gathering and verification;
- an invoice-processing agent handling extraction, exception routing and reconciliation; or
- a support-escalation agent combining customer history, diagnostic evidence and escalation rules.

An agent should not be created merely because the builder can create one. If Ember can safely orchestrate a few bounded tools, Ember should remain the agent.

## Reference architecture

### Bounded tool called directly by Ember

```text
User
  |
  v
Ember in an authorized KB Sandbox Project
  |
  | MCP tool call
  v
Builder-hosted MCP server
  |
  | REST API / SDK
  v
External business system
  |
  | webhook event, when applicable
  v
Validated event receiver / synchronization service
```

### Specialized external agent

```text
User
  |
  v
Ember or another approved host
  |
  | invokes a registered agent capability
  v
Builder-hosted external agent
  |
  +-- MCP tool A --> business system
  +-- MCP tool B --> another system
  +-- deterministic checks and durable state
  +-- human approval gate
  |
  v
Structured result, evidence and execution trace
```

The second pattern should be used only when the specialized agent owns meaningful reasoning or workflow state that does not belong inside Ember.

## The Builders Programme lifecycle

### Stage 1 — establish business intent

Start with the outcome, users and authority boundary rather than with an API catalogue.

Questions include:

- What should the user be able to accomplish?
- Is this knowledge retrieval, a live read, a write action or a multi-step process?
- Which roles may request, approve and execute it?
- What evidence must be preserved?
- What must remain impossible?
- What is the impact of failure, duplication or delay?

### Stage 2 — discover the existing system

Use the applicable Workbench Methods to inspect:

- user workflows and screens;
- roles and decision rights;
- reports, notifications and background jobs;
- the published API and OpenAPI specification;
- webhooks and event contracts;
- business rules not represented in the API;
- access controls and delegated authorization;
- operational failure and retry behavior; and
- features known to experienced users but absent from technical documentation.

An OpenAPI specification is valuable evidence, but it is not a complete model of the application.

### Stage 3 — choose the integration pattern

| Need | Preferred pattern |
|---|---|
| Periodically make external documents searchable | Knowledge connector |
| React when an external record changes | Webhook/event integration |
| Read live information on demand | MCP read tool backed by REST/SDK |
| Perform one bounded business operation | MCP write tool with appropriate confirmation |
| Coordinate several deterministic API operations | MCP server exposing a small coherent tool set |
| Plan, reason, retry or preserve durable multi-step state | External agent using MCP tools |
| Answer from already governed Project knowledge | Ember and existing retrieval; no new integration |

Many real solutions use more than one pattern. For example, a call-center Project may use a knowledge connector for approved product guidance, an MCP tool for live ticket status and a webhook for escalation events.

### Stage 4 — produce the evidence-backed specification

The specification should define:

- intended users and outcomes;
- system-of-record ownership;
- source APIs, webhooks and SDKs;
- selected business-level tools;
- input and structured-output schemas;
- identity, authentication and token flow;
- user-delegated versus service identity;
- authorization and Project availability;
- data classification and AI-processing constraints;
- read/write/consequential-action classification;
- confirmation and human-approval gates;
- idempotency, pagination, rate limits and timeouts;
- webhook validation, replay prevention and reconciliation;
- failure states and safe retry behavior;
- logging, audit and provenance requirements;
- test cases and acceptance thresholds;
- deployment boundary and operator; and
- ownership, support and versioning responsibilities.

### Stage 5 — external implementation

The builder implements the connector, MCP server or agent in an appropriate development environment. It may be hosted on Sandz infrastructure, customer infrastructure or another approved environment.

KB Sandbox remains the specification and assurance workbench. Source code does not need to run inside KB Sandbox merely to be governed by it.

### Stage 6 — register the implementation

The builder submits a versioned registration containing the relevant contract and deployment declaration.

For an MCP server this includes:

- server identity and version;
- operator and technical owner;
- endpoint and supported transport;
- authentication method and required scopes;
- tool catalogue and schemas;
- read/write/risk classification per tool;
- Project availability policy;
- declared upstream dependencies;
- deployment and data-residency information;
- logging and support contact;
- test evidence; and
- change history.

For an external agent, also include:

- purpose and boundary;
- model/provider policy;
- prompt, graph or agent-specification version;
- tools and permissions;
- state and memory behavior;
- iteration and cost limits;
- verifier and human-gate behavior;
- evaluation dataset and results; and
- termination and recovery rules.

Registration does not mean approval, hosting or trust. Those states must remain visibly separate.

### Stage 7 — evaluate and certify

Evaluation should cover more than successful tool calls:

- functional correctness;
- preservation of business rules;
- identity and authorization behavior;
- denied-access cases;
- input validation;
- prompt-injection and untrusted-content handling;
- write confirmation and approval gates;
- idempotency and duplicate prevention;
- webhook forgery and replay handling;
- stale or deleted-data behavior;
- latency, rate limiting and cost;
- partial failure and recovery;
- observability and audit completeness; and
- compatibility with the intended Ember/host workflow.

A practical certification ladder could be:

1. **Registered** — contract and ownership recorded.
2. **Connectivity verified** — endpoint and authentication work in a controlled environment.
3. **Functionally evaluated** — declared tools pass their test cases.
4. **Security reviewed** — access, secrets and failure controls reviewed.
5. **Customer accepted** — customer/domain authority accepts the intended use.
6. **Production approved** — version may be exposed in specified Projects.

Each new material version should be evaluated again according to its change risk.

### Stage 8 — expose approved capabilities

Availability should be deliberate and Project-specific.

For example:

- the Order Food Project may access approved outlet and delivery tools;
- the Sales Proposal Project may access product-fit and proposal tools;
- the Call Center Project may access ticket and diagnostic tools; and
- the Finance Project may access invoice tools under stricter approval controls.

Ember should discover only the tools permitted for the current user, Project and AI-processing environment. A tool being registered elsewhere in the instance does not make it callable everywhere.

### Stage 9 — operate, observe and improve

Production operation should record:

- tool/agent version;
- acting user or system principal;
- Project context;
- requested capability;
- approval or confirmation event;
- start/end time and outcome;
- external correlation identifier;
- safe error category;
- evidence or resulting artifact reference; and
- enough information for investigation without indiscriminately storing sensitive payloads.

Failures, user feedback and changed upstream APIs should feed a reviewed new version rather than silently changing a certified contract.

## Identity and permission principles

### Prefer delegated user identity

Where the external system supports it, the MCP server should act using the requesting user's delegated identity. The external system then remains authoritative for the user's permissions.

Service identities may be necessary for background synchronization and webhooks, but they require narrow scopes, secret rotation and explicit rules for mapping results back to authorized KB Sandbox users and Projects.

### Never turn MCP into a privileged shortcut

An MCP tool must not expose data or actions that the same user would be forbidden to access in the underlying application. KB Sandbox Project membership is an additional availability condition, not a replacement for upstream authorization.

### Treat read and write differently

Classify tools at least as:

- read-only;
- reversible write;
- consequential or externally binding write; and
- administrative/security operation.

Consequential operations should require structured confirmation, the correct human authority, or both. Administrative and security operations may be inappropriate for Ember entirely.

## Knowledge synchronization requirements

A trustworthy connector must synchronize lifecycle and permissions, not just text.

It should answer:

- How is an external record mapped to one stable knowledge source?
- How are revisions represented as new versions?
- How are deletions, retention and legal holds handled?
- How quickly do upstream permission changes take effect?
- Can a user discover a title or count for content they cannot read?
- How is a failed or partial synchronization reconciled?
- Which system remains authoritative?
- What happens when the connector is disabled?

For sensitive systems, importing less may be safer. Live MCP retrieval can sometimes preserve upstream authorization and data residency better than copying an entire dataset into another index.

## Webhook requirements

Every webhook receiver should provide:

- TLS and authenticated sender verification;
- signature validation where supported;
- timestamp tolerance and replay prevention;
- schema validation;
- idempotency/deduplication keys;
- safe queueing and retry;
- dead-letter or investigation handling;
- ordering assumptions;
- an immutable receipt record; and
- reconciliation against the upstream API.

Webhook events may update synchronization state, create a governed activity, trigger a deterministic workflow or notify an authorized user. They must not autonomously approve knowledge or execute consequential actions merely because an event arrived.

## Tool-design guidance

Prefer meaningful business tools:

- `prepare_customer_quote`
- `check_invoice_status`
- `create_support_case`
- `list_available_meal_options`

Avoid exposing a large set of low-level endpoints such as `get_row`, `update_field` and `delete_record` unless the intended agent genuinely needs them and their combined behavior has been evaluated.

Each tool should have:

- one clear purpose;
- a small typed input;
- structured output;
- explicit error states;
- bounded response size;
- predictable side effects;
- an idempotency strategy for writes; and
- a description that tells the model when **not** to call it.

## When a separate agent is justified

Create a specialized external agent when at least one of the following is true:

- work requires planning across several tools;
- independent verification materially improves safety or quality;
- the workflow needs durable state across events or long-running steps;
- controlled retries and recovery belong to the domain workflow;
- a specialist model or private processing environment is required;
- the agent is intended to be portable across multiple hosts; or
- domain ownership should remain with an external operator.

Do not create a separate agent merely to rename one MCP call, add a decorative persona, or reproduce orchestration Ember already performs safely.

## Portability

Builder-created MCP servers should be usable beyond KB Sandbox where commercially and technically appropriate.

An approved server might be called by:

- Ember;
- a customer-specific application;
- another enterprise assistant;
- a developer tool;
- a food or delivery aggregator; or
- a builder's own external agent.

KB Sandbox-specific governance metadata may travel separately from the portable MCP contract. Portability reduces customer lock-in and increases the value of the builder's work while allowing each host to perform its own authorization and acceptance.

## Example opportunities

### Food, ordering and delivery

- retrieve outlet menus and availability;
- place or amend an order;
- coordinate delivery;
- receive accepted/dispatched/delivered webhooks;
- handle customer confirmation and payment boundaries; and
- expose approved tools to Ember in a client-specific Order Food Project.

### Sales and proposals

- retrieve approved product capabilities;
- check live stock or service availability;
- apply customer-specific commercial rules;
- prepare a proposal draft;
- route pricing for approval; and
- preserve the evidence used in the recommendation.

### Call-center support

- synchronize approved procedures and known issues;
- retrieve live customer or ticket status;
- create and update support cases;
- receive SLA/escalation events; and
- route consequential actions to a human authority.

### Invoice creation and processing

- create an invoice from approved order data;
- retrieve invoice status;
- receive payment or exception webhooks;
- validate structured fields deterministically;
- route discrepancies for human review; and
- preserve an audit trail.

### Logs and metrics collection

- connect to supported monitoring APIs;
- retrieve bounded diagnostic windows;
- normalize evidence from several platforms;
- preserve correlation identifiers;
- calculate deterministic statistics; and
- make reviewed evidence available to an investigation Method or external agent.

## Builders Programme roles

| Participant | Primary responsibility |
|---|---|
| Customer/domain owner | Business intent, allowed use, authoritative rules and acceptance |
| KB Sandbox Project owner | Project scope, membership, knowledge and approval authorities |
| Builder/software house | Discovery, specification, implementation, tests, deployment declaration and maintenance |
| Sandz/infrastructure partner | Approved hosting, networking, runtime operations and regional deployment support |
| KB Sandbox curator/reviewer | Evidence quality, Method compliance and certification record |
| Security/privacy authority | Identity, permissions, sensitivity, data flow and risk acceptance |
| End user | Confirmed actions, feedback and observed business outcome |

## Commercial possibilities

The model supports several arrangements without forcing KB Sandbox to take a commission on every transaction:

- customer-funded bespoke implementation;
- reusable connector or MCP-server licence;
- builder maintenance subscription;
- managed hosting and operations through Sandz;
- certification/evaluation service;
- training and hackathon programmes;
- shared open-source reference connectors; and
- co-selling or referral arrangements where appropriate.

The strategic value is the builder community itself. Students, junior developers, solo founders and regional software houses learn to specify requirements, preserve business controls, build with AI coding tools, and demonstrate evidence rather than merely generating code.

## Recommended KB Sandbox product capabilities

This concept implies a future capability set. It does not claim they all exist today.

1. Versioned connector/MCP/agent registration.
2. OpenAPI, webhook and MCP contract artifacts.
3. Project-level availability and user/role policy.
4. Secret references without storing secrets in prompts or documents.
5. Connectivity and contract test runs.
6. Security and permission evaluation templates.
7. Certification states with named human approvals.
8. Ember tool discovery limited by Project and user.
9. Confirmation and approval gates for writes.
10. Invocation traces and safe operational metrics.
11. Version-change and re-certification workflow.
12. Exportable specifications for other MCP hosts and agent frameworks.

## Phased approach

### Phase A — specification and registration

- extend existing discovery and MCP Architecture Methods;
- define the integration/connector registration record;
- accept versioned OpenAPI, webhook and MCP specifications;
- record deployment, owner and intended Projects; and
- keep execution external.

### Phase B — evaluation and certification

- add connectivity tests;
- add contract and denial tests;
- add human approval states;
- preserve evidence and results by version; and
- publish a clear certification status.

### Phase C — Ember read tools

- connect approved remote MCP servers;
- expose only Project-authorized read tools;
- propagate user identity where possible;
- produce structured citations/results; and
- log invocation outcomes.

### Phase D — controlled writes and events

- introduce confirmation and authority gates;
- support authenticated webhook receivers or approved event adapters;
- add idempotency, replay and reconciliation controls; and
- pilot reversible writes before consequential actions.

### Phase C/D implementation note (2026-08-31, OR-027)

Phases C and D shipped together as one pass ("Agent Gateway, Milestone 1"), not sequentially as originally proposed above. Reason: the concrete dogfooding exercise driving this work (order lunch through a registered MCP server) is meaningless without a write step — a read-only Gateway that can look up a menu but never place the order doesn't exercise anything Ember couldn't already do by other means. Confirmation gates, spending limits and an audit trail (Phase D's own list) were therefore built alongside read-tool discovery rather than deferred to a separate pass. Webhook receivers and event adapters remain genuinely unbuilt — no consumer for them exists yet, same reasoning as Phase A's exclusion of webhook receivers.

Also unbuilt from this list: "propagate user identity where possible" (every Gateway call today uses the integration's own configured `auth_method`, never the calling KBS user's own identity delegated through) and "produce structured citations" (a Gateway tool result is returned to the model like any other tool result, not yet folded into the citation/provenance machinery `search_wiki`/`search_project_knowledge` results get). Both are real gaps for a future pass, not silently assumed solved.

### Phase E — specialized external agents

- register agent specifications and graphs;
- evaluate state, tools, iterations and verifier behavior;
- expose approved agent capabilities to selected Projects; and
- maintain a clear boundary between Ember, external agents and deterministic services.

### Phase A implementation note (2026-08-31, OR-026)

Phase A shipped by generalizing the existing External Agent Registry (OR-019) rather than building a second, parallel registry. Two decisions made during that pass are recorded here so a future reader doesn't re-litigate them:

- **Only 2 of the 5 concepts are registrable so far: external agent and MCP server.** Knowledge connectors and webhook receivers were deliberately excluded from this pass. A connector's lifecycle (batch sync correctness, permission propagation) doesn't share the "can Ember call this tool" shape that agents and MCP servers do, and webhook receivers are Phase D's concern — nothing exists yet to receive into. Registering either now would be inert scaffolding with no near-term consumer, unlike MCP servers, which Phase C makes real. REST APIs are never independently registered — they're what an MCP server or connector uses underneath, consistent with this paper's own framing.
- **The implemented certification ladder was kept as-is, not renamed to match this paper's proposed 6-stage ladder (Stage 7 above).** The live ladder — `experimental` → `sandbox_tested` → `security_reviewed` → `outlet_accepted` → `production_approved`, plus `deprecated`/`suspended` — predates this paper (OR-019) and matches the original Sandz pitch doc's own language verbatim. Mapped against this paper's proposal: `security_reviewed` and `production_approved` are exact matches; `experimental`/`sandbox_tested` together cover "Registered" and "Connectivity verified"/"Functionally evaluated" as earlier, self-serve milestones; `outlet_accepted` covers "Customer accepted." Close enough in spirit that renaming a proven, tested ladder for cosmetic alignment wasn't worth the churn.

## Non-goals

- Replacing every customer's integration platform.
- Hosting every builder's code inside KB Sandbox.
- Automatically turning every OpenAPI operation into an MCP tool.
- Treating registration as certification.
- Allowing Ember to discover every tool in the instance.
- Bypassing an external system's permissions.
- Sending webhook bodies directly to an LLM.
- Building a separate agent where a bounded tool is sufficient.
- Promising functional completeness without a defined intended scope.

## Relationship to existing Methods and guidance

This concept should build on, rather than duplicate:

- **OpenAPI Discovery** — establish and validate the callable API contract;
- **Legacy Feature Introduction** — understand existing workflows, roles and business behavior before change;
- **AI-Accessible Application Discovery** — catalogue AI-relevant capabilities and gaps beyond the API;
- **MCP Architecture: Evidence-Led Development for an Existing Application** — define intended scope, tool design, controls and evaluation;
- **Agent Design** — use only when a specialized external agent is genuinely required; and
- **Agent Harnesses** — document runtime, state, tools, guardrails, observability and human gates.

A future Advanced Builder Wiki should link these Methods into one guided sequence rather than reproduce their complete instructions.

## Proposed Advanced Builder Wiki summary

**Suggested title:** Building Governed Enterprise Integrations for Ember  
**Suggested category:** Workbench Handbook — Advanced Builders  
**Suggested slug:** `building-governed-enterprise-integrations-for-ember`  
**Suggested status:** Draft -> builder/security review -> approved  

The Wiki version should help a builder answer five questions:

1. Am I building a knowledge connector, event integration, MCP server or external agent?
2. Which existing system interface remains authoritative?
3. How will user identity, permissions and Project scope be preserved?
4. What evidence is required before KB Sandbox can approve the capability?
5. Should Ember call the tools directly, or is a separate agent genuinely justified?

## Conclusion

The Builders Programme can give KB Sandbox an integration strategy comparable in purpose—but different in execution—to the large connector catalogues of established enterprise AI platforms.

KB Sandbox does not need to own every connector. It needs to make integration development repeatable, permission-aware, testable and portable. Builders contribute domain knowledge and implementation capacity; Sandz or another approved operator provides deployment; customers retain control of their systems and decisions; and Ember receives only the capabilities approved for the current user and Project.

That is a scalable regional model:

> **Discover with evidence. Specify the boundary. Build externally. Register the contract. Test the permissions. Approve the version. Expose only what the Project needs.**

## External market references

- [Glean connectors and custom integration options](https://www.glean.com/platform/connectors)
- [Glean data-source and connector model](https://docs.glean.com/get-started/setup/connect-data-sources)
- [Glean REST and Indexing APIs](https://docs.glean.com/connectors/custom/glean-apis)
- [Glean remote MCP server integration](https://docs.glean.com/administration/actions/connect-remote-mcp-servers-to-glean)
