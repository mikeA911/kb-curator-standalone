# Development Request: Project-Aware Knowledge and Assistant Context

**Status:** Proposed  
**Priority:** Next major knowledge and Assistant increment  
**Audience:** Product, architecture, development, security, data, and test teams

## Summary

Make project context a first-class boundary for knowledge retrieval and Assistant conversations.

Today an approved source document may belong to an organization knowledge base, while an approved Wiki article is searchable through the platform Wiki. A project can select a knowledge base during creation, but the project page and Assistant do not consistently inherit or enforce that choice. The current Assistant primarily retrieves approved Wiki articles and cannot reliably use approved project source documents directly.

The result is a gap between the intended workflow and the live behavior:

> Project → approved project knowledge → Assistant conversation → cited answer → governed artifact

This request closes that gap without turning the Wiki into a duplicate document store or allowing knowledge to leak between clients.

## Product principle

> The active project determines the Assistant's working context, retrieval scope, permissions, approval policy, and navigation targets.

Knowledge may be reusable, but reuse must be explicit and authorized. Platform-wide approval does not imply that confidential project material is visible to every project.

## Goals

1. Associate knowledge bases, source documents, Wiki articles, and Assistant conversations with projects.
2. Allow approved knowledge to be reused across explicitly selected projects.
3. Support clear project, organization, and platform visibility scopes.
4. Make Assistant conversations inherit and visibly display their active project.
5. Retrieve from approved project evidence before shared organization or platform knowledge.
6. Preserve citations and provenance from answer back to Wiki article, source document, version, and project.
7. Enforce project and organization boundaries in the database, service layer, UI, Assistant tools, and future MCP transport.
8. Prevent confidential knowledge from leaking through search results, citations, artifacts, conversation history, or model context.
9. Allow the Assistant to navigate users to the relevant project page, knowledge source, Wiki article, workstream, or artifact.

## Non-goals

The first release must not introduce:

- unrestricted cross-tenant or cross-project semantic search;
- automatic publication of uploaded documents as Wiki articles;
- automatic legal, privacy, security, pricing, or architecture approval;
- live access to customer storage environments;
- general autonomous web research;
- a full document-management or records-management system;
- duplicate copies of the same reusable article for every project; or
- arbitrary access rules authored as executable expressions.

## Knowledge layers and retrieval order

Use the following deterministic precedence:

1. **Approved project knowledge** — sources and articles explicitly attached to the active project.
2. **Approved organization knowledge** — reusable material available to the project's organization.
3. **Approved platform knowledge** — globally reusable KB Sandbox methods and public/shared guidance.

The Assistant may combine layers when authorized, but every returned item must retain its layer and provenance. Project evidence wins when it conflicts with generic platform guidance. The Assistant must identify material conflicts rather than silently merging them.

## Visibility model

Every reusable knowledge resource must have one explicit visibility scope:

- `project_private` — usable only by members of one project;
- `selected_projects` — reusable by a maintained allow-list of projects;
- `organization` — usable by authorized projects and users in one organization;
- `platform` — reusable across the KB Sandbox deployment; or
- `public` — intentionally visible without sign-in where the existing Wiki publication rules permit it.

Visibility and approval are separate dimensions. An approved source may still be project-private. A platform Admin must not silently convert business-confidential evidence into organization or platform knowledge.

## Project associations

### Knowledge bases

- A project may attach one or more knowledge bases.
- The project page must show the attached bases and their visibility.
- The Project Wizard's Knowledge Scope choice must persist and be visible after creation.
- Existing projects with a selected knowledge base must be audited and backfilled where reliable; do not infer an attachment from name alone.

### Source documents and versions

- Retrieval must use only the current approved version of an attached source unless the user explicitly requests historical comparison.
- A new document version must preserve stable source identity and invalidate or flag derived material that depends on an older version.
- Source access must be checked before chunk text enters the model context.

### Wiki articles

- A Wiki article may be associated with one or more projects without duplicating its content.
- Article editors must select or confirm visibility and project associations.
- AI-assisted Wiki drafting from approved chunks must create durable source links automatically.
- Manual Wiki authoring must offer a usable source picker; it must not require users to know raw database IDs.
- The article page should show source titles, versions, relationships, and verification status.

### Conversations

- A conversation may optionally be platform/general, but project work should start from or select an active project.
- Project conversations store `project_id` and display the project name in the chat banner.
- Changing project context starts a new conversation or requires an explicit confirmed transition; it must never silently blend histories.
- Conversation history and summaries retain the project boundary.

## Project-aware Assistant experience

### Entry points

Add **Ask Assistant about this project** on the project page. Opening it must:

- bind a new or existing conversation to the project;
- show the project name and knowledge scope in the chat banner;
- make the project's goals, workstreams, approval-policy summary, and authorized knowledge available through service-layer tools; and
- keep general platform chat available as a separate mode.

### Retrieval behavior

The Assistant should:

1. Resolve the current user and active project.
2. Determine authorized knowledge scopes.
3. Search approved project sources and articles first.
4. Expand to organization and platform knowledge only when useful and permitted.
5. Return structured citations containing resource type, title, version, visibility layer, project association, and destination URL.
6. State when required evidence is absent.
7. Separate documented fact, reasoned recommendation, and missing information.

The Assistant must not:

- search or cite another project's private knowledge;
- imply that general Wiki guidance is client-approved evidence;
- claim live system access;
- invent client privacy policies or contractual requirements;
- reuse an earlier project's conversation summary in a different project; or
- expose a citation whose destination the current user cannot open.

### Structured response and navigation

Extend the structured Assistant response contract with project-aware targets:

- `project`
- `knowledge_base`
- `knowledge_source`
- `knowledge_source_version`
- `wiki_article`
- `workstream`
- `artifact`
- `governance`
- `approval_request`

Internal KB Sandbox navigation links should remain in response navigation or next actions, not in the user's downloadable Artifacts collection unless the Assistant actually creates or recommends a durable document.

## Suggested data model

Exact names may follow current conventions after schema inspection.

### `project_knowledge_bases`

- `project_id`
- `knowledge_base_id`
- `attached_by`, `attached_at`
- `purpose` or notes
- unique project/base constraint

### `wiki_article_scopes`

- `wiki_article_id`
- `visibility_scope`
- `organization_id` where applicable
- `created_by`, `created_at`, `updated_at`

### `project_wiki_articles`

- `project_id`
- `wiki_article_id`
- `relationship` (`primary`, `reference`, `derived`, or similarly bounded values)
- `attached_by`, `attached_at`
- unique project/article constraint

### Source scope

Add equivalent scope and project-association records for `knowledge_sources` if the knowledge-base association alone cannot safely express document visibility.

### Conversations

Add nullable `project_id` to `conversations`, with immutable or explicitly transitioned project binding. Preserve existing general conversations with `project_id = null`.

### Citations and provenance

Persist enough information to reconstruct:

- answer/message;
- retrieved article or chunk;
- stable source and exact source version;
- project and visibility layer used at retrieval time;
- destination URL; and
- provider/model that generated the answer.

## Service layer and tools

All UI, Assistant, and future MCP surfaces must use the same authorization-aware service layer.

Suggested bounded tools:

- `get_project_context`
- `search_project_knowledge`
- `list_project_knowledge_sources`
- `get_project_governance_summary`
- existing `search_wiki`, extended with authorized scope filters

Do not expose raw unrestricted table search to the model. Enforce the active project and user identity server-side; never trust a model-supplied `project_id` by itself.

## RLS and security requirements

RLS and service-layer tests must prove that:

- non-members cannot retrieve project-private content;
- members of Project A cannot retrieve Project B private content;
- selected-project content is limited to the allow-list;
- organization content does not cross organizations;
- citations obey the same permissions as retrieval;
- revoked membership removes new access without corrupting historical audit records;
- summaries, embeddings, cached search results, conversation exports, journals, and artifacts cannot bypass the project boundary; and
- platform Admin access does not automatically constitute customer authorization or publication approval.

Embedding rows and vector RPCs must carry or join through enforceable scope metadata. Filtering only after vector search is insufficient if unauthorized content can enter model context or diagnostics.

## Migration and compatibility

- Preserve existing Wiki articles, conversations, knowledge bases, sources, and versions.
- Existing Wiki articles default to their current effective platform visibility unless a safer explicit mapping is required.
- Existing conversations remain general unless a reliable project relationship already exists.
- Backfill the Project Wizard's stored knowledge-base selection into `project_knowledge_bases` only when the source data is authoritative.
- Do not infer confidential project associations from article titles, tags, or free text.
- Provide an admin/curator audit view for unresolved knowledge scope.

## Implementation stages

### Stage 1 — Project associations and visibility

- Schema, constraints, indexes, audit fields, and RLS.
- Persist and display project knowledge-base attachments.
- Associate Wiki articles with projects and visibility scopes.
- Curator/admin source picker using human-readable source titles and versions.
- Migration and compatibility tests.

### Stage 2 — Project-bound conversations and retrieval

- `project_id` on conversations.
- **Ask Assistant about this project** entry point and chat-banner context.
- Authorized retrieval order across project, organization, and platform layers.
- Direct retrieval of current approved project source versions as well as Wiki articles.
- Structured citations with accessible destinations.

### Stage 3 — Navigation, provenance, and operational hardening

- Project-aware response navigation and artifact rules.
- Durable retrieval provenance per response.
- Conflict/staleness indicators when a source version changes.
- Retrieval and security evals.
- Latency, timeout, retry, and conversation-refresh hardening.

Stop and report after each stage. Do not silently add web research, customer-system integrations, or AI approval authority.

## Acceptance criteria

### Project setup

- Selecting **Zadara / Sandz** in the Project Wizard persists to the created project.
- The project page shows the attached knowledge base and its visibility rather than “No project-specific knowledge base attached yet.”
- An existing approved Wiki article can be attached to one or more projects without copying it.

### Assistant context

- Opening the Assistant from a project visibly binds the conversation to that project.
- A user can ask a Zadara helpdesk or proposal question and receive an answer grounded in the project's approved Wiki/source evidence.
- The response distinguishes facts, recommendations, and missing evidence.
- The response includes working, authorized links to the supporting article and source versions.
- Starting a conversation for another project does not carry the previous project's private context.

### Permissions

- A user outside the project cannot retrieve, cite, navigate to, export, or journal project-private knowledge.
- A shared Zadara article can support another explicitly authorized project.
- Customer-private material cannot become platform Wiki knowledge without an explicit visibility and publication decision.

### Reliability

- AI-assisted Wiki drafting from approved chunks completes without a React rendering failure and preserves source associations.
- Long Assistant turns complete or fail with a durable, actionable error; refreshing cannot silently discard a completed or pending answer.
- A model/provider timeout is distinguished from a client rendering failure.

## Required tests

Add automated and live coverage for:

- project/knowledge-base attachment persistence;
- article and source visibility scopes;
- same-organization and cross-organization access;
- same-project and cross-project retrieval;
- current-version-only source retrieval;
- article reuse across selected projects;
- conversation project binding and explicit transition;
- citation authorization and destination access;
- retrieval-cache and embedding-scope isolation;
- journal/export/history isolation;
- manual and AI-assisted Wiki source association;
- provider timeout, tool-loop exhaustion, client polling, refresh, and recovery behavior; and
- crafted Server Action/Data API/RPC calls that attempt to bypass UI scope.

Run focused tests, the full suite, TypeScript, lint, production build, and live role-based verification with:

- project owner;
- project contributor;
- member of another project;
- curator;
- platform Admin without project business authority;
- customer/client reviewer; and
- anonymous user where public visibility applies.

## Live verification scenario

1. Create a client project and attach the **Zadara / Sandz** knowledge base.
2. Confirm the attachment appears on the project page.
3. Attach the approved **Zadara Knowledge Copilot: Helpdesk and Proposal Guidance** Wiki article.
4. Start **Ask Assistant about this project**.
5. Ask for healthcare laboratory-findings storage discovery guidance.
6. Confirm the answer retrieves the article and appropriate current Zadara source versions.
7. Confirm facts, recommendations, missing privacy evidence, and approval boundaries are visibly separated.
8. Open every citation and navigation target.
9. Repeat as an unauthorized user and confirm no project-private result, citation, summary, or artifact leaks.
10. Reuse the article in a second authorized project and confirm the shared article works without exposing the first project's private material.
11. Publish a new source version and confirm stale derived knowledge is flagged.
12. Exercise provider timeout and refresh recovery; the conversation must remain intelligible and durable.

Do not delete temporary test data until the user confirms cleanup.

## Findings that motivated this request

Live testing on 24 August 2026 established that:

- six Zadara documents were approved and completed;
- the Sandz pilot project still displayed “No project-specific knowledge base attached yet” despite the Knowledge Scope option existing in the wizard;
- the current Assistant could search approved Wiki content but did not directly use the approved project source documents;
- an approved reusable Zadara Wiki article could be created as a workaround, but it was platform-shared rather than project-scoped;
- AI-assisted Wiki generation from ten approved Zadara chunks failed with minified React error #441;
- manual authoring exposed raw source-ID entry rather than a human-readable source picker, so durable source relationships could not be attached safely through the UI; and
- a Groq GPT-OSS 120B Assistant turn remained in “taking longer than expected,” and refresh removed the pending response instead of recovering it.

Treat these as regression cases, not merely future enhancements.
