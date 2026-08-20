# Guided Workbench Methods & Requirement Reasoning

Revised: 18 Workbench Methods with Requirements

Status: **implemented** (as Handbook content + Assistant reasoning, not dedicated code — see status note below).

## Implementation status (as of 2026-08-20)

- 19 Handbook articles shipped: all 16 method articles (UC1–15, UC18), 3 cross-cutting references (Repository Requirements, Requirement States, Method Dependency Map), plus Requirements sections added to the pre-existing Code Review and Refactoring Plan articles and an updated Workbench Methods Overview.
- The system prompt (`src/lib/chat/loop.ts`) teaches the Assistant to search the Handbook, check a method's Required inputs, ask for what's missing, and name a prerequisite method by name — verified live against this note's own MCP-server/OpenAPI-spec worked example (§23).
- **Gap — no per-project Requirement Status tracking.** §25 describes Available/Needed/Optional/Can-be-produced-elsewhere as a status model; today the Assistant reasons about this conversationally each turn. Nothing is computed or persisted.
- **Gap — no project-level knowledge retrieval.** §28's three-level retrieval order (Approved Project Knowledge → Evidence/Artifacts → Platform Knowledge → Conversation) can't exist yet — there is no vector store over project evidence/artifacts, only the platform Wiki (`search_wiki`).
- **Interpretation, not a gap — no dedicated Wizard UI.** §30's diagram implies method-selection/requirement-checking screens; per this note's own §29 ("do not hard-code eighteen giant conversational flows"), this was built as Handbook content + Assistant reasoning only, with zero new UI screens.
- **Operational note.** The reasoning above sometimes needs two `search_wiki` round trips; the platform's *default* Assistant model (Groq GPT-OSS 20B) occasionally can't finish inside the tool-call budget and falls back to asking the user to rephrase. Groq GPT-OSS 120B has handled every case tested cleanly.
- UC18 (Experiment Replication/Application) has no dedicated "duplicate workstream" tool — by design, consistent with every other method here having no dedicated code, per §22's own "How to do this today" guidance in that article.

This note's own numbering (its title called it "M5"; it was implemented under the internal label "M7") collided with the platform's public roadmap, where M5–M7 already mean something else entirely (Apply / Deploy / Govern). See [Workbench Service Layer & Conversational Assistant](./workbench-service-layer-and-assistant-design.md) for where that numbering came from.

---

1. Purpose
KB Sandbox provides guided Workbench Methods for recurring AI engineering, knowledge, evaluation, and modernization activities.
A method is not simply an automated AI task.
It guides a practitioner through:
Goal → Requirements → Evidence → Scope → Workstreams → Guardrails → Work → Artifacts → Assessment → Human Review → Learning/Handoff
The conversational Workbench Assistant can use these methods as the basis for helping users determine what kind of work they are trying to perform and whether the prerequisites are available.
2. Core Principle
The Workbench should not assume that every activity should be performed internally.
There are three broad execution patterns.
Native Workbench
KB Sandbox can perform the activity itself using its existing capabilities.
Examples include Wiki synthesis, RAG evaluation and controlled graph execution.
External Workstream
KB Sandbox defines and governs the work, but the practitioner uses an external tool such as Claude Code, ChatGPT, Grok, Kimi, DeepSeek, Cursor, Flowise or a local model.
Artifacts are returned to KB Sandbox for review and comparison.
Document-First Engineering
KB Sandbox investigates and produces an evidence-backed engineering specification or implementation handoff.
Actual code modification occurs in an appropriate external development environment.
This should be the default for activities such as refactoring and feature implementation.
3. Common Wizard Structure
Every method should expose roughly the following information.
Goal — what are we trying to accomplish?
Requirements — what must exist before the work can begin?
Optional Inputs — what additional evidence would improve the result?
Method — how should the work be approached?
Deliverables — what should come back?
Assessment — how will we determine whether it worked?
Implementation Boundary — what does KB Sandbox do versus an external tool?
Human Review — what requires human approval?
The Assistant should use Requirements dynamically.
For example:
User: Create an OpenAPI specification for CareCall.

Assistant determines:
OpenAPI Discovery requires access to the source repository. Do you have a Git repository for CareCall?

This is preferable to presenting a large generic form.
4. Repository Requirements
Git repositories should be first-class evidence for software-engineering methods.
Where a Git repository is required, capture:
Repository URL/name
Branch
Commit SHA where possible
Repository visibility
Repository scope
Relevant directories/modules
Supporting documentation
External tool being used
The commit SHA is particularly important for comparative experiments so all participants examine the same code.
KB Sandbox does not need to clone the repository merely because it is recorded as project evidence.
5. UC1 — Organization Knowledge Base
Goal
Create trusted organizational knowledge from approved company information.
Requirements
Required
Organization/project
At least one authoritative information source
Human curator/owner
Optional
Policies
SOPs
Company history
Product documentation
Training materials
Organizational charts
Existing internal Wiki
Git required: No.
Method
Collect → classify → curate → chunk/embed → synthesize → review → approve.
Deliverables
Organization Wiki
Source catalog
Knowledge categories
Provenance
Identified knowledge gaps
Boundary
KB Sandbox can perform much of this natively.
Human approval determines canonical knowledge.
6. UC2 — AI Strategy Comparison
Goal
Compare different AI strategies, models, vendors or tools against the same real-world problem.
Requirements
Required
Common task/question
Common evidence
At least two approaches
Evaluation criteria
Optional
Git repository
Benchmark
Standard prompt
Cost/latency targets
Git required: Depends on experiment.
Method
Create independent workstreams using identical evidence and constraints.
Examples:
Claude vs Grok.
RAG vs long-context.
Agent vs single pass.
Commercial vs local model.
Deliverables
Individual results
Comparison
Evaluation results
Strengths/weaknesses
Recommendation
Boundary
Participants may operate externally.
KB Sandbox records and evaluates the experiment.
7. UC3 — OpenAPI Discovery
Goal
Reconstruct/document an API contract from an existing application.
Requirements
Required
Application source repository
Defined repository scope
Branch/commit
Strongly recommended
Architecture documentation
Existing API documentation
Database/schema information
Git required: Yes.
Standard Deliverables
Capability Inventory
Endpoint Inventory
OpenAPI 3.1 Specification
Findings
Evidence Map
Assessment
System Understanding assessment.
Boundary
The analysis may be performed using Claude Code, ChatGPT or another repository-aware tool.
KB Sandbox receives, evaluates and preserves the results.
8. UC4 — MCP Architecture
Goal
Design an AI-facing MCP interface for an existing system.
Requirements
Required
Validated OpenAPI specification or equivalent API/capability documentation
Understanding of application capabilities
Authentication/authorization information
Recommended
System Understanding results
Architecture documentation
Security requirements
Git required: No for architecture; recommended for implementation planning.
Deliverables
MCP Capability Map
Proposed Tools
Resources
Prompts where appropriate
Authentication model
Authorization boundaries
Human approval requirements
Dangerous-operation classification
MCP architecture
Implementation backlog/handoff
Boundary
KB Sandbox designs the MCP architecture.
Implementation occurs separately unless a future native capability is explicitly introduced.
9. UC5 — Legacy System Understanding
Goal
Determine whether an AI/human practitioner genuinely understands an unfamiliar application.
Requirements
Required
Source repository
Defined analysis scope
Recommended
Architecture documentation
Operational documentation
Database/schema
Existing user stories
Git required: Yes.
Deliverables
Capability understanding
Architecture summary
Integration inventory
Security model
Data-flow understanding
Unknowns
Evidence map
Assessment responses
Assessment
A versioned System Understanding benchmark should preferably be written independently of the participant performing the analysis.
10. UC6 — Architecture Review
Goal
Evaluate an application's existing architecture.
Requirements
Required
Architecture evidence
This may be:
repository;
architecture documentation;
diagrams;
or a combination.
Recommended
Non-functional requirements
Deployment architecture
Known operational problems
Git required: Recommended, not mandatory.
Review Areas
Scalability
Reliability
Maintainability
Security
Data architecture
Integration
Observability
Technical debt
AI readiness
Deliverables
Architecture Review Report, findings, evidence, risks and recommendations.
Boundary
Review and recommendation, not autonomous architecture modification.
11. UC7 — Code Review Comparison
Goal
Compare multiple reviewers/models against the same code.
Requirements
Required
Git repository
Fixed commit/PR/diff
Two or more participants
Common review instructions
Recommended
Review rubric
Architecture/context
Expected behavior/tests
Git required: Yes.
Deliverables
Independent reviews
Finding comparison
Agreement/disagreement
Unique findings
False positives
Missed issues
Overall comparison
Assessment
A human-reviewed ground truth can be added where practical.
12. UC8 — Documentation Recovery
Goal
Reconstruct missing or obsolete technical documentation.
Requirements
Required
Source implementation or other authoritative system evidence
Recommended
Existing documentation, even if outdated
Architecture diagrams
Database schema
Deployment/configuration information
Git required: Usually yes for software documentation recovery.
Deliverables
Potentially:
System overview
Architecture documentation
Component inventory
API/integration documentation
Data flows
Configuration/deployment overview
Evidence map
Known uncertainties
Boundary
KB Sandbox produces documentation for human review.
13. UC9 — Security Review
Goal
Perform an evidence-based AI-assisted security review.
Requirements
Required
Authorized access to review material
Defined security scope
Explicit read-only guardrail
Recommended
Repository
Architecture
Configuration
Authentication design
Deployment architecture
Git required: Usually yes for code-level review; no for architecture-only review.
Deliverables
Security findings
Severity
Evidence
Authentication/authorization analysis
Data exposure concerns
Integration/webhook findings
Required human/runtime verification
Boundary
Review only.
No exploitation, unauthorized testing or autonomous remediation.
14. UC10 — AI Model Evaluation
Goal
Determine which AI model best fits a particular organizational task.
Requirements
Required
Defined task
Test material
Candidate models
Evaluation criteria
Recommended
Benchmark dataset
Expected answers
Cost/latency requirements
Privacy constraints
Git required: Only for software-oriented evaluations.
Deliverables
Comparison of:
Correctness
Completeness
Grounding
Reliability
Cost
Latency
Uncertainty handling
Operational considerations
Boundary
KB Sandbox should favor evidence from the organization's actual workload over generic leaderboard scores.
15. UC11 — RAG Strategy Experiment
Goal
Determine which retrieval/generation strategy works best for a knowledge corpus.
Requirements
Required
Knowledge corpus
Benchmark questions
Evaluation criteria
Recommended
Expected answers/relevance judgments
Multiple retrieval configurations
Git required: No.
Possible Experiments
Chunking strategy
Embedding model
Top-K
Reranking
Hybrid retrieval
Single-pass RAG
Graph retry
GraphRAG
RAG vs long context
Deliverables
Configuration snapshots, eval results, comparison and recommendation.
Boundary
Primarily native KB Sandbox evaluation functionality.
16. UC12 — Local vs Cloud AI
Goal
Determine whether an AI workload should use local/private models, cloud models or a hybrid.
Requirements
Required
Representative task
Representative evidence/data
At least one cloud and one local/private candidate
Evaluation criteria
Recommended
Hardware details
Privacy requirements
Cost constraints
Latency requirements
Git required: Depends on workload.
Deliverables
Quality, privacy, cost, latency, hardware and operational comparison.
Outcome
Recommendation:
Cloud / Local / Private / Hybrid
17. UC13 — Agent Design
Goal
Convert a sufficiently understood workflow into a controlled AI agent design.
Requirements
Required
Known workflow
Defined goal
Known evidence/sources
Success criteria
Guardrail
Recommended
Existing project/workstream demonstrating the human process
Available tool definitions
Evaluation benchmark
Git required: No, unless the agent operates on software.
Deliverables
Agent definition
Permitted tools
Permitted sources
Graph/workflow
Iteration limits
Cost limits
Termination conditions
Human escalation
Evaluation plan
Principle
Understand the workflow before automating the workflow.

18. UC14 — AI Readiness Assessment
Goal
Identify where AI could realistically improve an existing organization, product or process.
Requirements
Required
Business/process context
Defined assessment scope
Human stakeholder
Recommended
Process documentation
Architecture
Repository for software products
Policies
Current pain points
Business objectives
Git required: No.
Deliverables
Capability/process inventory
Candidate AI opportunities
Data requirements
Integration requirements
Risks
Human oversight requirements
Prioritized experiment recommendations
Boundary
The output is an evidence-based opportunity map, not automatic AI implementation.
19. UC15 — Legacy Feature Introduction
Goal
Design how a new feature/user story should be safely introduced into an existing application.
Requirements
Required
Git repository
User story
Acceptance criteria
Fixed branch/commit
Recommended
OpenAPI specification
MCP definition
Architecture documentation
Project Wiki
Existing tests
Git required: Yes.
Analysis
Determine:
existing capabilities that can be reused;
affected components;
API impact;
MCP impact;
data impact;
RBAC/security impact;
regression risks;
tests required.
Deliverables
Feature Impact Report
Capability Reuse Map
Architecture Change Proposal
API Impact Assessment
MCP Impact Assessment
Security/RBAC Assessment
Implementation Plan
Acceptance/Test Plan
Implementation Handoff
Boundary
KB Sandbox designs the change.
The developer/coding AI implements it elsewhere.
20. UC16 — Code Review
Goal
Perform a structured, evidence-backed review of an application or code change.
Requirements
Required
Git repository
Branch/commit/PR/diff
Review scope
Recommended
Architecture documentation
Requirements/user story
Coding standards
Existing tests
Git required: Yes.
Review Dimensions
May include:
Correctness
Security
Maintainability
Architecture
Error handling
Authorization
Performance
Test coverage
Technical debt
Deliverables
Code Review Summary
Detailed Findings
Evidence Map
Risk/Priority Matrix
Recommended Change Plan
Verification/Test Plan
Boundary
KB Sandbox does not modify the code.
The approved review package becomes an external implementation handoff.
21. UC17 — Refactoring Plan
Goal
Design a safe, staged refactoring strategy for an existing application.
Requirements
Required
Git repository
Defined refactoring scope
Branch/commit
Strongly recommended
Existing architecture
Tests/test coverage
Known technical debt
Business constraints
Useful
OpenAPI
MCP architecture
Project Wiki
Deployment constraints
Git required: Yes.
Analysis
Identify:
coupling;
duplicated logic;
business-rule locations;
service boundaries;
authorization boundaries;
data access;
external integrations;
high-risk components;
missing regression coverage.
Deliverables
Current-State Architecture
Refactoring Findings
Target Architecture
Proposed Boundaries
Staged Refactoring Plan
Regression Risk Assessment
Required Test Plan
Rollback/Safety Plan
Implementation Handoff
Boundary
KB Sandbox produces the refactoring specification. It does not perform the refactoring.

22. UC18 — Experiment Replication / Application
I think this deserves first-class status rather than remaining a cross-cutting feature.
Goal
Take an existing Workbench experiment or published example and repeat or apply its method using a different model, tool, repository, dataset or organization.
There are two useful modes.
Replicate
Keep the original experimental conditions as close as possible.
Example:
CareCall OpenAPI Discovery was performed with Claude, OpenAI and Grok. Replicate it using DeepSeek.

Apply
Reuse the proven methodology against another target.
Example:
Apply the CareCall OpenAPI Discovery method to our legacy billing application.

This distinction is useful.
Requirements
Replication
Required
Existing Workbench experiment
Original method/version
Original prompt version
Guardrail version
Deliverable definitions
Assessment/evaluation criteria
Recommended
Same source/repository commit
Same benchmark
Same constraints
Git required: If the original experiment requires Git.
Application
Required
Existing Workbench method/template
New target
Required evidence for that method
For example, applying OpenAPI Discovery requires a new Git repository.
Git required: Determined by the underlying method.
Wizard Behavior
The user selects:
Replicate / Apply this experiment

Then chooses what changes.
For example:
Original
Project: CareCall
Method: OpenAPI Discovery
Repository: CareCall
Commit: abc123
Participant: Claude
Assessment: System Understanding v1
Replication
Change only:
Participant: DeepSeek
Everything else remains fixed.
Application
Change:
Repository: Legacy Billing
Commit: xyz789
while retaining:
Method
Guardrail
Prompt structure
Deliverables
Assessment structure
where appropriate.
Deliverables
Replication produces:
new independent Workstream;
same expected artifact structure;
same evaluation structure;
comparison against previous participants.
Application produces:
new Project/Workstream;
adapted method configuration;
artifacts for the new target;
comparison to the reference experiment where meaningful.
Boundary
Replication/application should preserve the original experiment.
Never modify the historical experiment to accommodate the new run.
23. Assistant Requirement Resolution
The addition of explicit Requirements makes the conversational Assistant much more useful.
The Assistant shouldn't merely map:
“OpenAPI” → OpenAPI Wizard.

It should determine readiness.
For example:
User
I want to create an MCP server for our scheduling platform.

Assistant
Based on the MCP Architecture method, I need to establish what interface documentation already exists.
Do you have an OpenAPI specification or equivalent API documentation?
User
No. Just the source code.

The Assistant can reason:
Then OpenAPI Discovery is probably the appropriate preceding Workbench method. That requires a Git repository. Do you have access to one?

This allows method chaining naturally.
24. Method Dependency Map
The 18 methods should not become a rigid waterfall, but some have natural relationships.
For software modernization:
             AI Readiness
                  │
                  ▼
        Legacy System Understanding
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
Documentation  Security   Architecture
  Recovery      Review       Review
       │          │          │
       └──────────┼──────────┘
                  ▼
            OpenAPI Discovery
                  │
                  ▼
            MCP Architecture
                  │
                  ▼
       Legacy Feature Introduction
For software quality:
Code Review
     │
     ▼
Refactoring Plan
     │
     ▼
External Implementation
     │
     ▼
Code Review / Evals
For AI experimentation:
AI Strategy Comparison
        │
        ├── AI Model Evaluation
        ├── RAG Strategy Experiment
        ├── Local vs Cloud
        └── Code Review Comparison
                 │
                 ▼
         Replicate Experiment
These are recommendations, not mandatory dependencies.
25. Wizard Requirement States
I'd have Claude introduce a simple conceptual status for requirements:
Available — KB Sandbox already has it.
Needed — user must provide it.
Optional — useful but not required.
Can be produced by another Workbench Method — especially interesting.
For example:
MCP Architecture
Requirement	Status
OpenAPI specification	Needed
System understanding	Available
Architecture docs	Optional
Security constraints	Needed


If OpenAPI is missing:
Can be produced with: OpenAPI Discovery

That lets the Assistant effectively assemble a plan of work.
26. Implementation Handoff as a Common Artifact
For document-first engineering methods, introduce a common conceptual artifact:
Implementation Handoff
Used by:
MCP Architecture
Architecture Review where changes are recommended
Security Review remediation
Legacy Feature Introduction
Code Review
Refactoring Plan
potentially Documentation Recovery
The handoff should contain enough information for a developer or coding AI with no prior conversation context to continue.
Minimum sections:
Context
Objective
Repository/commit
Evidence
Scope
Constraints
Findings
Proposed change
Risks
Tests/acceptance criteria
Human decisions
Provenance
That gives you a standard bridge:
KB Sandbox → Claude Code / ChatGPT / Cursor / Developer

27. Human Review
Every method should explicitly identify where human judgment occurs.
The Assistant can:
recommend
retrieve
analyze
compare
draft
structure
create approved Workbench objects
But important transitions remain human-controlled:
AI Finding
    ↓
Human Review
    ↓
Approved Artifact
and:
Conversation
    ↓
Human Promote
    ↓
Project Knowledge
and:
Implementation Proposal
    ↓
Human Approval
    ↓
External Implementation
This remains one of the distinguishing characteristics of KB Sandbox.
28. Knowledge and Memory
The Wizard framework should eventually operate against three knowledge levels:
Platform Knowledge
Workbench Handbook, Foundation Wiki and shared methodologies.
Project Knowledge
Approved Project Wiki, promoted findings, artifacts and assessments.
Conversation Context
Current Assistant conversation and conversation memory.
These should not have equal authority.
A useful retrieval preference is:
Approved Project Knowledge → Evidence/Artifacts → Platform Knowledge → Conversation Memory
depending on the question.
Conversation memory provides continuity but does not automatically become canonical knowledge.
29. Design Principle for the Assistant
Do not hard-code eighteen giant conversational flows.
The Assistant should retrieve method definitions from the Workbench Handbook and reason about:
What is the user's goal?

Which method fits?

What does that method require?

Which requirements are already available?

What is missing?

Can another Workbench method produce the missing prerequisite?

What should KB Sandbox produce?

Where does external implementation begin?

This makes adding UC19 later primarily a knowledge/method addition rather than another large Assistant feature.
30. Definition of the Workbench Wizard Layer
The overall architecture becomes:
                  USER GOAL
                      │
                      ▼
             WORKBENCH ASSISTANT
                      │
                      ▼
              METHOD SELECTION
                (18 methods)
                      │
                      ▼
             REQUIREMENT CHECK
                      │
             ┌────────┴────────┐
             │                 │
          Missing           Available
             │                 │
             ▼                 │
     Recommend prerequisite    │
        Workbench Method       │
             │                 │
             └────────┬────────┘
                      ▼
               CREATE WORKBENCH
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Evidence   Workstreams  Guardrails
          │           │           │
          └───────────┼───────────┘
                      ▼
                     WORK
                      │
                      ▼
                  ARTIFACTS
                      │
                      ▼
              ASSESS / REVIEW
                      │
             ┌────────┴────────┐
             ▼                 ▼
       PROJECT KNOWLEDGE    HANDOFF
             │                 │
             ▼                 ▼
          LEARNING       EXTERNAL WORK
That, I think, is the more mature version of the original M5 Workbench Wizards & Guided Use Cases design.