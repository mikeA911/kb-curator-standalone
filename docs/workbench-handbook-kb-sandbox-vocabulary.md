# KB Sandbox Vocabulary

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `kb-sandbox-vocabulary`
**Proposed status:** Draft -> human review -> approved
**Proposed visibility:** Public (linked from the About page for anonymous visitors, not just signed-in users)
**Audience:** Everyone -- Sandz, collaborators, users, and coding agents working on or with KB Sandbox

## What it is

Canonical definitions for the terms KB Sandbox uses -- Project, Workstream, Method, Agent, Wiki,
Ember, and the rest -- so that everyone talking about the product means the same thing by the same
word. These terms evolved organically as the product was built; this article is where they get
written down once, so future conversations, documentation, and code can point back to a single
source instead of re-deriving meaning each time.

See also [How KB Sandbox Is Organized](/wiki/how-kb-sandbox-is-organized-projects-workstreams-and-knowledge)
for how Projects and the Wiki relate in practice, and the
[Workbench Methods Overview](/wiki/workbench-methods-overview) for the full list of Methods.

## Core concept

**KB Sandbox / KBS** -- an Enterprise AI Workbench. It provides a governed environment where
organizations can bring knowledge, investigate problems, experiment with AI approaches, evaluate
results, and turn successful approaches into repeatable Methods. The basic lifecycle is
**Know -> Experiment -> Apply**. KBS generally stops before production execution -- production
implementation remains with the appropriate specialist system, engineering environment, business
application, or operational platform.

**Workbench** -- the overall KBS environment. Just as a physical workbench provides tools,
materials, and a controlled place to build something, the KBS Workbench provides Knowledge +
Projects + Workstreams + Methods + AI Models + Agents + Evaluations + Artifacts + Human Review. A
Workbench is different from a normal AI chatbot: the purpose isn't merely to obtain an answer, it's
to make the process by which the answer was reached structured, evidence-backed, comparable, and
reviewable.

## Organizational concepts

**Organization** -- the highest business boundary within KBS (e.g. Sandz, Acme Semiconductor,
Ministry X, University X). An Organization can contain multiple Projects, users, knowledge assets,
AI configurations, and policies. Organization boundaries should also provide security and data
isolation. (Per the 2026-08-27 deployment-model decision, each Builders Programme software house
currently gets its own separate KBS instance rather than a shared multi-tenant Organization
boundary -- see the Organization definition as the target model, not necessarily today's literal
deployment shape.)

**Project** -- the primary working and knowledge boundary in KBS. It brings together the people,
knowledge, conversations, Workstreams, Methods, and Artifacts associated with a particular
objective or area of work (e.g. Sandz-Zadara Pilot, CareCall API Discovery, Semiconductor 8D
Investigation). A Project answers: *what are we working on, and what knowledge belongs to that
work?* Project context matters especially for Ember -- conversations within a Project should be
grounded in knowledge authorized for that Project.

**Parent Project / Sub-project** -- a Parent Project represents a larger initiative containing
several related areas of work; a Sub-project is a Project operating within that broader initiative
(e.g. Sandz-Zadara Pilot, with Governance, Sales, and Call Center Support as sub-projects). Today
this relationship is represented through project naming conventions, not a formal parent/child
database relationship -- that's an intentional simplification, not an oversight; build a formal
hierarchy only once a real showcase demonstrates the need for one.

## Knowledge concepts

**Knowledge Source** -- original material brought into KBS as evidence: documents, policies,
specifications, architecture documents, manuals, source repositories, research material, approved
web content, structured datasets, and other supported evidence types. Knowledge Sources are
evidence, and should stay distinguishable from AI-generated interpretations of that evidence.

**Knowledge Base (KB)** -- a governed collection of Knowledge Sources and their approved,
retrievable content. A Knowledge Base can be attached to one or more Projects, subject to Project
membership and source-level access controls. It supplies permission-filtered evidence to Ember and
Workbench activities; it is not itself a Wiki and should not be described as one. A Project may
have its own Knowledge Base and may also reuse other explicitly attached Knowledge Bases.

**RAG / Retrieval-Augmented Generation** -- the process of finding information the current user is
authorized to access at question time and providing it to an AI model as grounded context. In KBS,
retrieval may find primary evidence from an attached Knowledge Base and curated guidance from an
authorized Wiki article. RAG does not make a source true, approved, current, or accessible by
itself; curation, version state, Project scope, and source permissions still govern what can be
retrieved.

**Project Knowledge** -- trusted knowledge made available within a specific Project. It may
originate from uploaded sources, curated information, approved findings, promoted conversations, or
other reviewed material. Project Knowledge provides Ember and Workbench activities with their
project-specific context.

**Wiki / Handbook** -- curated, reusable knowledge intended to explain established concepts rather
than merely preserve raw source material (e.g. this Workbench Handbook). The distinction: *Sources
preserve evidence. Wikis explain what we know.*

**Source--Wiki relationship** -- Sources and Wiki articles are related but do not automatically
become copies of one another. A source may remain available only as retrieval evidence; several
sources may support one synthesized Wiki article; one source may support several focused Wiki
articles; and a Wiki article may be manually authored as approved organizational guidance. Wiki
claims should retain links to their supporting sources where practical. A Wiki article must never
broaden access to information taken from a restricted source. When a supporting source is replaced,
superseded, restricted, or removed, dependent Wiki guidance should be flagged for review.

For Ember, these layers have different jobs: **Knowledge Base retrieval supplies primary evidence;
Wiki retrieval supplies curated organizational or platform guidance; the AI model reasons across
the authorized material; and human governance determines what may be trusted or acted upon.** The
response should identify those roles visibly rather than presenting every statement as equivalent.

### Worked examples: what belongs where

Knowledge Bases and Wiki articles complement one another, but neither is a mandatory copy of the
other:

```text
Several sources  ---> one synthesized Wiki article
One source       ---> several focused Wiki articles
Source only      ---> retrieved directly as RAG evidence
Wiki only        ---> manually authored organizational guidance
```

| Example | Appropriate home | Why |
|---|---|---|
| A 200-page Zadara product manual | Knowledge Source in a Project-attached Knowledge Base | The complete manual is primary evidence. Only the concepts people repeatedly need should normally be synthesized into focused Wiki guidance. |
| “How Sandz staff should escalate a support case” | Project or organizational Wiki | This is concise, reusable operating guidance and may be manually authored even when no formal source document exists. It should identify its approver. |
| A confidential customer pricing sheet | Restricted Knowledge Source | Ember may retrieve it only for authorized users and Projects. Its contents must not be copied into a broadly visible Wiki article. |
| A Workbench Method | Workbench Handbook / Wiki | A Method is reusable procedural guidance. It does not need to originate from an uploaded document. |
| Several approved policies summarized for new employees | Wiki article linked to its supporting sources | The Wiki provides an accessible explanation while the underlying policies remain the authoritative evidence. |

RAG/source evidence commonly includes uploaded policies, manuals, proposals, contracts, product
documentation, meeting records, approved Artifacts, detailed tables, technical references,
document versions, and restricted Project information. Wiki articles commonly contain approved
summaries, employee-facing explanations, Methods, procedural guidance, definitions, established
decisions, lessons, and cross-document synthesis.

Ember should search both where authorized, but present them differently:

- **Source evidence** -- primary supporting material.
- **Wiki guidance** -- curated interpretation, explanation, or procedure.

A synthesized Wiki article should retain links to the sources supporting its factual claims. A
manually authored article should identify itself as organizational guidance and preserve its human
approval provenance. Removing, superseding, or restricting a supporting source should trigger a
review warning on dependent Wiki guidance rather than silently leaving the interpretation looking
current and supported.

**FAQ Request** -- a user's request for an authorized curator to consider adding or improving a
frequently asked question and its answer. An FAQ Request is feedback and evidence of an unmet
knowledge need; it is not an approved FAQ, a Knowledge Source, or immediately retrievable guidance.
The curator must resolve the answer against approved evidence, choose the appropriate Project/Wiki
scope and visibility, and approve publication through the normal knowledge-governance process.

**Promotion** -- the act of taking something discovered during work -- an important Ember
conversation, a validated finding -- and turning it into persistent, reviewed knowledge (Ember
conversation -> useful insight -> human review -> Promote -> Project Knowledge). Promotion prevents
valuable knowledge from disappearing inside chat history, while avoiding the opposite problem of
treating every AI conversation as truth.

## Work concepts

**Workstream** -- a structured investigation or body of work within a Project, with a specific
goal, instructions/guardrails, participants, expected deliverables, and evaluation criteria (e.g.
an "Independent OpenAPI Discovery" workstream inside the CareCall API Discovery project).
Participants -- Claude, ChatGPT, Grok, or a human engineer -- perform the same defined task
independently; their outputs become Workstream Artifacts. A Workstream answers: *what specific
question are we trying to answer, or outcome are we trying to produce?* This is one of the most
important distinctions in KBS: **Project = context and objective. Workstream = structured work
performed within it.**

**Participant** -- an entity performing work within a Workstream. Human participants: engineers,
architects, analysts, curators. AI participants: Claude, ChatGPT, Gemini, Grok, local models, etc.
Participant identity and model provenance are preserved so results can be compared.

**Artifact** -- a durable output produced through Workbench activity (an OpenAPI specification,
capability inventory, findings report, architecture design, evidence map, test results, evaluation
report, implementation handoff document). Artifacts differ from conversational responses because
they're intended to become reviewable deliverables. An Artifact should ideally preserve who created
it, which model/tool was involved, which Workstream produced it, what evidence supports it, and
whether it has been reviewed. A Workstream's **deliverables** list is simply the set of Artifacts a
Workstream expects to produce -- planned Artifacts, not yet a distinct concept from Artifact itself.

**Assessment** -- a common set of questions or criteria used to evaluate understanding or results
consistently (e.g. the CareCall System Understanding Assessment, which asks every participant the
same business/system questions). This lets KBS evaluate something deeper than "did both models
generate an OpenAPI file?" -- it asks "did they actually understand the system?"

**Evaluation / Eval** -- a structured measurement of an AI result, Method, model, or experiment
(accuracy, grounding, completeness, latency, cost, consistency, human preference, task success,
hallucination rate, or domain-specific measures). Assessments are one form of Evaluation.

## Repeatability concepts

**Method** -- a reusable, defined way of performing a particular kind of work in KBS. A Workstream
might prove that a particular approach works; that successful approach can then become a Method
other Projects can reuse (e.g. OpenAPI Discovery Method, RFP Response Method, 8D Investigation
Method, AI Infrastructure Evaluation Method). A Method answers: *how should this type of work be
performed?* The progression: **Experiment -> learn what works -> codify it as a Method -> reuse
it.** See the Workbench Methods Overview for the current catalogue.

**Wizard** -- the user-facing guided experience for applying a Method. The Method defines what
should happen; the Wizard helps the user do it. **Method = reusable process. Wizard = guided
interface to that process.** (Most Methods today are applied through Ember's conversational
reasoning against the Handbook rather than a dedicated Wizard screen -- see the Workbench Methods
Overview's own implementation-status note.)

## AI concepts

**AI Model** -- the underlying model performing inference (Claude, Gemini, GPT, Groq-hosted models,
private/local models). KBS preserves model identity because model comparison is part of the
Workbench philosophy.

**AI Provider** -- the service through which KBS accesses a model. Provider and model aren't
necessarily the same thing -- this distinction matters more as the same underlying models become
available through different hosting environments, including private infrastructure.

**Agent** -- an AI worker given a defined role, instructions, tools, and boundaries for performing a
task. An Agent isn't simply a model: **Model + Role + Instructions + Tools + Context + Guardrails =
Agent.** Agents operate inside the Workbench's governance rather than as autonomous actors with
unrestricted authority. This term specifically means a KBS-native agent (see `agents`/
`agent_versions`) -- for an agent that runs *outside* KBS and is only registered/governed by it, see
**External Agent** below.

**External Agent** -- an agent that runs outside KB Sandbox entirely (on a builder's own
infrastructure, or Sandz-hosted regional infrastructure), which KBS registers and governs without
hosting its code or runtime. Recorded in the **Builder Registry**: name, purpose, owner, kind, a
versioned specification (skills, credential references -- never the secrets themselves -- spending
limits, approval policy), and a **Certification Status**. The Lunch Agent (Food Outlet
AI-Readiness Showcase) is the first example. KBS reaches a registered External Agent's endpoint
through a standard boundary, generally MCP.

**Builder Registry** -- the single registration record type through which a Builder submits
*either* an External Agent *or* a builder-hosted MCP Server for KBS to govern (distinguished by a
`kind` field on the record; both share the same versioning, Project-availability, and
Certification Status shape). This is deliberately one registry, not two -- both kinds answer the
same governance questions (who owns it, what does it do, is it read-only or does it write, which
Projects may use it, what state has it reached), and a builder implementing an MCP server today may
reasonably wrap it in an External Agent tomorrow without needing a new registration model. The
Builder Registry only covers the **inward** direction -- see MCP Gateway below for the inward/
outward distinction. It has no relationship to Ember's own built-in **Tools**, which are KBS-native
capabilities, not builder-registered ones.

**Certification Status** -- the review state of one version of a registered External Agent or MCP
Server in the Builder Registry: **Experimental -> Sandbox Tested -> Security Reviewed -> Outlet
Accepted -> Production Approved**, with **Deprecated** and **Suspended** as terminal/withdrawn
states outside that ladder. Certification applies to a specific version, not the registration as a
whole -- a new version always starts back at Experimental, since a material code, API, or
permission change requires reassessment.

**Builder** -- a student, solo founder, or local software development company using KBS's governed
Methods, knowledge, and evaluation to build something -- typically an External Agent or MCP Server,
submitted to the Builder Registry -- faster than they could from scratch. The Builders Programme defines three levels: **Explorer** (students/
first-time AI builders; Foundation knowledge, public Methods, sandbox exercises), **Builder** (solo
founders/small teams; private projects, structured evaluations, Sandz development-hosting offers),
and **Delivery Partner** (established software houses; customer workspaces, advanced governance,
certification, referrals, co-selling).

**Skill** -- within an External Agent, the adapter for one specific outlet or ordering platform
(e.g. a Jollibee skill, a GrabFood skill). The agent owns the common intent ("order lunch"); each
Skill translates that intent into one outlet's specific interface -- authentication, menu
retrieval, pricing, order placement, error handling. Distinct from **Tool** below: a Tool is a
bounded capability *any* Agent or Ember can invoke; a Skill is specifically how an External Agent
adapts its behavior to one external system.

**Ember** -- the conversational interface to the KB Sandbox Workbench. It lets users interact
naturally with Project Knowledge and supported Workbench tools. Ember is not KBS itself: *KBS is
the Workbench. Ember is the assistant standing beside you at the Workbench.* Ember can help users
understand a Project, retrieve knowledge, apply Methods, create appropriate Workbench objects, and
guide users toward relevant Wizards.

**Tool** -- a bounded capability that an Agent or Ember can invoke (search Project Knowledge,
search Wiki, create a Project, create a Workstream, retrieve an Artifact, run an evaluation). Tools
expose specific governed operations rather than unrestricted system access.

**Connector** -- an adapter that connects one system to another using the source system's supported
interface, such as a REST API, webhook, SDK, file export, or database integration. In KBS, the word
must be qualified by purpose. A **Knowledge Connector** synchronizes approved content, metadata,
versions, deletions, and source access-control information into governed knowledge. An
**Action Connector** supports live reads or business operations without necessarily copying the
underlying data into KBS. A Connector may sit underneath an MCP Server, but a Connector and an MCP
Server are not synonyms.

**REST API** -- a conventional HTTP interface through which software explicitly requests data or
performs an operation using a known endpoint and payload. REST APIs commonly remain the
authoritative interface to an existing business application. A builder may use OpenAPI to describe
the interface and build a governed MCP layer over selected business capabilities; MCP does not
replace the upstream REST API or its business rules.

**Webhook / Event Source** -- an authenticated notification sent when something changes in an
external system, such as an order being accepted, a document being revised, or an invoice failing
validation. Webhooks support event-driven synchronization and workflows. Their payloads must be
validated, deduplicated, and recorded as structured events rather than inserted directly into an
AI prompt.

**MCP (Model Context Protocol)** -- a standardized way for an AI application to discover and call
tools, and where applicable access other declared context capabilities, exposed by another service.
MCP is an integration protocol rather than a product, Agent, authorization model, or replacement
for REST APIs and webhooks.

**MCP Server** -- a service that exposes a deliberately selected catalogue of MCP tools and related
capabilities. A builder-hosted MCP Server might expose `check_delivery_status` or
`create_support_ticket` while calling an existing REST API underneath -- this is the kind a Builder
registers in the **Builder Registry** alongside External Agents, since KBS needs to govern it the
same way (identity, version, authentication, tools, permissions, deployment, tests, and approval
state) before Ember can safely call it. KBS may *also* eventually act as an MCP Server itself, by
exposing approved search, knowledge, evaluation, or other Workbench capabilities to external AI
hosts -- that is a separate, outward-facing role (see MCP Gateway below) and has nothing to do with
the Builder Registry. An MCP Server does not become trusted merely because it can be connected.

**MCP Host** -- the AI-facing application that owns the user interaction and model/tool loop,
discovers tools through one or more MCP clients, and decides when a permitted tool should be called.
Claude Desktop, an IDE assistant, or a future MCP-enabled Ember experience can act as an MCP Host.
The Host remains responsible for presenting confirmations and respecting the user's current
context; the MCP Server remains responsible for enforcing its own authorization and tool contract.

**MCP Gateway** -- a governance and routing layer between an MCP Host and one or more MCP Servers.
“Gateway” is an architecture term, not a separate core MCP protocol role. In KBS, a future MCP
Gateway would authenticate connections, discover registered server versions, filter which tools
are available for the current user and Project, enforce model/sensitivity and approval policy,
route permitted calls, and record safe audit information. It must not become a privileged bypass
around the external system's permissions.

KBS can therefore participate on both sides of MCP:

- **KBS outward:** KBS acts as an MCP Server so an approved external AI Host can use selected
  Workbench knowledge or tools. Not yet built; unrelated to the Builder Registry.
- **KBS inward:** Ember acts as the AI Host, through the KBS MCP Gateway, and calls selected tools
  on registered external MCP Servers and External Agents -- the ones Builders have submitted to the
  **Builder Registry**. This is what Phase A of the Advanced Builder work (registration) and the
  Agent Gateway (future invocation) are building toward.

These are architectural roles, not a claim that every transport and execution path is already
implemented. Registration, connectivity verification, certification, Project availability, and
live invocation must remain visibly distinct states.

| Mechanism | Primary purpose in the KBS architecture | Typical example |
|---|---|---|
| Knowledge Connector | Synchronize content, versions, metadata, and source permissions into governed knowledge | Import approved helpdesk articles from an external platform |
| REST API | Provide an explicit software interface to read or change an existing system | Retrieve an order or create a support ticket |
| Webhook / Event Source | Report an external change as it happens | Notify that an invoice failed or a delivery was dispatched |
| MCP Server | Expose selected business capabilities as discoverable AI tools | `check_invoice_status` or `create_support_ticket` |
| MCP Gateway | Govern and route permitted calls from Ember to registered MCP Servers | Offer only the tools approved for the current user and Project |
| External Agent | Own specialized reasoning, state, or multi-step orchestration when bounded tools are insufficient | Proposal, investigation, or invoice-exception agent |

## Governance concepts

**Human Review** -- the explicit point at which an authorized person evaluates AI-generated work
before it becomes trusted knowledge, an approved Artifact, a Method, or an implementation
recommendation. The underlying principle: *AI proposes. Evidence supports. Humans approve.*

**Provenance** -- where information or an output came from: source material, creator, AI
provider/model, prompt/version, conversation, Workstream, timestamp. Provenance answers: *why
should I trust this, and how was it produced?*

**Guardrail** -- what an AI participant or Method may and may not do (e.g. "analyze the repository
but don't modify application code"; "draft the commercial proposal but don't invent pricing").
Guardrails keep experiments inside their intended boundaries.

## Showcase concepts

**Showcase** -- a realistic Project designed to demonstrate and stress-test KBS against a
recognizable business or technical problem (Zadara Knowledge Copilot, CareCall API Discovery,
Semiconductor 8D Investigation, KABATONE Edge AI, HR Policy Copilot). Showcases serve two purposes:
**commercial** (demonstrate what the Workbench can accomplish) and **product development** (reveal
capabilities the Workbench doesn't yet have). A Showcase isn't merely demo data -- it's an
experiment on KBS itself. Each showcase asks: *can KB Sandbox conduct this engagement credibly
today?* If not: *what reusable Workbench capability is missing?*

**Capability Gap** -- something a real Project, Workstream, or Showcase needs that KBS cannot
currently do adequately (multimodal evidence, structured dataset analysis, project hierarchy,
private inference, information classification). Capability Gaps provide evidence for roadmap
decisions rather than automatically becoming features.

## The hierarchy

```
ORGANIZATION
|
+-- PROJECT
|    |
|    +-- Project Knowledge
|    +-- Ember Conversations
|    |
|    +-- WORKSTREAM
|    |    +-- Goal
|    |    +-- Guardrails
|    |    +-- Participants
|    |    +-- Assessments / Evaluations
|    |    +-- Artifacts
|    |
|    +-- WORKSTREAM
|
+-- PROJECT / conceptual SUB-PROJECT
|
+-- PROJECT

WORKBENCH-WIDE
|
+-- Wiki / Handbook
+-- Methods
|    +-- Wizards
+-- AI Providers / Models
+-- Agents (KBS-native)
+-- Builder Registry (External Agents, MCP Servers)
+-- Tools / MCP
+-- Governance
```

One canonical sentence worth learning: **a Project provides the context, a Workstream defines the
work, a Method makes successful work repeatable, and Ember helps the user work with all three.**

## A term deliberately not used

**"Workspace"** is not a KBS term. It sits too close to Workbench and Project without naming
another concept the product actually needs -- people work *in* KBS, but the product itself is the
Enterprise AI Workbench. If a future feature seems to need "Workspace," check first whether it's
actually just a Project, an Organization, or a view onto one of those.
