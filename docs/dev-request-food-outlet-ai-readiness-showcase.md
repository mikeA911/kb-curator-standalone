# Dev Request: Food Outlet AI-Readiness Showcase

**From:** Mike Aguilar, 2026-08-27
**Status:** Dev request received; Phase 1 project placeholder created. Phases 2/3, the Agent
Registry, and the Agent Gateway are NOT built -- this doc records the request as given.
**Related:** [OrderLunch Agent architecture notes](design-notes/showcase-project-library-and-methods.md#7-orderlunch-agent--pending-architecture-fyi-only-not-yet-implemented)
(the earlier, narrower FYI this project supersedes/broadens)

## Purpose

Broader than building one Lunch Agent: demonstrate that KB Sandbox can guide students and local
software houses through a governed process for converting an ordinary business into an
AI-accessible service.

```
Food outlet
    v
KB Sandbox Methods and architecture
    v
Student/local software builder
    v
Restaurant API + MCP server + agent skill
    v
Evaluation and approval in KB Sandbox
    v
Deployment on Sandz infrastructure
    v
Use by Ember or another ordering application
```

## Recommended project phases

### Phase 1 -- Showcase

Use a cooperative food outlet, school canteen, or simulated restaurant. Deliver:

- Business capability inventory
- Menu and ordering requirements
- OpenAPI specification
- MCP architecture
- Transaction and security guardrails
- One externally developed Lunch Agent
- One outlet skill
- Test menu and sandbox orders
- KB Sandbox evaluation
- Sandz-hosted demonstration
- Structured order preview and confirmation
- Logs, metrics, and evidence package

No live payment should be necessary initially. The showcase can stop after producing a confirmed
test order and restaurant-side receipt.

### Phase 2 -- Design-partner outlet

Connect to a real outlet's POS or order-management system. Add:

- Real menu and availability
- Branch selection
- Live order submission
- Customer authentication
- Payment or payment handoff
- Refund and cancellation rules
- Operational support
- Production monitoring

### Phase 3 -- Builder ecosystem

Students and local software companies can create additional outlet connectors and skills using the
approved Method, templates, and test suite. Only evaluated versions should be listed as approved or
production-ready.

## Roles

| Participant | Responsibility |
|---|---|
| KB Sandbox | Method, architecture guidance, evidence, evaluation, certification, and agent registry |
| Builder | MCP server, outlet skill, tests, documentation, and maintenance |
| Sandz | Hosting, storage, networking, monitoring, and infrastructure support |
| Food outlet | Menu, business rules, system access, merchant authorization, and acceptance |
| Ordering application | User experience, customer relationship, and invocation of the approved service |
| Human approver | Production release and transactional-risk acceptance |

Students should initially work only with test data and sandbox credentials. A professional reviewer
should approve security-sensitive code before it receives production credentials.

## Keep the commercial components separate

A customer quotation should distinguish:

1. Readiness and architecture -- KB Sandbox-led professional service.
2. Agent or connector development -- paid to the builder.
3. KB Sandbox governance licence -- recurring platform revenue.
4. Sandz infrastructure -- separately priced hosting.
5. Maintenance and support -- recurring builder or managed-service revenue.
6. Payment and delivery charges -- remain with the merchant or ordering platform.

Avoid taking a percentage of every food order initially -- that introduces disputes around refunds,
tax, delivery fees, promotions, and merchant reconciliation. Fixed licences and support fees are
easier to understand.

## Recommended builder compensation

Two models, depending on who initiated the work.

**Customer-commissioned agent** -- a food outlet pays for a specific integration:

- Builder receives 60-75% of the development fee.
- KB Sandbox receives 15-25% for architecture, governance, and evaluation.
- Referring or delivery partner receives 10-20%, where applicable.
- Sandz infrastructure is quoted separately.
- Builder receives an agreed maintenance fee.

The percentages apply only to the shared implementation fee -- not Sandz infrastructure or KB
Sandbox subscriptions.

**Builder-created reusable skill** -- a student or software house creates a reusable connector at
its own initiative. Suggested recurring licence allocation:

- 70% to the agent/skill owner
- 20% to KB Sandbox
- 10% reserve for payment processing, certification support, or channel referral

If KB Sandbox provides sales and first-line support, a 60/25/15 allocation may be more appropriate.

**For the first showcase specifically: avoid revenue sharing entirely.** Use a fixed bounty or
stipend with clearly defined deliverables. Revenue sharing becomes relevant only once someone
actually pays to deploy or licence the resulting skill.

## Intellectual-property boundary

- KB Sandbox owns its Methods, evaluation framework, and governance components.
- The builder owns reusable connector code, unless commissioned under different terms.
- The outlet owns its menu, business data, and merchant-specific configuration.
- Sandz owns or licenses its infrastructure services.
- Customer-specific secrets and transactional data are never reusable.
- A builder grants KB Sandbox and Sandz the rights required to demonstrate, deploy, and support an
  approved version.
- Generic improvements can remain reusable, but customer-specific knowledge cannot be copied into
  another deployment.

## Quality and certification

A marketplace cannot rely solely on "uploaded by a developer." Each version should receive a
status: Experimental, Sandbox tested, Security reviewed, Outlet accepted, Production approved,
Deprecated, Suspended.

Certification should test: correct menu and pricing, availability handling, duplicate-order
prevention, explicit confirmation, authentication and authorization, secret protection,
cancellation and failure behavior, logging and metrics, API-version compatibility, data privacy,
and support ownership.

## Closing framing (verbatim from the request)

This could become a valuable ecosystem: KB Sandbox supplies the governed development and evaluation
process, Filipino developers create reusable commercial agents, Sandz supplies regional
infrastructure, and local businesses gain AI-ready interfaces without building everything
themselves.

For the immediate showcase, the cleanest arrangement is: fixed builder bounty, sandbox-only outlet,
KB Sandbox guidance and evaluation, and Sandz hosting donated or discounted for the demonstration.
Commercial revenue sharing can then be designed using the actual effort and customer interest
observed during the project.
