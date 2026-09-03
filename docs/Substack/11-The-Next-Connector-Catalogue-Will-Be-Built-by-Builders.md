# The Next Connector Catalogue Will Be Built by Builders

## How APIs, webhooks and MCP can create a new generation of regional AI services

Enterprise AI platforms often promote the number of applications they connect to. Glean, for example, says it supports more than 275 connectors, alongside custom indexing, OpenAPI-based actions and remote MCP servers.

That scale is impressive. It also reveals an opportunity.

No single vendor will build every integration needed by every regional business, specialist industry, school, local software product or SME. Many of the most valuable systems are not globally famous. They may be a locally developed accounting package, a restaurant ordering system, a clinic application, a warehouse platform or a customer-specific operations tool.

Those missing integrations are not merely product gaps. They are opportunities for software houses, students, solo founders and specialist developers.

The next connector catalogue does not have to be built by one large company. It can be built by a governed community of builders.

## The opportunity is larger than “build an MCP server”

MCP—the Model Context Protocol—is becoming an important standard for allowing AI assistants to discover and call external tools. But an enterprise integration usually contains several different pieces.

| Component | What it does |
|---|---|
| REST API | Retrieves information or performs an operation in an existing application |
| Webhook | Reports that something changed, such as an order being dispatched |
| Knowledge connector | Synchronizes approved content, versions and permissions into a searchable knowledge environment |
| MCP server | Presents selected business capabilities as tools an AI assistant can understand and call |
| External agent | Coordinates reasoning, state and several tools when a simple tool call is not enough |

These components complement one another.

An AI assistant might call `check_delivery_status` through MCP. The builder's MCP server then calls the delivery company's existing REST API. Later, a webhook reports that the parcel has been delivered. A knowledge connector may separately keep approved customer-support procedures up to date.

```text
User
  ↓
AI assistant
  ↓ MCP
Builder-hosted MCP server
  ↓ REST API
Existing business application
  ↑
Webhook events
```

MCP does not replace APIs and webhooks. It gives AI systems a standardized, understandable way to use selected capabilities built on top of them.

## Start with the business outcome, not the endpoints

It is tempting to take an OpenAPI specification, send it to an AI coding tool and ask it to generate an MCP server. That can produce a useful prototype. It does not prove that the result represents how the business actually works.

An API may not explain:

- which employee is allowed to approve a price;
- what happens when stock changes during checkout;
- which customer records a support agent may view;
- when a manager must review an exception;
- what users accomplish through screens that the API does not expose;
- how duplicate requests are prevented; or
- which failure should be retried and which should stop.

A capable builder therefore begins with intent:

> What should this user be able to accomplish, using which evidence, under whose authority, and what must remain impossible?

Only then should the builder choose the appropriate APIs, webhooks, tools and agent behavior.

## Ember should usually call tools directly

For bounded work, the architecture can remain simple.

If a user asks Ember to check an order, retrieve a ticket or prepare a draft request, Ember can call an approved tool on a registered MCP server. The builder does not need to create another agent merely to wrap one operation.

```text
User → Ember → approved MCP tool → existing system
```

A separate external agent becomes useful when the work genuinely requires planning, durable state, independent verification or controlled recovery.

For example, a proposal agent might:

1. review customer requirements;
2. retrieve approved product evidence;
3. check live availability;
4. apply commercial rules;
5. identify missing information;
6. prepare a draft; and
7. route pricing and customer release to the correct human authorities.

That is meaningfully different from calling `get_product_details`.

The design rule should be straightforward:

> **Use a tool for a bounded capability. Add an agent only when the work requires its own reasoning or workflow.**

## What a builder could create

The potential catalogue is enormous because it follows real business needs rather than a fixed software category.

### Food ordering and delivery

A local builder could create tools that retrieve a restaurant's menu, check availability, submit an order and obtain delivery status. Ember could become the conversational interface inside a customer-specific Order Food Project.

The same standards-based tools might later be used by the outlet's own application, a corporate assistant or a delivery aggregator.

### Sales and proposals

A builder could connect product catalogues, stock systems, customer requirements and commercial approval processes. Sales staff could ask for a proposal draft grounded in approved evidence without giving the AI unrestricted authority to release pricing.

### Call-center support

A knowledge connector could synchronize approved procedures and known issues. MCP tools could retrieve live ticket or service status, while webhooks report escalations or missed service levels.

### Invoice creation and processing

Tools could prepare an invoice from approved order data, check payment status and route discrepancies. Webhooks could report payment or validation events. Deterministic code—not an LLM—should still calculate totals and validate required fields.

### Logs and operational metrics

A builder could connect monitoring platforms, collect bounded diagnostic evidence and normalize it for an investigation. This avoids asking users to copy logs manually from several systems and reduces a common source of incomplete or incorrect evidence.

### Specialist local systems

Healthcare, logistics, education, manufacturing, professional services and public-sector organizations often use software that will never appear near the top of a global connector roadmap. A local builder who understands both the system and the business process can serve that need better than a generic integration.

## Where KB Sandbox fits

KB Sandbox does not need to host every connector or build every agent. It can provide the governed lifecycle around them.

```text
Business requirement
        ↓
Discovery and Workbench Method
        ↓
Evidence-backed architecture and specification
        ↓
External implementation by a builder
        ↓
Deployment on approved infrastructure
        ↓
Versioned registration
        ↓
Functional, permission and security evaluation
        ↓
Human approval
        ↓
Availability to Ember in selected Projects
```

This separation is important.

The builder remains responsible for implementation and maintenance. The customer remains responsible for business authority and acceptance. An infrastructure partner such as Sandz can provide approved regional hosting. KB Sandbox preserves the specification, evidence, evaluation and approval record.

Registration should never mean automatic trust. An MCP server or external agent should move through visible stages such as:

1. Registered
2. Connectivity verified
3. Functionally evaluated
4. Security reviewed
5. Customer accepted
6. Production approved

The approved version can then be made available only within the Projects that need it.

## Permissions must travel through the complete chain

An AI-friendly interface must not become a shortcut around the original application's security.

Where possible, the external system should receive the requesting user's delegated identity and continue enforcing its own permissions. KB Sandbox Project membership adds another boundary: a tool may be approved for one Project without being offered to every user or department.

Write actions need stronger controls than reads. Ordering food may require the user to confirm the final outlet, items and price. Releasing a customer quote may require commercial approval. Administrative and security operations may not be appropriate for conversational access at all.

The safe path should be visible and usable:

- approved tool;
- identified user;
- authorized Project;
- minimum necessary permissions;
- confirmation or human approval where required;
- structured result; and
- auditable execution record.

## A new pathway for regional builders

AI coding tools are changing what junior developers and small software teams can produce. Generating code is becoming faster. The scarce skills are increasingly the ability to specify the right behavior, preserve business rules, design permissions, evaluate failures and prove that a system is ready for use.

That makes integration development a natural Builders Programme activity.

A participant could:

1. learn the foundation concepts;
2. select a real business problem;
3. discover the existing workflow and APIs;
4. create an evidence-backed specification;
5. build the connector or MCP server using their preferred coding environment;
6. deploy it on approved infrastructure;
7. register it back with KB Sandbox;
8. test it against expected and denied cases; and
9. demonstrate it through Ember in a controlled Project.

The result is more valuable than another classroom chatbot. It is a deployable capability, a portfolio artifact and potentially the beginning of a service business.

Software houses can use the same approach for junior-employee training. Solo founders can create reusable specialist integrations. Students can solve problems for local organizations. Infrastructure partners can host the resulting services. Customers gain capabilities that would otherwise be too narrow for a global vendor to prioritize.

## The catalogue should remain portable

A builder-created MCP server should not have to work only with KB Sandbox.

If the contract is standards-based and appropriately secured, the same capability may be usable by Ember, another enterprise assistant, a developer tool or a customer application. Each host still performs its own authorization and acceptance, but the builder does not need to reproduce the core integration logic for every interface.

That portability creates a healthier ecosystem. Builders retain valuable reusable expertise. Customers avoid unnecessary lock-in. KB Sandbox contributes governance and assurance rather than trying to own every endpoint.

## The bigger idea

The connector catalogues of the largest AI companies demonstrate that integrations matter. But the long tail of enterprise and regional software is far larger than any central catalogue.

The opportunity is to create a governed way for many builders to extend that catalogue safely.

For KB Sandbox, the strategy can be summarized in one line:

> **Discover with evidence. Specify the boundary. Build externally. Register the contract. Test the permissions. Approve the version. Let Ember use only what the Project needs.**

That is how a regional builder ecosystem can turn APIs, webhooks and MCP into practical enterprise AI—one trustworthy capability at a time.

---

**Suggested excerpt:** No vendor will build every AI integration needed by every regional business. A governed Builders Programme can help software houses, students and solo developers turn existing APIs and webhooks into tested, portable MCP capabilities that Ember and other assistants can use safely.

**Suggested slug:** `next-connector-catalogue-built-by-regional-builders`

**Suggested tags:** Builders Programme, MCP, API integration, webhooks, enterprise AI, Southeast Asia, software development

**References:**

- [Glean connectors and custom integration options](https://www.glean.com/platform/connectors)
- [Glean data-source and connector model](https://docs.glean.com/get-started/setup/connect-data-sources)
- [Glean remote MCP server integration](https://docs.glean.com/administration/actions/connect-remote-mcp-servers-to-glean)
