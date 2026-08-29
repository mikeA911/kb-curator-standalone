# KB Sandbox Capability and Navigation Catalogue

**Purpose:** Living product-navigation knowledge for Ember, release documentation, future application discovery, and a possible KB Sandbox MCP interface  
**Status:** Initial baseline — expand as workflows are verified  
**Application version:** 0.1.0  
**Last code verification:** 2026-08-28  

## How this document is used

This catalogue records what users can accomplish in KB Sandbox, where each workflow begins, which access rules apply, and how Ember should guide the user. It is committed with the application and should be updated in the same change as a material user-visible workflow.

This is not a changelog. Release notes should briefly describe what changed and link to the affected catalogue entry. This document retains the durable, current description of the workflow.

Each capability is described using the following fields:

| Field | Meaning |
|---|---|
| Intent | What the user is trying to accomplish |
| Users and authority | Who may see or use the capability |
| Prerequisites | Required identity, membership, role, content, or state |
| Start | Stable page from which the workflow begins |
| Navigation | Shortest supported UI sequence |
| Outcome | What the user should expect to see or create |
| Ember guidance | What Ember may explain, link to, or perform |
| Boundaries | Important restrictions, approvals, side effects, and known limitations |
| Exposure | Current or possible AI/MCP classification |
| Verification | Evidence and date supporting the entry |

## Release-note convention

A release note should be short and change-oriented:

```text
### <User-visible capability>

<What changed and why it matters to the user.>

- Available to: <roles or project relationship>
- Start at: <stable route>
- Ember: <new explanation, navigation, or action behavior>
- Guide: <link to the affected catalogue heading>
```

Example:

```text
### Project-scoped Assistant conversations

Members can now ask Ember about a project and receive answers grounded in that project's authorized sources and platform guidance.

- Available to: authorized project members
- Start at: `/projects/[id]`
- Ember: explains missing prerequisites and offers the project-specific Assistant entry point
- Guide: Project workspace → Ask Ember about a project
```

Do not copy the entire workflow into every release note. Update the workflow here, then use the release note to identify the change.

## Navigation map

| Area | Stable route | Primary intent | Visibility |
|---|---|---|---|
| Sign in | `/login` | Access a personal, role-aware workspace | Public entry point |
| Workbench | `/dashboard` | See activity, status, attention items, and shortcuts | Signed-in users |
| Projects | `/projects` | Organize governed work, knowledge, people, and evidence | Signed-in; results are access-scoped |
| Wiki | `/wiki` | Find and curate approved platform or project guidance | Signed-in; content is role- and project-scoped |
| Blog contribution | `/contribute/blog` | Draft and submit articles | Curator and admin |
| Public Blog | `/blog` | Read published articles | Public |
| Trending | `/trending` | Share and examine external material before it becomes knowledge | Signed-in users |
| Explore: Evals | `/evals` | Evaluate models, retrieval, or other AI behavior | Signed-in; data is access-scoped |
| Explore: Graphs | `/graphs` | Inspect agent and Method flow visualizations | Signed-in users |
| Explore: Agents | `/agents` | View and use available agents, including Ember | Signed-in users |
| Explore: Agent Registry | `/agent-registry` | Register and inspect externally implemented agents | Signed-in non-anonymous users |

The application logo links to `/about`. The signed-in profile and journal begin at `/profile`.

---

## 1. Sign in

### Access the Workbench

- **Intent:** Sign in and continue work under the correct user identity and role.
- **Users and authority:** A registered user with valid credentials.
- **Prerequisites:** An account that is permitted to sign in.
- **Start:** `/login`
- **Navigation:** Enter credentials → submit → `/dashboard`.
- **Outcome:** The Workbench opens with navigation and content appropriate to the user's platform role and project memberships.
- **Ember guidance:** Ember may direct a signed-out user to `/login`. Ember must not request, repeat, retain, or transmit the user's password or API keys.
- **Boundaries:** Authentication does not grant access to every project. Project membership and content visibility continue to apply after sign-in.
- **Exposure:** UI guidance only; prohibited from agent credential handling.
- **Verification:** Login form redirects successful authentication to `/dashboard`; code verified 2026-08-28.

## 2. Workbench

### Review current activity and navigate to work

- **Intent:** Understand what exists, what needs attention, and where to continue.
- **Users and authority:** Signed-in users. Some widgets are role-specific.
- **Prerequisites:** Signed-in session.
- **Start:** `/dashboard`
- **Navigation:** Use the summary cards for Projects, Knowledge, Evaluations, Agents, or Trending; use **Sources & Curation** to open `/upload`.
- **Outcome:** A role-aware summary of accessible work and direct links to the corresponding areas.
- **Ember guidance:** Ember may explain the cards and provide stable links. It should mention that counts and attention items depend on access and role.
- **Boundaries:** Wiki review queues and governance attention items are limited to curator/admin users. Shared links and personal notes are shown only to eligible signed-in users. Dashboard totals do not authorize access to an underlying item.
- **Exposure:** Ember-readable; candidate for external MCP read access as a caller-scoped summary.
- **Verification:** `src/app/(app)/dashboard/page.tsx`; code verified 2026-08-28.

### Add a shared link

- **Intent:** Recommend external material for other Workbench users to examine.
- **Users and authority:** Active signed-in, non-anonymous users; admin may remove entries.
- **Prerequisites:** Signed-in session; optional project membership when associating a link with a project.
- **Start:** `/dashboard` or `/trending/new`
- **Navigation:** Find the shared-links area → add the title, URL, description, tags, and optional authorized project → submit.
- **Outcome:** A Trending/shared-link entry, explicitly treated as a recommendation rather than approved knowledge.
- **Ember guidance:** Ember may explain the distinction between external material and approved Wiki knowledge and navigate to the submission page.
- **Boundaries:** Submission is not publication as trusted knowledge. Promotion to Wiki follows a separate review workflow.
- **Exposure:** Candidate for MCP draft/action after confirmation; moderation remains authority-gated.
- **Verification:** Dashboard and Trending components; code verified 2026-08-28.

## 3. Projects

### Find or create a project

- **Intent:** Organize a bounded body of work with its own objective, members, sources, approvals, workstreams, assessments, and evidence.
- **Users and authority:** Signed-in users may see projects permitted by policy and create a project. Subsequent management depends on project relationship and authority.
- **Prerequisites:** Signed-in session.
- **Start:** `/projects`
- **Navigation:** Open **Projects** → select an accessible project, or choose **New project** → `/projects/new`.
- **Outcome:** An existing project workspace opens, or the user begins the project-creation workflow.
- **Ember guidance:** Ember may list accessible projects, explain project types, navigate to `/projects` or a project derived from the authorized current context, and help create a project only through supported bounded tools.
- **Boundaries:** A platform role alone must not be represented as customer-project authorization. Ember should identify membership or authority gaps before proposing restricted actions.
- **Exposure:** Ember-readable and partly Ember-actionable; strong candidate for caller-scoped MCP read access. Creation or change requires identity, validation, and confirmation.
- **Verification:** `/projects`, `/projects/new`, project membership and governance routes; code verified 2026-08-28.

### Work inside a project

- **Intent:** Use project-specific sources and knowledge while preserving access boundaries and provenance.
- **Users and authority:** Authorized project owner or member; individual actions may require a project role or named approval authority.
- **Prerequisites:** Access to the selected project.
- **Start:** `/projects/[id]`
- **Navigation:** Projects → select project → choose the relevant workstream, assessment, notes, members, access, governance, publication, or Ember action.
- **Outcome:** Work remains bound to the selected project and its approved evidence.
- **Ember guidance:** When entered through **Ask Assistant about this project**, Ember should preserve the project binding, search only authorized project knowledge plus approved platform guidance, and label citations accordingly.
- **Boundaries:** General unbound chat must not retrieve project-private evidence merely because the user happens to be a project member. Consequential decisions remain human- or authority-approved.
- **Exposure:** Ember-readable/actionable within the project binding; MCP access must preserve caller identity, project membership, and approval rules.
- **Verification:** Project routes and previously live-verified project-bound retrieval behavior; reviewed 2026-08-28.

## 4. Wiki

### Find approved guidance

- **Intent:** Locate reusable platform guidance or authorized project knowledge.
- **Users and authority:** Signed-in users; article visibility and project membership determine results.
- **Prerequisites:** Signed-in session; project membership for private project articles.
- **Start:** `/wiki`
- **Navigation:** Open **Wiki** → search or filter by category, status, or project → select an article.
- **Outcome:** The user sees the approved version and available provenance, relationships, and source links they are authorized to access.
- **Ember guidance:** Ember may search approved Wiki content, summarize it with citations, and offer an authorized article link.
- **Boundaries:** Platform admin or curator status does not automatically grant access to approved private customer knowledge. Ember must not reveal the existence, title, excerpt, or source of inaccessible private articles.
- **Exposure:** Ember-readable; strong candidate for MCP read access with visibility enforcement.
- **Verification:** `/wiki`, `/wiki/[slug]`, project visibility controls; code verified 2026-08-28.

### Create or curate Wiki knowledge

- **Intent:** Convert reviewed evidence or manual expertise into governed, reusable guidance.
- **Users and authority:** Curator or admin for authoring and review functions; final approval follows the configured workflow.
- **Prerequisites:** Appropriate role and, for project-private knowledge, an authorized project link.
- **Start:** `/wiki/new` or an editable article at `/wiki/[slug]/edit`.
- **Navigation:** Create or edit draft → attach sources/projects as appropriate → submit/review → approve or return for changes.
- **Outcome:** A versioned Wiki article; approved content becomes retrievable within its visibility boundary.
- **Ember guidance:** Ember may explain the workflow and draft content where supported, but must distinguish drafting from approval or publication.
- **Boundaries:** Attach a project before narrowing an article to project-only visibility. Approval and visibility changes are consequential, authority-gated actions.
- **Exposure:** Draft assistance may be Ember-actionable; approval should remain authority-gated and excluded from broad external MCP access.
- **Verification:** Wiki routes and curation components; code verified 2026-08-28.

## 5. Blog

### Draft and submit an article

- **Intent:** Prepare public-facing material based on reviewed ideas without turning KB Sandbox into a full content-management system.
- **Users and authority:** Curator and admin can access `/contribute/blog`; only admin publishes.
- **Prerequisites:** Curator or admin role.
- **Start:** `/contribute/blog`
- **Navigation:** Open **Blog** (`/blog`) → **My drafts** (shown only to curator/admin) → **New draft** → write or import initial content → edit/preview → save → submit for review.
- **Outcome:** A private draft or submitted article. It is not publicly visible until an admin publishes it.
- **Ember guidance:** Ember may explain the authoring and review process and navigate eligible users to the contributor area. It must not offer the contributor route to an ineligible user as if access were available.
- **Boundaries:** Contributors cannot edit another author's draft through guessed URLs. Submission locks curator editing until an admin returns the article to draft. Publishing and unpublishing are admin-only.
- **Exposure:** Draft preparation may be Ember-assisted; publishing is authority-gated and not a general MCP action.
- **Verification:** `/contribute/blog` route gate and the `My drafts` link on `/blog`; code verified 2026-08-28. (Until 2026-08-28, the top-nav "Blog" link itself pointed curator/admin straight at `/contribute/blog`'s own-drafts-only view instead of the public listing -- fixed the same day, see the next entry.)

### Read published articles

- **Intent:** Read public articles and share their canonical links.
- **Users and authority:** Anyone -- anonymous visitors and every signed-in role see the identical list of published articles; there is no author-scoped or role-scoped narrowing on this page.
- **Prerequisites:** The article is published.
- **Start:** `/blog`
- **Navigation:** Open **Blog** in the top nav (now unconditional for every signed-in role, not just curator/admin) → select a published article → `/blog/[slug]`.
- **Outcome:** Public article with its approved presentation and metadata.
- **Ember guidance:** Ember may link to a relevant published article as a citation or recommended reading. KB Sandbox navigation links should not be collected as user artifacts merely because Ember used them for navigation.
- **Boundaries:** Draft and unpublished articles return no public content.
- **Exposure:** Public MCP/resource candidate; read-only.
- **Verification:** Public Blog routes; code verified 2026-08-28. Fixed the same day: the top-nav "Blog" link was curator/admin-only and pointed at `/contribute/blog` (an own-drafts-only view), so a signed-in curator/admin saw fewer posts than an anonymous visitor, and a plain consultant had no Blog nav link at all. `Header.tsx`'s Blog link now always points here for every signed-in role; `/contribute/blog` is reached via a "My drafts" button shown only to curator/admin on this page.

## 6. Trending

### Examine and discuss emerging material

- **Intent:** Share external material worth examining before deciding whether it should become governed knowledge.
- **Users and authority:** Signed-in users may view and submit within applicable access rules; curator/admin perform curation actions.
- **Prerequisites:** Signed-in session.
- **Start:** `/trending`
- **Navigation:** Open **Trending** → filter by tag or select an item; choose **Submit to Trending** to add material.
- **Outcome:** External material can be discussed, tagged, associated with a project, reviewed, archived, or promoted into a Wiki draft.
- **Ember guidance:** Ember should describe Trending as an intake and discussion area, not as an authoritative knowledge base. It may navigate to an item the user may access.
- **Boundaries:** A Trending item is not approved evidence merely because it was submitted. Promotion creates or updates a draft and still requires Wiki review/approval.
- **Exposure:** Ember-readable; submission could be a confirmed MCP action. Promotion and moderation are authority-gated.
- **Verification:** Trending routes and curation actions; code verified 2026-08-28.

## 7. Explore

### Evals

- **Intent:** Measure model, retrieval, or workflow quality using repeatable datasets and runs.
- **Start:** `/evals`
- **Navigation:** Explore → **Evals**.
- **Ember guidance:** Explain available evaluation concepts and direct the user to the relevant dataset or run only when authorized.
- **Exposure:** Results are candidates for read access; creating or running evaluations requires scoped controls.
- **Verification:** Header and evaluation routes; code verified 2026-08-28. Detailed workflows remain to be catalogued.

### Graphs

- **Intent:** Inspect how bounded agents, tools, deterministic operations, evidence, guardrails, and human gates are connected.
- **Start:** `/graphs`
- **Navigation:** Explore → **Graphs** → select a graph.
- **Ember guidance:** Explain that a visualization describes a flow; it does not by itself authorize execution or prove that every node is an AI agent.
- **Exposure:** Read-only visualization candidate.
- **Verification:** Header and graph routes; code verified 2026-08-28. Detailed workflows remain to be catalogued.

### Agents

- **Intent:** Discover and use available KB Sandbox agents.
- **Start:** `/agents`
- **Navigation:** Explore → **Agents** → select an agent; Ember has a dedicated entry at `/agents/workbench-assistant`.
- **Ember guidance:** Distinguish KB Sandbox-native agents from external registered agents and from Workbench Methods.
- **Exposure:** Agent metadata may be readable; execution requires each agent's own tool, data, identity, and confirmation controls.
- **Verification:** Header and agent routes; code verified 2026-08-28. Detailed workflows remain to be catalogued.

### Agent Registry (external)

- **Intent:** Record and inspect externally implemented agents as governed, versioned specifications.
- **Users and authority:** Signed-in non-anonymous users, subject to registry controls.
- **Start:** `/agent-registry`
- **Navigation:** Explore → **Agent Registry (external)**.
- **Ember guidance:** Clarify that registration or visualization does not mean the external agent is hosted by, trusted by, or executable through KB Sandbox.
- **Exposure:** Registry metadata is a candidate for controlled read access; external invocation is separately designed and authorized.
- **Verification:** Header and registry routes; code verified 2026-08-28. Detailed workflows remain to be catalogued.

## Ember response contract for navigation

When a user asks where or how to do something, Ember should return:

1. a one-sentence answer identifying the appropriate area;
2. any prerequisite, project binding, membership, or role requirement;
3. one primary stable navigation link;
4. a short description of what the user will do or see next;
5. an explicit distinction between navigation, drafting, execution, approval, and publication; and
6. an honest limitation when the workflow is unverified or not yet supported.

Example:

> Use **Projects** to open the customer workspace, then choose **Ask Assistant about this project** so I can use its authorized sources. You must be a member of that project. [Open Projects](/projects)

Ember should avoid:

- listing several weakly related links when one primary route is sufficient;
- inventing a route or using a test-specific identifier;
- treating a link click as completion of the linked action;
- implying that admin, curator, or project membership grants an authority that has not been verified;
- putting internal KB Sandbox navigation links in the user's Artifacts collection; and
- exposing private content through link labels, summaries, citations, or error messages.

## Update checklist

For every material UI or workflow change:

1. update the affected catalogue entry in the same code change;
2. verify the shortest path as each affected role or project relationship;
3. check empty, populated, pending, approved, and denied states where relevant;
4. update Ember's committed navigation knowledge;
5. add or update link/route checks;
6. add a concise release note linking to the catalogue heading; and
7. record the verification date and evidence without including secrets or customer-sensitive data.

## Discovery backlog

The following areas need deeper workflow-level verification in later passes:

- project creation, membership, access, and approval-authority management;
- source upload, document versioning, review, and publication;
- project knowledge-base and Wiki attachment/reuse;
- project-bound Ember conversations, artifacts, and recovery;
- assessments, datasets, evaluation runs, and result approval;
- agent graph and external registry detail views;
- profile, journals, and feedback/problem reporting;
- owner Roadmap access and export; and
- admin-only provider, model, Blog publication, and system-management workflows.

These entries should be expanded before they are treated as complete MCP discovery evidence.
