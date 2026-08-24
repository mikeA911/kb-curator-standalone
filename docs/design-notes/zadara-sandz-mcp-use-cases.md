# Zadara + Sandz: MCP Use Cases (Worked Example)

**Status:** Draft for discussion with Sandz and Zadara
**Relationship:** Worked example for the "MCP Architecture" Workbench method (`docs/workbench-handbook-mcp-architecture.md`) and UC3/UC4 in `docs/design-notes/guided-workbench-methods-design.md`

## Overview

Sandz Solutions is a Zadara storage partner. Two candidate use cases are described below, sequenced deliberately by risk:

1. **A read-only knowledge copilot** (Phase 1) — no connection to any live Zadara system, built entirely on curated documents and kbSandbox's existing chat interface.
2. **A live MCP server fronting Zadara's own VPSA REST API** (Phase 2+) — a materially bigger, later-phase effort that requires real cooperation and infrastructure access from both Sandz and Zadara.

The first is buildable now. The second is a pitch to bring to both companies once the first has demonstrated value.

## Use Case 1: Sandz Knowledge Copilot (Phase 1 — read-only, no live connection)

Sandz employees would use the existing kbSandbox chat interface to ask natural-language questions. Retrieval would find the relevant Zadara material and generate an answer grounded in approved sources — without connecting to or changing a customer's live storage environment.

### Initial knowledge sources

The knowledge base could contain:

- Zadara product and administration guides
- API guides and release notes
- Sandz product descriptions and service catalogues
- Reference architectures and sizing guides
- Approved proposal templates and pricing rules
- Support runbooks and escalation procedures
- Resolved tickets and post-incident reports
- Customer contracts, SLAs and configurations, with access controls
- Customer emails and complaint histories where appropriate

### Proposal support

An employee could ask:

> "Draft a storage proposal for a Philippine bank requiring 500 TB usable object storage, local data residency, immutable backups and three-year growth to 1 PB."

kbSandbox could:

- Identify potentially applicable Zadara capabilities
- Ask for missing requirements
- Recommend an architecture for an engineer to review
- Draft the technical solution and scope
- Produce assumptions, exclusions and clarification questions
- Find similar previous Sandz proposals
- Cite the source material supporting each important claim

Commercial pricing and final sizing should remain subject to sales and solution-architect approval.

### Client complaint support

A support engineer could ask:

> "The customer says object-storage uploads became slower after adding capacity. What should we investigate?"

kbSandbox could:

- Search the administration guide, release notes and internal runbooks
- Suggest a structured diagnostic checklist
- Identify relevant capacity, controller, network and performance metrics
- Find similar previous cases
- Draft a customer-safe response
- Recommend when and how to escalate to Zadara

Initially, the employee would paste in the symptoms or upload logs. Later, read-only API integration could retrieve relevant health information automatically.

### Important boundary

The first version should distinguish three response types:

- **Documented fact** — directly supported by an approved source and citation.
- **Reasoned recommendation** — an inference based on documented facts.
- **Missing information** — a question or escalation rather than a guessed answer.

That distinction is crucial for enterprise proposals and incident handling.

### Recommended pilot

A practical four-week pilot could focus on two workflows:

1. **Proposal Copilot** — produce an initial solution brief, assumptions and bill-of-material inputs.
2. **Support Copilot** — investigate a complaint and produce an internal diagnostic plan plus a customer response.

Use Zadara's public documentation first, then add Sandz's internal material after permissions and separation are established. Evaluate:

- Time saved per proposal or ticket
- Accuracy and citation quality
- Number of unsupported claims
- Employee acceptance
- Percentage of drafts requiring substantial correction
- Time to find the correct procedure
- Reduction in unnecessary escalations

One caveat: public documentation alone will produce technically useful but fairly generic answers. The real competitive value appears when Sandz adds its private proposals, pricing rules, customer configurations, resolved incidents and engineering practices. At that point kbSandbox begins capturing Sandz's institutional knowledge — not merely searching Zadara manuals.

## Use Case 2: kbSandbox as an MCP server for Zadara's VPSA API (Phase 2+ — future)

This is framed explicitly as a later phase, and as a joint pitch to both companies — not something to build now. It requires real Zadara/Sandz cooperation: a live VPSA instance and an API token, neither of which can be substituted with public documentation alone.

What's already known, from checking Zadara's own published material directly:

- Zadara already publishes a complete, versioned REST API reference for VPSA (`vpsa-api.zadarastorage.com`, versions 20.01 through 23.03) covering 19 resource categories — Volumes, Pools, Drives, RAID Groups, Snapshots, Snapshot Policies, Consistency Groups, Servers, Controllers, Mirroring/Cloning, Remote object storage, Images, Containers, Users, Roles, NAS, Logs, Tickets, Settings — roughly 150+ operations once fully enumerated. It is not itself an OpenAPI/Swagger file, so "verify the OpenAPI specification" here means transcribing this published reference into a real OpenAPI 3.1 document: mechanical, low-risk work, and a materially better starting position than the "no documentation at all" case most legacy-modernization MCP work starts from.
- Auth is per-VPSA — an API token scoped to one tenant's storage array, sent via the `X-Access-Key` header. That's a clean fit for tenant isolation, but it also means nothing beyond spec-writing can be built or tested without a real Zadara/Sandz VPSA and a live token. That dependency sits with Sandz and Zadara, not with kbSandbox.
- A concrete illustration of why tools must be designed around business actions, not mechanical endpoint conversion: `POST /api/volumes` (create a volume) alone exposes roughly 35 raw parameters — SMB ACL flags, NFS squash settings, dedupe/compress, encryption, QoS capping, autoexpand. A real MCP tool would collapse this to something like `create_volume(name, capacity_gb, pool_id, kind, protection_preset)`, with the remaining parameters either defaulted or reserved for a separate, human-reviewed advanced path.

The pitch to both companies: for Zadara, a well-scoped MCP server is a reference implementation and validation of their own published API's AI-readiness. For Sandz, it's a differentiated partner offering built on top of the Phase 1 knowledge copilot already in production use.
