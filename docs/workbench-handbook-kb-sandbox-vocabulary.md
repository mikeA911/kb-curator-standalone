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

**Project Knowledge** -- trusted knowledge made available within a specific Project. It may
originate from uploaded sources, curated information, approved findings, promoted conversations, or
other reviewed material. Project Knowledge provides Ember and Workbench activities with their
project-specific context.

**Wiki / Handbook** -- curated, reusable knowledge intended to explain established concepts rather
than merely preserve raw source material (e.g. this Workbench Handbook). The distinction: *Sources
preserve evidence. Wikis explain what we know.*

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
hosting its code or runtime. Recorded in the **Agent Registry**: name, purpose, owner, a versioned
specification (skills, credential references -- never the secrets themselves -- spending limits,
approval policy), and a **Certification Status**. The Lunch Agent (Food Outlet AI-Readiness
Showcase) is the first example. KBS reaches a registered External Agent's endpoint through a
standard boundary, generally MCP.

**Certification Status** -- the review state of one version of a registered External Agent:
**Experimental -> Sandbox Tested -> Security Reviewed -> Outlet Accepted -> Production Approved**,
with **Deprecated** and **Suspended** as terminal/withdrawn states outside that ladder.
Certification applies to a specific version, not the agent as a whole -- a new version always
starts back at Experimental, since a material code, API, or permission change requires
reassessment.

**Builder** -- a student, solo founder, or local software development company using KBS's governed
Methods, knowledge, and evaluation to build something -- typically an External Agent -- faster than
they could from scratch. The Builders Programme defines three levels: **Explorer** (students/
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

**MCP Server** -- exposes selected tools and context through the Model Context Protocol so AI
clients or Agents can interact with KBS capabilities (or an External Agent's capabilities) in a
standardized way: Workbench capabilities -> APIs/services -> MCP tools -> AI/Agent. MCP is an
integration mechanism, not a product identity.

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
+-- Agents / External Agents (Agent Registry)
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
