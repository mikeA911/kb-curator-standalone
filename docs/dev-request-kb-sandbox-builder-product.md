# KB Sandbox Builder Product

## Status

Proposed product development request for staged implementation after the current Ember role-directed experience and Project-scoped working-knowledge work have stabilized.

## Executive decision

Create **KB Sandbox Builder** as a distinct product experience on the existing KB Sandbox codebase.

Do not fork the application into an unrelated product. Support two deployment modes with shared authentication, Ember, Methods, artifacts, provider integrations, evaluation components and security primitives:

- **KB Sandbox Enterprise** supports governed organizational knowledge and everyday employee work.
- **KB Sandbox Builder** supports individual consultants, developers and forward-deployed engineers who discover, specify, build and verify customer AI capabilities.

**Ember** remains the conversational interface in both products. Its tools, prompts, suggestions and navigation must reflect the deployment mode and the current user's authority.

An operator such as SSCGI may host a Builder instance for its own developers, trainees, partner software houses, students and selected independent builders. The operator supplies local customers, mentors, implementation experience and support. KB Sandbox supplies the product, Methods, Ember-guided architecture and assurance workflow.

## Product family

| Product or programme | Primary user | Purpose |
|---|---|---|
| KB Sandbox Enterprise | Organizations | Govern approved knowledge, Projects, permissions, connected capabilities, evaluations and operational use |
| Ember | Employees and builders | Provide a simple conversational interface to the capabilities and context authorized for the user |
| KB Sandbox Builder | Individual consultants and developers | Discover customer needs and create implementation-ready architecture, specifications, tests and handoffs |
| Builder Programme | Builders, mentors and operators | Provide learning, milestones, credits, showcases and a path from practice to a real customer engagement |
| Builder Network | Future cross-organization community | Share public Methods and experience, find collaborators and encourage reusable regional capabilities |
| Customer runtime | Customer-selected users and applications | Run the connector, MCP server, agent or application produced by the builder |

The implementation boundary is:

```text
KB Sandbox governs the work
Ember provides the conversation
Builder helps define and verify what should be built
The builder's own IDE produces the software
The customer chooses where the resulting capability runs
```

## Why this product is needed

Large AI vendors can finance broad connector catalogues and internal development teams. They cannot know every local business process, legacy application, language, deployment constraint or regulatory practice.

Regional software houses and independent developers already hold that knowledge. Assisted coding makes implementation faster, but it does not automatically provide sound requirements, architecture, permissions, business-rule preservation, test evidence or customer approval.

KB Sandbox Builder should give regional builders a disciplined workspace for those activities without attempting to replace their IDE, repository, deployment tools or customer relationships.

This is the principal differentiation:

> A distributed network of local builders can use shared Methods and evidence-led assurance to create portable capabilities for the customers and systems they already understand.

## Example operating model

SSCGI is an illustrative Builder operator, not a hard-coded tenant or product dependency.

```text
SSCGI operated KB Sandbox Builder instance
│
├── SSCGI programme administrators
│   ├── invite builders
│   ├── configure programme rules
│   ├── allocate bounded AI credits
│   ├── publish approved Methods and examples
│   └── monitor aggregate programme progress
│
├── Individual builder workspace A
│   ├── private Builder Notebook
│   ├── Ember conversations
│   ├── customer discovery and architecture
│   └── exported implementation handoff
│
├── Individual builder workspace B
│   └── isolated from builder A
│
└── Successful customer engagement
    ├── exported governed handoff
    ├── customer chooses its interface and runtime
    └── optional customer KB Sandbox Enterprise instance
```

An operator administrator may manage identity, access, quota, abuse and programme progress. That authority must not automatically grant access to a builder's private notebook, conversations or customer artifacts. Any future support-access mechanism must be explicit, time-limited, user-visible and audited; it is outside this request.

## Intended Builder experience

The initial Builder product is deliberately individual and simple.

- Each builder uses the existing platform role `consultant`.
- A builder lands in a Builder-specific Ember workspace.
- The primary question is: **What are you trying to help this customer accomplish?**
- Ember helps the builder discover the workflow, research the context, select a Method and prepare artifacts.
- The builder can save and reload private working knowledge between conversations.
- The builder exports architecture and implementation artifacts, then develops the software externally.
- The builder returns test results, logs, limitations and deployment evidence for review.
- A viable customer engagement can be packaged for a customer-controlled production environment.

Do not expose enterprise curation, organizational knowledge administration or general platform administration in the Builder shell.

## Builder Notebook

The Builder Notebook is the initial continuity mechanism.

It is:

- owned by one builder;
- optionally associated with one of that builder's customer opportunities;
- editable by the builder;
- explicitly saved and explicitly loadable into Ember;
- suitable for customer facts, research summaries, assumptions, decisions, open questions and implementation notes;
- versioned sufficiently to recover prior content; and
- subject to storage and AI-context limits.

It is not:

- an enterprise knowledge base;
- approved organizational guidance;
- a shared team notebook;
- automatically retrievable by other users;
- indexed into platform or enterprise RAG;
- automatically transferred to a customer; or
- a place for secrets, credentials or unrestricted personal data.

The initial implementation may reuse applicable structures from `docs/dev-request-project-scoped-working-knowledge-and-research-notebooks.md`, but Builder privacy and individual ownership must be explicit. Do not silently make Builder notebooks visible to an operator administrator because the enterprise product has curator or administrator review flows.

### Ember context behavior

- The builder chooses which notebook or saved snapshot is active.
- Ember clearly displays when Builder Notebook context is loaded.
- Starting a new conversation does not silently discard the notebook.
- Unloading or changing the notebook creates a hard context boundary for subsequent turns.
- Old conversation content must not bypass the selected notebook boundary.
- Summaries may be used to control token consumption, but the user must be able to inspect and correct saved knowledge.
- Internet research and generated content retain their URLs, dates and uncertainty labels.

## Builder opportunities

A Builder workspace may represent a potential customer or a learning exercise. Suggested opportunity states are:

```text
Exploring -> Qualified -> Specifying -> Building -> Validating -> Customer won or Closed
```

This is not a CRM. Store only the minimum fields needed to organize Builder work:

- opportunity name;
- customer alias or name supplied by the builder;
- intended outcome;
- current state;
- active Method or task;
- linked notebook;
- exported artifacts;
- last activity; and
- optional next action.

Avoid pipelines, forecasting, contact databases, team assignment and sales automation in the initial release.

## Five programme milestones

Keep the progression understandable and limited to five milestones per customer cycle:

1. **Learn** — complete the Builder foundation and a short evidence-grounded assessment.
2. **Discover** — document a credible customer problem, present workflow and measurable outcome.
3. **Specify** — produce a reviewed architecture, capability contract, guardrails and acceptance criteria.
4. **Build and validate** — implement externally and return working test and deployment evidence.
5. **Convert** — secure a customer commitment or approved production engagement.

After Convert, the customer cycle closes and the builder may begin another. Historical achievements remain visible, while cycle-specific progress resets.

Milestones are not automatically awarded from conversational claims. Each requires defined evidence and either deterministic verification or an authorized human decision.

## Credits and metering

AI usage must be bounded from the first Builder release because model costs are initially paid by the platform or operator.

Implement reusable per-user metering that can later support Enterprise plans:

- provider and model;
- input and output tokens where reported;
- estimated or actual cost;
- operation type;
- Builder opportunity and conversation where applicable;
- timestamp and outcome;
- monthly allowance, promotional credit and earned credit balances; and
- configurable warning and stop thresholds.

The UI should present a simple remaining-credit indicator and understandable warnings. Do not force builders to interpret provider token terminology unless they open details.

Programme points may extend a trial or add a bounded amount of AI credit. Keep points separate from currency and do not promise cash value, transferability or redemption.

Suggested initial point triggers:

- foundation completion;
- accepted customer discovery;
- approved specification;
- validated external build; and
- customer conversion.

Operators may configure the credit awarded at each milestone within platform-set limits. Do not award unlimited credits, create referral commissions, or build an aggregated model-resale business in this request.

## Builders build outside KB Sandbox

KB Sandbox Builder must not become a browser IDE or no-code agent studio.

Ember and Methods help create:

- problem and intended-outcome statements;
- business-role and workflow discovery;
- evidence and assumption registers;
- OpenAPI-equivalent capability contracts;
- connector, webhook and MCP architecture;
- external agent specifications where justified;
- identity, privacy and human-approval boundaries;
- threat models and failure cases;
- acceptance tests;
- deployment requirements; and
- implementation handoffs.

The builder exports these artifacts and uses Codex, Claude Code, another assisted-coding environment or conventional development tools. KB Sandbox may link to a repository and fixed commit, but source-code hosting and editing remain external.

## Portability requirement

The customer may not need Ember or KB Sandbox at runtime.

A completed capability may be used through:

- Ember in a customer KB Sandbox Enterprise Project;
- an existing SSCGI or customer application;
- a web, mobile, kiosk or messaging interface;
- another enterprise assistant;
- another MCP-capable host; or
- a conventional REST or webhook integration.

Exported specifications must therefore distinguish portable implementation contracts from KB Sandbox-specific governance metadata. Do not require a Builder-produced agent or MCP server to call proprietary KB Sandbox APIs merely to function.

## Customer conversion

Conversion is a controlled handoff, not an automatic copy into production.

Produce a customer handoff package containing the builder-selected and reviewed material:

- intended use and scope;
- current workflow and business rules;
- approved architecture and contracts;
- data, identity and permission requirements;
- guardrails and human decisions;
- evaluation and acceptance criteria;
- implementation/deployment evidence;
- known limitations;
- source and repository references; and
- recommended next steps.

The builder reviews the package before export. Customer-specific secrets and unrelated notebook material must never be included automatically.

If the customer adopts KB Sandbox Enterprise, its administrator imports or recreates the approved package in the customer instance and assigns the appropriate Projects, knowledge, users and approval authorities. Registration in the customer instance remains a new trust decision.

## Product identity and landing experience

Use one codebase and product configuration rather than customer branches for ordinary branding or navigation.

Provide a deployment-level product mode such as:

```text
enterprise
builder
```

The exact configuration mechanism may follow the application's current deployment conventions. It must be server-controlled and must not be selectable by an ordinary user.

The Builder landing experience should explain:

- discover and specify with Ember;
- build in the developer's own environment;
- return evidence and validate;
- keep the result portable; and
- progress from learning to a real customer engagement.

The main public KB Sandbox site may continue to host About, Wiki and Blog content. A Builder-operated deployment may have an operator-specific welcome message and logo later, but full white-labeling is outside the initial release.

## Authorization and privacy invariants

1. A consultant can access only their own Builder notebooks, opportunities, conversations and private artifacts.
2. One builder cannot enumerate another builder's customer names, notebook titles, artifact metadata, token usage or milestone evidence.
3. Operator administrators can manage accounts, suspension, allowances and aggregate programme measures without default content access.
4. No platform-role shortcut may bypass Builder content isolation.
5. Usage enforcement occurs server-side before the model call; hiding a button is not enforcement.
6. Model/provider logs must not expose prompts or customer content merely to calculate usage.
7. Secrets and credentials must not be stored in notebooks, prompts or exported documents.
8. Internet-research results remain untrusted until evaluated and must retain provenance.
9. Export is user-initiated and shows exactly what will be included.
10. Customer conversion never implies production approval of an external capability.

## Relationship to existing work

- `docs/dev-request-ember-role-directed-product-experience.md` defines the consultant/FDE Ember experience and should be completed or stabilized before Builder navigation is introduced.
- `docs/dev-request-project-scoped-working-knowledge-and-research-notebooks.md` supplies applicable working-knowledge concepts, but the Builder Notebook is individually owned and does not use Project-team sharing in the initial product.
- `docs/design-notes/concept-paper-advanced-builder-integrations.md` remains the authority for connector, REST, webhook, MCP-server and external-agent distinctions.
- Existing structured Ember responses and Artifacts should be reused for generated specifications, exports and next actions.
- Existing agent/MCP registration and certification apply only when a capability is introduced into an Enterprise instance; creating a specification in Builder does not certify it.

## Suggested implementation stages

### Stage 0 Product and schema inventory

- Confirm which consultant experience from the role-directed request is already implemented.
- Inventory conversations, working knowledge, artifacts, provider usage and role policies that can be reused.
- Produce narrow mobile and desktop wireframes for Builder home, Notebook, Opportunity and Usage.
- Threat-model cross-builder isolation and operator administration before schema changes.
- Confirm the minimum handoff/export format.

### Stage 1 Builder deployment mode and shell

- Add server-controlled Builder product mode.
- Route consultants to the Builder Ember home.
- Remove enterprise curation and administration from the Builder shell.
- Add Builder-specific onboarding, starter prompts and empty states.
- Preserve a tightly controlled operator administration route.

### Stage 2 Private Builder Notebook

- Add individually owned notebooks and version history.
- Allow explicit load, unload and switch actions in Ember.
- Add research provenance and user correction.
- Enforce cross-builder isolation at database and server-action layers.
- Do not index notebook content into enterprise RAG.

### Stage 3 Opportunities and artifact handoffs

- Add the minimal opportunity record and state progression.
- Let Ember recommend and apply existing Methods.
- Generate structured, downloadable architecture and implementation artifacts.
- Add repository URL and fixed-commit references without becoming a source-code host.
- Add a reviewed customer handoff package.

### Stage 4 Metering and five milestones

- Record per-user provider/model usage and cost metadata.
- Enforce configurable allowances and stop thresholds server-side.
- Add the five evidence-backed milestones.
- Allow bounded operator-awarded and milestone-earned credits.
- Add simple user and aggregate operator views.

### Stage 5 Customer conversion validation

- Export a complete but user-reviewed handoff.
- Validate that the runtime capability works independently of KB Sandbox.
- Test optional registration in a separate Enterprise instance as a new approval decision.
- Document the operator workflow from Builder onboarding through customer handoff.

## Out of scope

- Builder teams or shared private workspaces.
- Cross-builder direct messaging or social feeds.
- A public marketplace.
- Cash-value points, commissions or automated revenue sharing.
- Full white-labeling.
- A built-in IDE, source repository or deployment platform.
- Enterprise RAG for Builder notebooks.
- Automatic promotion of Builder content into enterprise knowledge.
- Automatic customer-instance provisioning.
- A CRM, sales forecast or contact-management system.
- Automatic production approval after a successful build.
- Operator access to private Builder content without a separately designed support-access process.
- A proprietary runtime requirement for Builder-produced capabilities.

## Acceptance criteria

1. A deployment can be configured as Builder without branching or duplicating the application.
2. A consultant signs in and lands in a simple, mobile-usable Builder Ember experience.
3. Enterprise curator and knowledge-administration controls do not appear in the Builder shell.
4. An operator administrator can invite, suspend and set bounded allowances for builders.
5. A builder can create, edit, version, select, load and unload a private Builder Notebook.
6. Notebook content is not added to an enterprise knowledge base or RAG index.
7. A second builder cannot discover the first builder's notebooks, opportunities, conversations, artifacts or usage metadata through UI, direct URL, API or search.
8. An operator administrator does not receive ordinary read access to private Builder content.
9. Ember visibly identifies the active notebook and preserves it across new conversations until the builder changes it.
10. Switching or unloading a notebook prevents previous private context from leaking into later responses.
11. A builder can create a minimal customer opportunity and move it through allowed states.
12. Ember can apply existing Methods and generate downloadable implementation artifacts.
13. The builder can attach repository and fixed-commit references without uploading source code into KB Sandbox.
14. The exported customer handoff has a review step and excludes unselected notebook material and secrets.
15. Per-user AI usage is recorded and enforced before provider calls.
16. The user sees remaining allowance and receives a clear warning before service is stopped.
17. Five and only five initial programme milestones are presented for each customer cycle.
18. Milestones require evidence and cannot be awarded solely by an LLM assertion.
19. Earned points can add only a bounded trial extension or AI allowance and have no represented cash value.
20. A completed MCP server, connector or agent can operate through a non-Ember client using its portable contract.
21. Importing or registering the capability in an Enterprise instance requires that instance's own authorization and approval.
22. Existing Enterprise role, Project, evidence-retrieval and agent-gateway regression tests remain green.
23. Ember's capability and navigation catalogue documents the shipped Builder journeys and their limits.

## Required live validation journeys

### Journey A Individual builder isolation

Create two consultant accounts in one Builder deployment. Each creates a notebook, opportunity, conversation and artifact. Confirm neither can discover any metadata or content belonging to the other through navigation, search, API calls or guessed URLs.

### Journey B Continuity without RAG

The first builder records customer facts, research and decisions in a notebook, starts a new Ember conversation and explicitly reloads it. Confirm Ember uses the saved content, displays the active notebook and does not describe it as approved enterprise knowledge.

### Journey C Architecture before coding

The builder describes a legacy customer process. Ember recommends an appropriate Method and produces a versioned capability contract, security boundary, test plan and implementation handoff. Confirm no claim implies that KB Sandbox built or certified the software.

### Journey D External build and portable runtime

Link a repository and fixed commit for an externally developed MCP server or agent. Return test evidence and validate the capability through both Ember and an independent client. Confirm neither runtime requires Builder Notebook access.

### Journey E Meter limit

Give the builder a small allowance. Confirm usage is measured, warnings appear, an over-limit provider call is prevented server-side and an operator can add only a bounded credit adjustment.

### Journey F Customer conversion

Complete the five milestones, review the customer handoff, exclude private working notes, and introduce the package into a separate Enterprise instance. Confirm that the Enterprise administrator must make a fresh registration and approval decision.

## Success measures

- time from first sign-in to a useful customer-problem statement;
- percentage of builders who complete Learn and Discover;
- percentage who produce an approved specification;
- external builds returned with usable test evidence;
- average model cost per active builder and per completed stage;
- cross-builder privacy or authorization defects;
- customer opportunities reaching validated build and conversion;
- capabilities demonstrated outside Ember; and
- builders beginning a second customer cycle after completing the first.

## Documentation required at release

- Builder product overview and product-family vocabulary;
- operator setup guide using SSCGI as an illustrative example;
- Builder privacy and AI-usage explanation;
- Builder Notebook guide;
- five-milestone evidence requirements;
- architecture and handoff export guide;
- external build and repository-linking guide;
- customer conversion guide;
- capability catalogue and Ember navigation updates; and
- limitations stated in language suitable for builders and operator administrators.

