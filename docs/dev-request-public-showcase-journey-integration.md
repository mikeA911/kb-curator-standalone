# Public Showcase Journey Integration

## Status

Ready for implementation after the current Advanced Builder/MCP work reaches a stable checkpoint.

## Important note for Claude — vocabulary changed

Before completing the Advanced Builder work or this showcase integration, review the updated AI/integration vocabulary in:

```text
docs/workbench-handbook-kb-sandbox-vocabulary.md
```

The document now distinguishes:

- Connector;
- Knowledge Connector;
- Action Connector;
- REST API;
- Webhook / Event Source;
- MCP;
- MCP Server;
- MCP Host;
- MCP Gateway; and
- External Agent.

Use those terms consistently in code labels, descriptions, registration screens, guidance and public showcase copy.

In particular:

- an **MCP Server** exposes selected tools;
- an **MCP Host** owns the AI interaction and tool loop;
- an **MCP Gateway** is the governance/routing layer between a Host and registered servers, not a separate core MCP protocol role;
- a **Connector** and an MCP Server are not synonyms;
- REST APIs and webhooks remain underlying system-integration mechanisms; and
- registration, connectivity, certification, Project availability and live invocation are distinct states.

Do not modify or remove those vocabulary additions as part of an Advanced Builder rename without reviewing their intended meaning with the owner.

## Context

The public landing page currently leads with a generic statement and a database-driven list of up to three published Projects. The public Examples page currently contains only two highly technical examples:

- CareCall OpenAPI discovery; and
- Single Pass vs. Graph Retry.

Those examples demonstrate engineering depth but do not quickly explain what KB Sandbox can do for an employee, business manager, regional builder or school.

A reusable progressive showcase component has already been created. It tells a five-stage story:

> **Know -> Apply -> Connect -> Build -> Learn**

It begins with demonstrated organizational outcomes, progresses through evidence-led business work, then introduces connectors, MCP tools, external agents and the School AI Builder Laboratory.

## Existing implementation to reuse

### Component

```text
src/components/public/ShowcaseJourney.tsx
```

### Typed showcase catalogue

```text
src/lib/showcases/journey.ts
```

### Tests

```text
src/lib/showcases/journey.test.ts
```

### Existing handoff notes

```text
docs/design-notes/showcase-journey-component-handoff.md
```

The component is a static Server Component. It adds no database query, client-side state, schema dependency or browser JavaScript.

Do not re-create this content directly inside the landing page. Import and refine the existing component and content catalogue so copy, destinations and status labels have one source of truth.

## Goal

Make the public site explain KB Sandbox through a progressive portfolio of recognizable outcomes while preserving the existing database-backed publication model for detailed Example Projects.

The visitor should understand that KB Sandbox can:

1. organize and protect trusted knowledge;
2. apply evidence to real business work;
3. connect safely to live systems;
4. help regional builders produce governed tools and agents; and
5. provide a practical AI laboratory for schools and junior developers.

## Audience paths

The showcase should support three visible entry paths:

- **For Organizations** — HR, Sales, Support, procurement, quality and controlled automation;
- **For Builders** — discovery, specifications, connectors, MCP servers, agents, evaluation and deployment; and
- **For Schools** — reproducible experiments, real regional problems, AI-assisted implementation and portfolio-quality delivery.

The initial component renders these as anchor links. During integration, either:

1. keep them as clear anchor links to an appropriate section; or
2. add a minimal accessible filter only if it materially improves the experience and does not turn the entire showcase into a client component.

Prefer simple server-rendered navigation. Do not add client-side filtering merely for visual novelty.

## Landing-page integration

Update the unauthenticated public landing page at:

```text
src/app/(public)/page.tsx
```

Recommended order:

1. Existing KB Sandbox hero/brand image.
2. Revised concise value proposition and primary actions.
3. The first portion of `ShowcaseJourney`, including its three flagship demonstrations.
4. The progressive `Know -> Apply -> Connect -> Build -> Learn` journey.
5. A clear route to the complete Examples catalogue and About page.

The component may be rendered in full if page length and performance remain reasonable. If the landing page becomes too long, add a supported compact mode to the component rather than copying selected markup into the page.

The current `Knowledge -> Intelligence -> Engineering -> Governance -> Learning` chip row may be removed or replaced if the new journey communicates the idea more clearly. Avoid showing two competing progressions.

The current `featured = listPublicProjects(...).slice(0, 3)` section should not remain as a second, visually competing “Featured examples” block. Either:

- remove it from the landing page while retaining all published Projects on `/examples`; or
- pass relevant published destinations into the showcase catalogue/component through a clean adapter.

Do not hide or unpublish the existing database records.

## Examples-page integration

Update:

```text
src/app/(public)/examples/page.tsx
```

The Examples page should contain two complementary layers:

### 1. Curated journey

Explain the progressive capability story and highlight selected flagship examples.

### 2. Published Project catalogue

Continue listing all database-published Projects with their existing type filters and access behavior.

The curated showcase is editorial navigation. The database catalogue remains the authoritative list of published Example Projects. Do not replace database publication with hard-coded cards.

Avoid rendering the full journey twice if it already appears in full on the landing page. A suitable arrangement is:

- landing page: flagship cards plus compact journey; and
- Examples page: full journey followed by the complete published catalogue.

Alternatively, landing page may render the complete journey and Examples may show the catalogue with a compact “choose your path” header. Choose one coherent structure and document the decision.

## Flagship content

The current component leads with:

1. **One Document, Two Views** — demonstrated HR resource-level security;
2. **First Conversation With Ember** — demonstrated plain-language organizational onboarding; and
3. **Zadara Sales Proposal** — pilot evidence-led proposal work.

The first two currently link to publicly shared Claude artifacts. These are temporary evidence links, not the desired permanent public destinations.

### Temporary links

- `https://claude.ai/code/artifact/aa164535-1e6d-4ff0-8446-bea1e9450ff5`
- `https://claude.ai/code/artifact/888ad696-5f2a-46aa-a7fb-5c7dcb5d55c5`

Do not break these links during the first integration. Replace them with durable internal `/examples/...` routes when equivalent approved KB Sandbox Example Projects or editorial showcase pages are published.

### Synthetic-data disclosure

Any public HR walkthrough containing employee names, policies or compensation figures must state prominently:

> **Demonstration data:** The employee names, policies and compensation figures in this walkthrough are synthetic and do not represent actual Sandz HR records or salary bands.

Do not publish the HR example without this disclosure.

## Status language

Retain visible status labels:

- **Live demonstrated** — observed end-to-end using the real product;
- **Pilot demonstrated** — exercised in the pilot but not necessarily a general production offering;
- **Prototype** — partially implemented or demonstrated with limited scope; and
- **Concept** — proposed showcase/product direction, not yet implemented.

Do not change Concept cards into calls to action that imply the underlying connector, gateway, agent or external execution path is live.

## Advanced Builder section

The Build stage must follow the revised vocabulary and the Advanced Builder architecture:

```text
Business problem
        ↓
Discovery and Method
        ↓
Architecture and specification
        ↓
External implementation
        ↓
Registration and evaluation
        ↓
Human approval
        ↓
Available to Ember
```

Public copy must preserve these distinctions:

- Builders normally implement and host integrations outside KBS.
- KBS preserves specification, registration, evaluation and approval evidence.
- Ember should call bounded MCP tools directly when a separate agent is unnecessary.
- A specialized External Agent is justified only when it owns meaningful reasoning, state or multi-step orchestration.
- A registered capability is not necessarily connected, certified, Project-approved or executable.

## School AI Builder Laboratory section

Retain the full learning progression:

```text
Learn the foundations
        ↓
Choose a real regional problem
        ↓
Create evidence and architecture
        ↓
Build with assisted coding
        ↓
Register and test the capability
        ↓
Deploy on approved infrastructure
        ↓
Demonstrate it through Ember
```

The School Lab must not be presented as merely teaching prompt writing. Its differentiator is that students produce:

- evidence;
- requirements and architecture;
- a connector, MCP server, tool or agent where appropriate;
- security and functional tests;
- a deployment declaration; and
- a working, governed demonstration.

## Design requirements

- Preserve the site's current restrained visual language while allowing the showcase to feel more inviting than the existing Project-card grid.
- Maintain responsive layouts from narrow mobile through desktop.
- Use semantic headings, lists, sections and navigation labels.
- Ensure color is not the only carrier of stage or status meaning.
- Keep all visible text readable without hover.
- Preserve keyboard access and visible focus behavior.
- Avoid animation as a requirement for understanding the progression.
- Do not add a large UI/icon dependency; `lucide-react` is already available if a small number of icons materially helps.
- Keep the default path server-rendered and low-JavaScript.

## Data and publication architecture

The current static catalogue is appropriate for the editorial journey during this initial integration. Do not introduce a new showcase database schema in this request.

However, keep a clean distinction between:

- editorial showcase metadata in `src/lib/showcases/journey.ts`; and
- published Example Project data returned by `listPublicProjects`.

Future work may allow a published Project to supply or override showcase metadata, but that is not required now.

## Tests

Preserve and extend `src/lib/showcases/journey.test.ts` to cover:

- five ordered stages;
- unique card IDs;
- non-empty outcomes, audiences and capabilities;
- valid status values;
- safe internal/external destinations;
- synthetic-data disclosure when public HR transcript content is added locally; and
- no Concept card being described as live or production approved.

Add page/component tests using the repository's existing testing conventions where practical. Do not introduce a browser-component testing framework solely for this feature.

## Live verification

Verify anonymously on production-like data:

1. Landing page loads without authentication.
2. Hero and flagship story are understandable above or near the first viewport.
3. Organization, Builder and School entry paths reach the intended content.
4. Every working showcase link opens successfully.
5. Concept cards do not behave like broken links.
6. Existing CareCall and Graph Retry examples remain reachable.
7. `/examples` still lists all published Example Projects and type filters still work.
8. Mobile layout remains readable without horizontal scrolling.
9. Keyboard navigation follows a sensible order.
10. Signed-in users still follow the existing home-page redirect behavior.

## Acceptance criteria

1. The public landing page presents recognizable organizational outcomes before internal AI-engineering terminology.
2. Visitors can understand the `Know -> Apply -> Connect -> Build -> Learn` progression.
3. Organizations, Builders and Schools each have an obvious entry path.
4. The verified HR and Ember-onboarding stories are featured prominently.
5. HR demonstration data is clearly identified as synthetic wherever its content is reproduced.
6. Advanced Builder copy follows the updated Connector/API/Webhook/MCP vocabulary.
7. Registration is never presented as equivalent to certification or live execution.
8. Existing published Examples remain available through the database-backed catalogue.
9. Prototype and Concept cards cannot be mistaken for production capabilities.
10. The implementation reuses `ShowcaseJourney` and its typed catalogue rather than duplicating the markup in page files.
11. Typecheck, lint, relevant tests and production build pass once concurrent Advanced Builder changes are complete.
12. Live anonymous verification passes on desktop and mobile layouts.

## Out of scope

- Creating every missing detailed showcase page.
- Building the connectors, MCP Gateway or external agents described by Concept cards.
- A new showcase CMS or database schema.
- Public submission of showcase cards by users.
- Automatic promotion from a Project to the homepage.
- Analytics beyond existing site behavior.
- Changing the organization Wiki currently under separate review.

## Suggested implementation sequence

1. Finish or checkpoint the current Advanced Builder/MCP rename so imports and typecheck are stable.
2. Review the expanded vocabulary document.
3. Run the existing Showcase Journey tests.
4. Integrate a compact/full component arrangement across `/` and `/examples`.
5. Add the synthetic HR data disclosure.
6. Preserve the existing published-project catalogue.
7. Run automated checks.
8. Perform anonymous desktop/mobile live verification.
9. Document any unavailable Concept capability honestly rather than expanding scope to implement it.
