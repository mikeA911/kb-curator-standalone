# Development Request — Client Knowledge Workspace Onboarding Method

**Status:** Ready for implementation  
**Priority:** P1 — small content/integration change  
**Source Method draft:** [`docs/workbench-method-client-knowledge-workspace-onboarding.md`](workbench-method-client-knowledge-workspace-onboarding.md)  
**Related Ember test:** [`docs/test-reports/2026-08-28-ember-client-workspace-onboarding-method.md`](test-reports/2026-08-28-ember-client-workspace-onboarding-method.md)

## Objective

Make **Client Knowledge Workspace Onboarding** available in KB Sandbox as a reviewable Workbench Handbook Method. Preserve the repository draft as the content authority, add the Method to applicable discovery/catalogue mechanisms, and leave it unapproved so Mike can review and approve it through the normal Wiki workflow.

This request is primarily content seeding and integration. Do not broaden it into an onboarding wizard, Organization tenant implementation, automatic Project provisioning, or external MCP interface.

## Required implementation

### 1. Create the Workbench Handbook article

Seed or import a new Wiki article titled:

**Client Knowledge Workspace Onboarding (Workbench Method)**

Use the content in:

`docs/workbench-method-client-knowledge-workspace-onboarding.md`

The article must use the existing Workbench Handbook category and the same structural conventions as other approved Method articles.

Preserve at least:

- Quick help
- Goal and rationale
- When to use and when not to use
- Requirements grouped as Required, Strongly recommended, and Optional
- Requirement-state model
- Core terminology and distinctions
- Twelve-step procedure
- Standard deliverables
- Suggested artifact template
- Evaluation criteria
- Failure modes and guardrails
- Current implementation boundary
- Sandz worked example
- Practical experiment
- Recommended next action
- Human and external-system boundary

Do not silently shorten the article in a way that removes access, authority, privacy, isolation-testing, or current-versus-future distinctions.

### 2. Assign Method identity without renumbering existing Methods

Use the application's established Method identity/slug convention. Assign the next safe identifier only after inspecting the live catalogue and existing seed data.

Do not renumber or overwrite an existing Method.

Suggested slug:

`client-knowledge-workspace-onboarding-workbench-method`

If the current convention requires a different slug, use the convention and document the deviation.

### 3. Leave the Method for human review

The Method must be created as a draft or submitted-for-review article according to the existing Wiki lifecycle.

Do not approve or publish it automatically.

Mike must be able to:

1. open the article in KB Sandbox;
2. inspect its full content and sources;
3. edit it if necessary; and
4. approve it using the normal admin review control.

Existing approved Method content must not be changed.

### 4. Add Method discovery integration

Update the established Method catalogue, overview, seed index, or other committed discovery mechanism used by Ember and the Workbench.

After approval, Ember should be able to identify this Method for requests such as:

- “Help us onboard a new client into KB Sandbox.”
- “How should we divide shared, HR, sales and customer knowledge?”
- “Should this customer proposal have its own Project?”
- “Which knowledge bases should each Project use?”
- “We are moving from NotebookLM or shared folders. How should we structure the workspace?”

Before approval, follow the existing rules for whether unpublished Method drafts are available to Ember. Do not create a special bypass.

### 5. Preserve factual implementation boundaries

The seeded Method must state accurately that:

- KB Sandbox does not yet have a native Organization/tenant entity;
- the organization/client layer is currently a documented deployment and Project convention;
- Projects are the implemented governed workspaces;
- explicit active Project membership is required;
- Project roles are owner, curator, consultant and viewer;
- business approval authorities are separate from platform and Project roles;
- many-to-many Project-to-knowledge-base attachment is live today;
- source documents are versioned evidence and differ from approved Wiki knowledge;
- Ember conversation history is durable per user;
- project-bound Ember conversations preserve Project context; and
- general unbound conversations must not retrieve project-private evidence.

Do not expose internal table names in ordinary article prose. Do not use claims such as “zero hallucination.”

### 6. Add valid navigation

The recommended next-action link must resolve to the real stable route:

`/projects`

It must not render against `kb-sandbox.example.com` or another placeholder origin.

Use relative internal application routes where supported. Verify the rendered link on the deployed application.

### 7. Update committed product knowledge

If this implementation changes a user-visible workflow or adds a new supported Method, update:

`docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md`

Add the Method discovery/review workflow only to the degree needed to keep Ember's committed product knowledge accurate. Follow the repository's current mechanism for exposing that committed catalogue to Ember.

## Verification

### Automated

- Existing Method/Wiki seed tests pass.
- No duplicate slug or Method identity can be created by rerunning the seed/migration.
- The article remains unapproved after seeding.
- The required article sections are present.
- The Method appears in the applicable catalogue after approval under existing rules.
- The internal Projects link resolves to `/projects` and uses the configured application origin or a relative route.
- Typecheck, lint, full tests, and production build pass.

### Live

Using Mike's admin account:

1. Open the Wiki/Workbench Handbook review queue.
2. Confirm **Client Knowledge Workspace Onboarding (Workbench Method)** appears as pending review.
3. Open it and verify the full Method content renders correctly.
4. Confirm requirements, procedure, matrices, Sandz example, and current/future boundary are present.
5. Confirm the Projects link opens `https://kbsandbox.tech/projects`.
6. Confirm the article is not approved before Mike takes action.
7. Ask Mike to inspect and approve it.
8. After approval, begin a new Ember conversation and ask which Method fits a client with shared, HR, sales and customer-specific knowledge.
9. Confirm Ember recommends the new Method and cites/links to the approved Handbook article.
10. Confirm Ember does not claim a native Organization entity exists.

## Acceptance criteria

1. A single non-duplicated Workbench Handbook Method article exists from the repository draft.
2. It is initially reviewable but unapproved.
3. Mike can edit and approve it through the normal UI.
4. The content preserves the required Method structure and factual implementation boundaries.
5. Existing Methods and their identifiers remain unchanged.
6. After approval, Method discovery and Ember selection can find it through the existing approved-knowledge path.
7. The recommended Projects navigation link reaches the live KB Sandbox route.
8. No placeholder hostname appears in rendered navigation or artifacts.
9. Automated checks and the production build remain clean.

## Explicitly deferred

- Native Organization/tenant schema
- Parent/child Project inheritance
- Automatic creation of all proposed Projects and knowledge bases
- Automatic user invitation or membership assignment
- Configurable DMS/BPM workflow engine
- External MCP interface
- Autonomous approval or publication
- Importing real confidential Sandz, HR, pricing, or customer evidence
