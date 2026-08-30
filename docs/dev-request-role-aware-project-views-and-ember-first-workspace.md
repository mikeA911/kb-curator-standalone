# Role-Aware Project Views and Ember-First Member Workspace

## Status

Proposed near-term development request.

## Context

KB Sandbox currently uses Projects as the main collaboration and authorization boundary. The Projects page is already queried through the signed-in user's RLS-scoped session, and project-bound Ember conversations already constrain retrieval to the bound Project and the evidence that user may access.

The interface should now make this operating model clearer:

- administrators and curators need a safe organization-wide portfolio and governance view;
- ordinary users should see only Projects where they are active members and only evidence they are authorized to use; and
- Ember should become the primary interface for ordinary users, while detailed Workbench pages remain available when needed.

The governing Wiki is [How KB Sandbox Is Organized: Organization, Projects and Knowledge](/wiki/how-kb-sandbox-is-organized-projects-workstreams-and-knowledge), especially “Project views depend on role, membership and authorization.”

## Architectural decision

“Full view” for an administrator or curator means **full portfolio visibility into safe operational metadata**, not unrestricted access to every customer's private content.

Platform staff may see that a Project exists and whether it needs governance attention. They must not automatically receive source titles, excerpts, document bodies, artifacts, chat history or retrieved evidence merely because they hold a platform role.

Any future exceptional-access mechanism must be separately designed, explicit, time-bound and audited. It is not part of this request.

## Goals

1. Give administrators and curators an organization portfolio view across all Projects.
2. Give ordinary users a clean view containing only Projects where they are active members.
3. Make Ember the default working surface for consultants, viewers and other ordinary Project members.
4. Keep Project membership, resource access and AI-processing sensitivity enforced independently.
5. Make the current conversation scope visible and prevent context from leaking between Projects.
6. Preserve detailed Project pages for users who need governance, curation or direct navigation.

## Non-goals

- Multi-tenant SaaS organization boundaries.
- Parent/child Projects or automatic inheritance.
- An admin “read everything” bypass.
- Manager access to employee conversations or journals.
- Replacing every existing Workbench page with chat.
- Letting Ember perform consequential actions without the existing authorization and approval gates.

## View 1 — administrator/curator portfolio

Provide an organization-wide Project portfolio for platform administrators and curators. Each Project card or row may show safe metadata such as:

- Project name, purpose, type and lifecycle status;
- owner and named Project authorities;
- active member count;
- number of attached knowledge bases, without restricted source names;
- governance authority gaps;
- unpublished updates, stale approvals or other attention indicators;
- date of latest safe Project activity; and
- whether the viewer is also a member and may open the workspace.

If the staff user is not a Project member, the interface must not expose private source names, snippets, contents, artifacts, conversations or generated outputs. Use an action such as “Manage access” or “Membership required” instead of linking through to protected content.

Implementation should use a narrowly defined metadata projection, RPC or equivalent policy-safe query. Do not use a service-role content query and then rely on the UI to hide sensitive fields.

## View 2 — Project member workspace

For non-staff users:

- show only Projects where the user has active membership;
- do not reveal private Projects through counts, search suggestions, URLs or empty placeholders;
- show only sources, documents, Wiki articles and artifacts allowed by resource policies;
- make “Ask Ember about this Project” prominent; and
- retain direct navigation to permitted Project details for users who need it.

Revoking or suspending membership must remove the Project from the user's view and prevent further project-bound retrieval immediately.

## View 3 — Ember-first home

For consultants, viewers and comparable ordinary users, make Ember the primary dashboard experience.

The initial surface should include:

- a concise greeting and suggested tasks;
- an explicit Project selector containing only authorized Projects;
- a persistent scope label such as `Using: Sandz-Call Center Support`;
- “Ask Ember” as the main action;
- a small list of the user's recent authorized Projects and conversations;
- role-appropriate quick actions and suggested prompts; and
- links produced as structured navigation actions rather than fragile prose-only Markdown.

Launching Ember from a Project should bind the conversation to that Project. Starting from the home surface should require an explicit Project choice before private Project evidence can be used. General platform questions may continue to use approved platform guidance without Project evidence.

When the user changes Project:

1. show the new scope clearly;
2. start a new conversation or establish a hard retrieval boundary;
3. do not carry retrieved evidence, citations or hidden summaries from the previous Project into the new scope; and
4. record the Project binding durably for recovery and audit.

## Permission model

Authorization must be capability- and relationship-based rather than inferred from UI labels alone.

The effective decision remains the intersection of:

1. authenticated user status;
2. active Project membership and Project role;
3. resource-level policy or grant;
4. source/version approval state;
5. information sensitivity and eligible AI environment; and
6. authority or human approval where a consequential action requires it.

Ember must use the same server-side authorization path as direct page access. Hiding a link is useful UX but is not an access control.

## Current behavior to preserve

- Any authenticated non-anonymous user may create a Project under the existing rules.
- Project listings and Project content remain RLS-scoped.
- Project-bound Ember retrieval follows the conversation's Project binding, not membership alone.
- General Ember conversations do not retrieve private Project evidence.
- Resource-level restrictions continue to apply even to Project members.
- Platform role does not automatically authorize customer-private evidence.
- Project owners/admin-authorized flows continue to manage members, governance and evidence access according to existing checks.

## Suggested implementation stages

### Stage 1 — safe portfolio and member views

- Add the administrator/curator portfolio using a safe metadata projection.
- Retain an access-scoped “My Projects” view for ordinary users.
- Add clear `Member`, `Owner`, `Curator`, `Authority gap` and `Membership required` indicators where appropriate.
- Ensure non-member staff cannot navigate from portfolio metadata into protected content.

### Stage 2 — Ember-first member home

- Introduce the Project selector and visible conversation-scope chip.
- Make project-bound Ember the dominant member action.
- Add recent authorized Projects/conversations and role-aware prompt suggestions.
- Keep the full Workbench reachable through a secondary “Explore workspace” action.

### Stage 3 — refinement and measurement

- Add accessible empty states and onboarding guidance.
- Measure successful task completion, navigation usage, denied-access events and fallback to manual pages without recording private message text in product analytics.
- Use pilot feedback to decide whether Ember should become the default landing page for additional roles.

## Acceptance criteria

1. An administrator or curator sees every Project's approved safe metadata in the portfolio.
2. A non-member administrator/curator cannot see or infer restricted source names, snippets, contents, artifacts or conversations.
3. A consultant or viewer sees only Projects where they are an active member.
4. A Project member sees only resources allowed by the second-layer resource policies.
5. Ember's scope is visible before and during a project-bound conversation.
6. Ember cites and links only evidence the current user can open.
7. A general conversation cannot retrieve Project-private evidence.
8. Switching Projects cannot carry private retrieved context into the next Project.
9. Revoking membership immediately removes listing, page and Ember access.
10. Direct URLs and server actions enforce the same rules as the rendered interface.
11. The member home works without requiring knowledge of KB Sandbox's menu structure.
12. Admin/curator governance work remains possible without making Ember the only interface.

## Required live regression personas

Test with at least:

- a platform administrator who is not a member of the target Project;
- a platform curator who is not a member;
- a Project owner;
- a Project curator;
- a consultant/member with access to general Project evidence but not a restricted pricing source;
- a member explicitly granted access to that pricing source; and
- an authenticated non-member.

For each persona, test the Projects list, direct Project URL, direct source URL, Ember retrieval, citations, Project switching and membership revocation.

## Documentation updates on completion

After implementation and live verification:

- update the governing Wiki's “Current implementation boundary”;
- update `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` with the exact routes, intents, role visibility and Ember navigation actions; and
- add a release note that distinguishes the staff portfolio from the Ember-first member workspace.
