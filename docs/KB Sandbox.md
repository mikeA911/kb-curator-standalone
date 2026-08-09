# KB Sandbox
## AI Knowledge, Agent Engineering, Evaluation, Governance & Continuous-Learning Workbench

### Revised Executive Summary

KB Sandbox is an AI engineering workbench for building, testing, evaluating, governing, and progressively improving knowledge-grounded AI systems.

It evolves an existing Knowledge Base Curator into a broader environment for professional AI engineering and consulting.

KB Sandbox combines five major capabilities:

```text
KNOWLEDGE
Sources → Curation → LLM Wiki

INTELLIGENCE
Models → Agents → Graphs → Tools

ENGINEERING
Evals → Runs → Traces → Experiments

GOVERNANCE
Inventory → Risk → Controls → Approvals → Audit

LEARNING
Corrections → Training Sets → LoRA / DoRA
```

The platform is not intended to be another visual agent builder or a standalone governance platform.

Its purpose is to provide a controlled engineering environment in which emerging AI technologies can be evaluated while preserving the evidence required to understand:

- what was built
- what models and knowledge it uses
- what data and tools it can access
- how reliably it performs
- where it fails
- what controls apply
- who approved progression
- what changed between versions
- whether an improvement is supported by evidence

The objective is to make AI systems inspectable, measurable, reproducible, controllable, governable, and progressively improvable.

---

# Governance

Governance is a first-class component of KB Sandbox.

The objective is not to reproduce an enterprise Governance, Risk and Compliance platform.

Instead, KB Sandbox should generate and preserve the engineering evidence required for responsible decisions throughout the AI lifecycle.

The governing principle is:

> **Governance should be attached to the AI system and its lifecycle, not added as documentation after the system has been built.**

---

## AI System Inventory

Every significant AI implementation should have an identifiable system record.

An AI system may reference:

```text
AI System
├── Owner
├── Business Purpose
├── Workspace / Project
├── Models
├── Agents
├── Knowledge Sources
├── Data Classification
├── Tools / Integrations
├── Graphs / Workflows
├── Evaluation Suites
├── Risk Classification
├── Controls
├── Approval Status
└── Version History
```

This creates a technical inventory of what actually constitutes the AI solution.

The inventory should be generated from the same configuration used to run the system wherever possible rather than maintained independently.

---

## Risk Classification

Different AI systems require different levels of control.

KB Sandbox should eventually support configurable risk classification based on factors such as:

- business impact
- data sensitivity
- external versus internal use
- degree of autonomy
- ability to modify data
- ability to trigger external actions
- human oversight
- financial or operational consequences
- regulatory considerations
- explainability requirements

For example:

```text
LOWER RISK

Internal knowledge assistant
Read-only
Approved internal sources
No external actions

        ↓

MODERATE RISK

Consultant research agent
External research
Creates recommendations
Human review required

        ↓

HIGHER RISK

Operational agent
Accesses sensitive information
Updates systems
Triggers external actions
```

Risk classification should determine required controls rather than merely provide a label.

---

## Controls

Controls may apply at several architectural layers.

### Knowledge Controls

Examples:

- approved source requirements
- provenance
- data classification
- workspace isolation
- source freshness
- curator approval

### Model Controls

Examples:

- approved model list
- deployment location
- data-retention requirements
- model/version identification
- evaluation thresholds

### Agent Controls

Examples:

- permitted tools
- permitted knowledge sources
- maximum iterations
- cost limits
- prohibited actions
- human escalation
- termination conditions

### Data Controls

Examples:

- sensitive-data restrictions
- masking or anonymization
- retention
- permitted processing location
- access controls

### Output Controls

Examples:

- citation requirements
- structured output validation
- confidence thresholds
- human review
- prohibited content or decisions

### Operational Controls

Examples:

- logging
- monitoring
- rate limits
- failure handling
- rollback
- incident traceability

Where possible, controls should be executable technical constraints rather than policy statements alone.

---

## Human Approval Gates

Higher-risk transitions may require explicit approval.

For example:

```text
EXPERIMENT
    ↓
Evaluation Passed
    ↓
Technical Review
    ↓
Risk / Governance Review
    ↓
Approval
    ↓
Deployment Candidate
```

The exact approval process should remain configurable because organizational governance structures differ.

KB Sandbox should preserve:

- what was submitted
- evaluation evidence
- identified risks
- required controls
- reviewer
- decision
- date
- conditions attached to approval

This provides traceability between experimentation and operational use.

---

## Evaluation Gates

Evaluation and governance should be connected.

A system should not progress solely because someone approves it.

It should also satisfy defined engineering criteria.

Example:

```text
Candidate Configuration

Accuracy        ≥ required threshold
Grounding       ≥ required threshold
Critical fails  = 0
Latency         ≤ accepted limit
Cost            ≤ accepted limit
Security tests  PASS
Required evals  PASS
Human review    COMPLETE
```

Thresholds should depend on the use case and risk classification.

This turns evaluation results into evidence for governance decisions.

---

## Model and Vendor Evaluation

KB Sandbox should support structured comparison of model and vendor alternatives.

Evaluation may include:

- task quality
- reliability
- latency
- cost
- context limitations
- structured-output capability
- tool-calling capability
- deployment options
- data handling
- security considerations
- geographic/data residency requirements
- operational dependencies
- model lifecycle considerations

This allows model selection to incorporate business, technical, operational, and governance factors rather than benchmark performance alone.

---

## Agent Governance

Agentic systems introduce additional governance requirements because they may make decisions and execute tools iteratively.

For every agent, KB Sandbox should make it possible to answer:

**What is this agent permitted to do?**

**What information can it access?**

**What tools can it invoke?**

**What decisions can it make independently?**

**What requires human approval?**

**How many times may it act or retry?**

**How does it terminate?**

**What happened during a particular run?**

The execution graph itself therefore becomes part of the control framework.

```text
Probabilistic reasoning
        ↓
     LLM / Agent

Deterministic boundaries
        ↓
Graph + Permissions + Controls
```

This allows useful autonomy without giving the model unrestricted authority.

---

## Auditability and Evidence

KB Sandbox should preserve sufficient evidence to reconstruct significant AI decisions and experiments.

Depending on the use case, this may include:

```text
System Version
Model Version
Instruction Version
Graph Version
Knowledge Version
Retrieved Evidence
Tool Calls
Agent Trace
Evaluation Results
Human Corrections
Risk Classification
Control Configuration
Approval History
```

The objective is not logging everything indefinitely.

The objective is to retain appropriate evidence for reproducibility, troubleshooting, governance, and audit.

---

## Governance Throughout the Lifecycle

Governance should operate across the complete lifecycle:

```text
DISCOVER
new model / technique / vendor
        ↓
EXPERIMENT
controlled sandbox
        ↓
EVALUATE
quality / reliability / cost / risk
        ↓
CLASSIFY
use case + data + autonomy + impact
        ↓
CONTROL
technical and procedural safeguards
        ↓
APPROVE
decision supported by evidence
        ↓
DEPLOY
approved configuration
        ↓
MONITOR
performance / failures / changes
        ↓
RE-EVALUATE
when system or environment changes
```

A significant model, knowledge, workflow, tool, or instruction change may therefore trigger re-evaluation.

---

## Relationship Between Governance and Learning

Continuous learning must itself be governed.

```text
Observed Failure
      ↓
Diagnosis
      ↓
Human Correction
      ↓
Training Candidate
      ↓
Dataset Review
      ↓
Model Adaptation
      ↓
Evaluation
      ↓
Governance Gate
      ↓
Promote / Reject
```

A fine-tuned model should therefore be treated as a new model version requiring evaluation rather than automatically replacing its predecessor.

The same principle applies to:

- new prompts
- new agents
- new tools
- new graphs
- new knowledge versions
- new retrieval configurations

---

# Revised Product Structure

```text
KB SANDBOX
│
├── KNOWLEDGE
│   ├── Sources
│   ├── Curate
│   └── Wiki
│
├── INTELLIGENCE
│   ├── Agents
│   ├── Graphs
│   ├── Models
│   └── Tools
│
├── ENGINEERING
│   ├── Evals
│   ├── Runs
│   └── Experiments
│
├── GOVERNANCE
│   ├── AI Systems
│   ├── Risk
│   ├── Controls
│   ├── Approvals
│   └── Audit
│
└── LEARNING
    ├── Corrections
    ├── Training Sets
    └── LoRA / DoRA
```

---

# Revised Development Roadmap

Governance should be designed into the data model early but implemented progressively.

### Milestone 1 — Same Curator, No Flowise (implemented)

Preserve existing functionality while removing the Flowise dependency.

**Implemented as a full rebuild on Next.js** (App Router), not an in-place migration of the original Vite SPA — the original repo had defects independent of Flowise (no working document parser, an undocumented/unmigrated schema, client-exposed AI provider keys) that made a rewrite lower-risk than patching around them. The old app is preserved at `legacy-vite-app/` for reference. See [CURRENT-ARCHITECTURE.md](./CURRENT-ARCHITECTURE.md) for the full repository-assessment findings and what changed.

### Milestone 2 — LLM Wiki (implemented)

Canonical, versioned, source-grounded knowledge and contextual Help.

**Implemented as:** `wiki_articles` (stable identity + status: draft/review/approved/archived) with an immutable, insert-only `wiki_versions` history; `current_version_id` on the article only ever moves on admin approval, so editing approved content always creates a new draft version rather than mutating what's live. Provenance is preserved via `wiki_sources` (links to `documents`/`document_chunks`, or an external citation), and "related articles" via a simple `wiki_relations` self-join table — no graph store. Manual and AI-assisted draft creation both land as `draft`; AI-assisted synthesis runs server-side through the same `AIProvider` abstraction used for chunk enrichment, and every call is captured by the existing `ai_operation_logs`. Approved versions may optionally be embedded into a separate `wiki_vectors` table (kept distinguishable from `kb_vectors`), written at approval time — no retrieval UI on top of it yet. Quick Help is resolved by slug (`getQuickHelpBySlug`) and wired into two screens as a proof of concept (`AIProviderSettings`, `DocumentUploader`) via a reusable `HelpTip` component, not scattered as static strings. Full detail: [CURRENT-ARCHITECTURE.md](./CURRENT-ARCHITECTURE.md).

**One deviation from the original brief:** `wiki_articles.knowledge_base_id` is nullable, not required. The brief's suggested schema assumed every article belongs to one curation knowledge base (like a document does), but the 30-article AI-engineering taxonomy below (Embeddings, RAG, Agent Tools, AI Governance, ...) is cross-cutting reference material, not content scoped to `fhir`/`billing`/etc. Forcing a KB assignment would misrepresent what these articles are; the column stays available for the rarer article that *is* KB-specific.

### Milestone 3 — Evals (implemented)

Evaluation datasets, cases, execution, scoring, and results.

**Implemented as:** a versioned `eval_datasets` → `eval_cases` → `eval_runs` → `eval_results` pipeline. A dataset's cases are frozen by RLS the moment it leaves `draft`, so an active benchmark can't be silently invalidated. A run snapshots its full configuration (generation/embedding/retrieval/evaluator) at creation time via `getProviderByName()` rather than the app's global active-provider setting, so historical results stay interpretable after settings change later. Retrieval evaluation is deterministic-first (Hit@K, Recall@K, MRR — no LLM involved) and keeps Wiki evidence and source-chunk evidence explicitly typed throughout, so "Chunks Only / Wiki Only / Wiki + Chunks" is a real run-time configuration rather than something baked into the schema. An optional LLM-as-judge adds qualitative generation/grounding/outcome scoring via `generateStructured()`, but is never the sole evaluator. Human review is preserved in a parallel set of `human_*` columns that never overwrite the automated scores. A per-case pipeline failure produces an explicit `status='failed'` result with a structured error rather than disappearing from the run. The `/evals` UI covers dataset management, run configuration, run summary with baseline comparison, and a per-case drill-down (question / expected / retrieved / answer / scores / failure / human review). Full detail: [CURRENT-ARCHITECTURE.md](./CURRENT-ARCHITECTURE.md#evaluation-engine-milestone-3).

### Milestone 4 — First Graph

Controlled Retrieve → Generate → Evaluate → Retry loop.

### Milestone 5 — RAG Answer Agent

First formal versioned agent.

### Milestone 6 — Runs & Experiments

Tracing, observability, configuration comparison, and model comparison.

### Milestone 7 — Governance Foundation

Introduce:

- AI system inventory
- ownership
- model inventory
- data classification
- risk classification
- control definitions
- evaluation gates
- approval records

Governance should reuse existing system configuration and evaluation evidence rather than require duplicate documentation.

### Milestone 8 — Research & Wiki Agents

Introduce bounded research and knowledge-maintenance agents under the governance model.

### Milestone 9 — Learning

Corrections, validated training datasets, LoRA/QLoRA/DoRA experiments, evaluation, and promotion gates.

---

# Revised Success Criteria

KB Sandbox succeeds when an AI practitioner or consultant can:

1. create a knowledge workspace;
2. ingest and curate source material;
3. build canonical Wiki knowledge;
4. retrieve and inspect supporting evidence;
5. define an agent;
6. constrain it through a graph and permissions;
7. execute the agent;
8. inspect its complete trace;
9. evaluate the result;
10. diagnose failures;
11. compare architectures, models, and vendors;
12. identify the data, models, tools and knowledge used by an AI system;
13. classify its risk;
14. associate controls with that risk;
15. establish measurable promotion criteria;
16. preserve approval and decision evidence;
17. capture human corrections;
18. generate validated training datasets;
19. test model adaptations; and
20. demonstrate measurable improvement.

The objective is not maximum autonomy.

The objective is:

**measurable, inspectable, controllable, governable and progressively improvable AI systems.**