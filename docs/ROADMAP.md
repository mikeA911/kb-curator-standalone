# KB Sandbox Roadmap

**Status:** Living internal roadmap aligned to the public About page  
**Last updated:** 28 August 2026

## How to read this roadmap

The public About page is the roadmap authority. Its ten milestones, names, order, descriptions, and public status form the permanent structure of this document. Internal development labels such as M5A, M5F, M6D, and M6E describe implementation increments; they do not replace or renumber the public roadmap.

Each milestone can continue to gain capabilities after its core is live. Internal work is placed under the public milestone whose product outcome it advances, even when the work spans several technical layers.

Status terms used below:

- **Live:** The public milestone's core capability is built and usable.
- **Recent:** Implemented recently or reported as implemented and validated in the current development environment.
- **Validate:** Implemented, but a specific behavior or operational assumption still needs direct confirmation.
- **Next:** A concrete development gap or near-term decision.
- **Future:** Directional work that needs further design before implementation.

## Roadmap at a glance

| Milestone | Public name | Public definition | Public status |
|---|---|---|---|
| M1 | Curate | Turn sources into approved evidence. | Live |
| M2 | Organize | Turn evidence into structured knowledge. | Live |
| M3 | Evaluate | Measure whether AI actually works. | Live |
| M4 | Orchestrate | Build controlled iterative workflows. | Live |
| M5 | Apply | Agents + consulting workstreams. | Live |
| M6 | Deploy | Cloud / local / private / hybrid. | Planned |
| M7 | Govern | Risk + controls + guardrails + approvals. | Planned |
| M8 | Communicate | Findings + executive reports. | Planned |
| M9 | Teach | Consultant learning paths. | Planned |
| M10 | Research | Advanced retrieval / knowledge / autonomy. | Planned |

---

## M1 — Curate

**Public definition:** Turn sources into approved evidence.  
**Public status:** Live

### Delivered foundation

- Authenticated curation workflow for uploading, parsing, chunking, enriching, reviewing, and embedding source material.
- Human approval boundaries and source-level provenance.
- Knowledge-base isolation, role-based access, and the AI provider abstraction used by later milestones.

### Recent internal development

- Workstream artifacts can serve as first-class evidence alongside uploaded documents and document chunks.
- The artifact model has expanded to cover structured engineering outputs, design notes, findings, evidence maps, and implementation handoffs.

### Next

- Define consistent evidence metadata for software repositories: repository URL/name, visibility, branch, commit SHA, scope, relevant paths, supporting documents, and external tool.
- Make evidence completeness visible before a method or workstream begins.
- Clarify which project records are eligible for retrieval before they have passed a promotion and approval process.

### Future

- Add richer evidence ingestion while retaining the distinction between raw evidence, reviewed knowledge, and conversational context.
- Support additional private and enterprise evidence sources without weakening project isolation or provenance.

---

## M2 — Organize

**Public definition:** Turn evidence into structured knowledge.  
**Public status:** Live

### Delivered foundation

- Versioned Wiki articles with draft, review, approval, archive, source-linking, and related-article lifecycles.
- Manual and AI-assisted authoring, with human approval determining the canonical version.
- Separate vectors for source chunks and approved Wiki knowledge.

### Recent internal development

- Added the Workbench Handbook Wiki category.
- Added dual-source Handbook authoring: manual methodology content and AI-assisted synthesis grounded in workstream artifacts.
- Added the 18-method Workbench catalog plus cross-cutting guidance and requirements sections to Assistant knowledge.
- Taught the Assistant to find a matching method, inspect its requirements, and identify prerequisite methods when required evidence is missing.

### Next

- Implement project-scoped knowledge retrieval. The intended order inside a project is:
  1. approved Project Knowledge;
  2. approved project evidence, artifacts, and findings where permitted;
  3. approved platform Handbook/Wiki knowledge;
  4. conversation context for interaction only, never silently as canonical knowledge.
- Build **Promote Conversation to Project Knowledge** as a selective, human-reviewed lifecycle with conversation and model provenance.
- Version, supersede, retire, chunk, and embed approved Project Knowledge.

### Future

- Add knowledge-quality and freshness signals so the Assistant can distinguish current, superseded, incomplete, and disputed knowledge.
- Support reusable knowledge across projects only through an explicit review and publication boundary.

---

## M3 — Evaluate

**Public definition:** Measure whether AI actually works.  
**Public status:** Live

### Delivered foundation

- Versioned evaluation datasets, cases, runs, results, deterministic retrieval metrics, optional LLM judging, human review, and baseline comparison.
- Evaluation across source chunks, Wiki knowledge, or both.
- Provider/model configuration snapshots so historical results remain interpretable.

### Recent internal development

- The Assistant can select generation-capable models from the AI registry rather than relying on hard-coded model names.
- Assistant messages retain durable provider/model snapshots, allowing model changes within one conversation without rewriting history.
- Guided-method reasoning has been tested against representative requirement-resolution scenarios.

### Validate

- Evaluate Assistant reliability on multi-step method and prerequisite reasoning, including tool-loop completion, grounding, latency, and fallback frequency.
- Confirm the best default Assistant model. The current smaller default has shown occasional iteration-budget failures in reported testing, while a larger model completed the same scenarios more reliably.

### Next

- Define a pre-beta Assistant evaluation rubric covering correctness, grounding, method fit, prerequisite detection, safe action boundaries, provenance, latency, and recovery from tool failure.
- Record basic Wizard/method outcomes so the product can learn which guided methods work in practice.
- Establish the evaluation criteria for the first external pilot.

### Future

- Compare models, prompts, retrieval strategies, tools, and guided methods on shared project tasks rather than generic benchmarks alone.
- Add experiment views and leaderboards only where they preserve configuration, evidence, and review context.

---

## M4 — Orchestrate

**Public definition:** Build controlled iterative workflows.  
**Public status:** Live

### Delivered foundation

- Versioned, bounded graph execution with state, nodes, edges, conditional transitions, termination, retry limits, and traces.
- A controlled RAG retry graph that keeps execution policy outside the model.
- Versioned Agent foundations that execute through the graph runtime.

### Recent internal development

- Added a shared Workbench service layer for projects, workstreams, AI providers, and identity.
- Server Actions and internal AI tools call the same services and authorization rules.
- Added an in-process MCP-style tool contract with six tools: Wiki search, project-note listing, project creation, project approval, workstream creation, and artifact attachment.
- Added the bounded Assistant tool-calling loop and raised its iteration allowance to support legitimate multi-step requirement reasoning.

### Next

- Extend controlled tools only from concrete method needs; do not create broad autonomous permissions.
- Improve tool-loop diagnostics, error recovery, and evaluation traces.
- Decide which Assistant actions may be proposed, which require explicit confirmation, and which should never be executable.

### Future

- Add reusable orchestration patterns for implemented Wizards without hard-coding 18 separate flows.
- Consider external MCP transport only when a real external consumer and authorization design justify it.

---

## M5 — Apply

**Public definition:** Agents + consulting workstreams.  
**Public status:** Live

### Delivered foundation

- Agent Templates and a first formal RAG Answer Agent.
- Projects, membership, isolation, workstreams, deliverables, assessments, project notes, and external artifact capture.
- Support for native Workbench execution, externally performed workstreams, and document-first engineering handoffs.

### Recent internal development

- Added the first in-app Conversational Workbench Assistant with persisted conversations and messages.
- Added model identity, per-message provenance, next-message model selection, mid-conversation model switching, response details, and a real polling-based activity indicator.
- Added narrow Assistant provenance to the three writable record types currently exposed through tools: projects, workstreams, and workstream artifacts.
- Added `implementation_handoff` as a first-class artifact type.
- Established the document-first boundary: the Workbench investigates, compares, reviews, and produces implementation-ready artifacts; it does not default to modifying target repositories, committing code, opening pull requests, or deploying systems.
- Added conversational method-fit and requirement reasoning over the 18-method Handbook catalog.

### Validate

- Confirm specific live activity labels in the UI during sufficiently long tool calls. The label mapping and polling path exist, but reported live tests completed too quickly to observe more than the generic fallback.
- Complete pre-beta testing with a small set of authenticated users and realistic project questions.

### Next

- Implement project-level **Requirement Status** for method prerequisites, using at least: Available, Needed, Optional, and Can Be Produced Elsewhere.
- Decide whether the first Wizard experience remains conversation-led or gains a thin visual setup/review surface. Any UI should be metadata-driven rather than 18 bespoke flows.
- Select the first 2–4 methods for deeper guided support based on value and observed demand.
- Extend **Legacy Feature Introduction** and **MCP Architecture** with AI-accessible capability discovery, business-rule and authority mapping, and capability-to-API-to-MCP traceability. First validate the approach on KB Sandbox through a committed Capability and Navigation Catalogue; external MCP transport remains a later decision. See `docs/dev-request-ai-accessible-application-discovery-and-mcp-method-extension.md`.
- Instrument unmet-method demand without retaining unnecessary conversation content.
- Make Assistant-proposed state changes consistently reviewable before execution.

### Future

- Add more controlled tools only where service-layer authorization, provenance, confirmation, and evaluation are defined.
- Preserve external-workstream interoperability with Claude Code, Codex, Cursor, local/private models, specialist tools, and future integrations.
- Autonomous code-writing remains outside the current product boundary and would require a separate safety and architecture decision.

---

## M6 — Deploy

**Public definition:** Cloud / local / private / hybrid.  
**Public status:** Planned

### Current foundations

- Model-neutral provider registry separates generation models from embedding models.
- Cookie-based identity is live; bearer-token identity resolution is implemented and tested but intentionally unused until a non-cookie caller or external transport exists.
- Internal tools are transport-independent and currently invoked in-process.

### Next

- Define supported deployment profiles for hosted cloud, customer cloud, private network, local models, and hybrid configurations.
- Document capability differences, data boundaries, identity paths, observability, secrets, and operational responsibilities for each profile.
- Decide when bearer-token callers and external MCP transport are justified by a real deployment need.

### Future

- Add deployment validation, health checks, provider failover policy, and environment-specific model availability.
- Support private/local providers without presenting deployment location as a proxy for quality, security, or compliance.

---

## M7 — Govern

**Public definition:** Risk + controls + guardrails + approvals.  
**Public status:** Planned

### Current foundations

- Human review gates for curated chunks and canonical Wiki knowledge.
- Project roles, RLS isolation, evidence provenance, evaluation history, Agent/workstream guardrail fields, and Assistant creation-path provenance.
- Controlled tool registry and a bounded Assistant loop.

### Next

- Define the governance foundation: AI system inventory, accountable ownership, model inventory, data classification, risk classification, control definitions, evaluation gates, approval records, and audit evidence.
- Replace free-text-only guardrails with reusable, versioned guardrail templates where runtime enforcement is meaningful.
- Define the confirmation and approval policy for each Assistant tool.
- Define retention and privacy boundaries for demand events, conversations, project knowledge, tool records, and model provenance.

### Future

- Connect governance records to existing configurations, evaluations, evidence, and approvals instead of requiring duplicate documentation.
- Add risk-tier-aware controls and promotion gates for Agents, models, knowledge, and deployment profiles.

---

## M8 — Communicate

**Public definition:** Findings + executive reports.  
**Public status:** Planned

### Current foundations

- Workstream artifacts, findings, evidence maps, assessments, project notes, public project examples, design notes, and implementation handoffs.
- Provider/model and creation-path provenance for Assistant-generated records.

### Next

- Define reviewed report types for technical findings, management briefs, comparison reports, decision records, and implementation handoffs.
- Generate reports from approved evidence and findings while preserving citations, uncertainty, model/tool provenance, and human sign-off.
- Make project status, unresolved questions, decisions, and deliverables easy to summarize without treating raw chat as authoritative.

### Future

- Add audience-specific report views and export formats.
- Support recurring portfolio and governance reporting once ownership, risk, and approval records exist.

---

## M9 — Teach

**Public definition:** Consultant learning paths.  
**Public status:** Planned

### Current foundations

- Workbench Handbook, approved Wiki lifecycle, curated public examples, visible methods, evaluations, artifacts, and review history.
- The 18-method catalog provides a shared vocabulary for applied AI engineering and consulting work.

### Recent internal development

- The Assistant can map a stated objective to a documented method, identify missing required inputs, and point to a prerequisite method rather than pretending unavailable automation exists.

### Next

- Turn selected methods into guided learning projects with goals, prerequisites, evidence, steps, deliverables, assessments, human review points, and reusable handoffs.
- Define role-appropriate learning paths for practitioners, consultants, curators, reviewers, and project owners.
- Use evaluation and reviewed artifacts to assess demonstrated capability, not course completion alone.

### Future

- Add reusable templates, mentoring/review workflows, and sanitized case studies.
- Preserve the distinction between training exercises and client/project evidence.

---

## M10 — Research

**Public definition:** Advanced retrieval / knowledge / autonomy.  
**Public status:** Planned

### Current foundations

- Separate source and Wiki vector stores, RAG evaluation, graph orchestration, versioned Agents, and controlled tool calling.
- Multi-model workstreams make independent findings and blind spots comparable against shared evidence.

### Next

- Research project-scoped retrieval across approved knowledge, artifacts, findings, and platform knowledge with explicit source labeling.
- Compare chunking, embeddings, reranking, retrieval strategies, models, and tool-use policies on representative workloads.
- Establish research protocols, reproducibility requirements, evaluation rubrics, and promotion gates before introducing more autonomy.

### Future

- Bounded research and knowledge-maintenance Agents that propose claims or Wiki updates for human approval.
- Advanced retrieval, knowledge-quality, and multi-agent comparison methods.
- Any expansion toward autonomous action must remain permissioned, observable, reversible where possible, evaluated, and subject to explicit human review.

---

## Near-term cross-milestone priorities

These priorities span the roadmap but should remain attached to the public milestone outcomes above:

1. **Stabilize the Assistant:** complete pre-beta validation, verify activity feedback, measure tool-loop reliability, and decide the default model.
2. **Add project knowledge:** implement reviewed promotion, project-scoped retrieval, provenance, versioning, and retirement.
3. **Make requirements durable:** persist method prerequisite status and use it to drive conversation, setup, and review.
4. **Pilot thin Wizards:** choose 2–4 high-value methods, add only the reusable UI and automation they need, and retain manual guidance for the rest.
5. **Measure demand and outcomes:** record privacy-conscious unmet-method demand and basic method/Wizard results.
6. **Run a real pilot:** use one sanitized modernization or organizational-knowledge problem and let observed gaps influence prioritization.

## Roadmap maintenance rules

- Keep the M1–M10 public names, order, descriptions, and public status aligned with `src/app/(public)/about/page.tsx`.
- Add internal development beneath these milestones; do not create a competing top-level milestone sequence.
- Mark capabilities as live only when their core path is usable, not merely designed or migrated.
- Separate repository implementation, deployed database/content state, validation evidence, and future intent.
- Record deliberate deferrals as deferrals, not defects; record unverified behavior as validation work, not completion.
- Preserve provenance, evidence boundaries, project isolation, and human approval in every milestone.
- Treat later build evidence and direct product decisions as higher-priority than older design notes.

## Supporting references

- Public roadmap: `src/app/(public)/about/page.tsx`
- Current implementation architecture: `docs/CURRENT-ARCHITECTURE.md`
- Product brief and earlier roadmap history: `docs/KB Sandbox.md`
- Workbench service layer and Assistant design: `docs/design-notes/workbench-service-layer-and-assistant-design.md`
- Assistant identity, provenance & document-first principle: `docs/design-notes/assistant-identity-provenance-design.md`
- Guided methods design: `docs/design-notes/guided-workbench-methods-design.md`
