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

**Superseded 2026-09-01, admin only:** the "non-member staff -> no link" rule above was implemented literally for both admin and curator, but that's stricter than what actually holds underneath -- `is_project_member`'s RLS already carries an unconditional `is_admin` bypass (predates this doc; not a new bypass added here, so the "no admin 'read everything' bypass" Non-goal above still holds at the *design* level), and the workspace page (View 2 below) already relies on that bypass to let a non-member admin manage a Project (`docs/test-reports/2026-08-31-orderlunch-builder-journey.md`, OL-001). Hiding "Open workspace" from an admin was therefore adding UI friction without adding any actual protection. Per owner direction, an admin viewer now always gets "Open workspace" regardless of membership; a non-member curator -- who has no such bypass -- gets a "Request membership" action instead of the dead-end "Membership required" label, addressed to the Project owner via the existing Project Notes flow. See `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md`'s "View the organization portfolio" entry for the current, accurate behavior -- treat the acceptance criteria and Stage-1 checklist below as historical for the admin/curator distinction specifically.

## View 2 — Project member workspace

For non-staff users:

- show only Projects where the user has active membership;
- do not reveal private Projects through counts, search suggestions, URLs or empty placeholders;
- show only sources, documents, Wiki articles and artifacts allowed by resource policies;
- make “Ask Ember about this Project” prominent; and
- retain direct navigation to permitted Project details for users who need it.

Revoking or suspending membership must remove the Project from the user's view and prevent further project-bound retrieval immediately.

### Member directory and addressed notes

The main Project page should show its active members as a compact directory. Each visible member entry should include only the profile information already authorized for display, such as display name or email and Project role/business function where available.

Selecting a member should offer **Send note**. Reuse the existing Project Notes capability with:

- `recipient_type = user`;
- the selected member as `recipient_user_id`;
- the current Project as `project_id`; and
- an optional Project/member context reference where useful.

This is an addressed Project note, not a new direct-message system and not an Ember conversation. The note remains inside the Project's governed Notes area, may receive replies, and follows the existing open/resolved lifecycle.

Rules:

- only an active member of the Project may send a member note;
- the selected recipient must also be an active member of that same Project at send time;
- the author and addressed recipient may read the note under the existing Project Notes policy;
- broader curator/admin visibility must follow the existing notes policy and must not grant access to unrelated restricted evidence linked from the note;
- removing a member must prevent new notes being addressed to them while preserving authorized historical records;
- the member directory must not expose users from other Projects; and
- clicking the member name must not open an unrestricted platform-wide profile.

The first release needs no presence indicator, external email/SMS delivery, file attachment, group chat or real-time messaging. A small modal or inline form for subject and message body is sufficient.

### Every connected Project remains a full workspace

Every Project displayed beneath the Main/Sandz visual root must link to its own normal Project workspace. It is not a lightweight folder or inherited subproject.

Each connected Project must retain:

- its own main Project page;
- its own active-member directory;
- its existing Members management page for authorized owners/admins;
- its own Project roles and approval authorities;
- its own attached-knowledge-base section;
- the ability for authorized users to attach an existing knowledge base or create/use a Project-specific knowledge base through the existing governed flows;
- its own accessible sources, Wiki guidance, Workstreams, notes and artifacts; and
- its own project-bound Ember entry point and conversation scope.

The shared knowledge base connecting it to Main/Sandz is simply one of that Project's attachments. It does not cause the connected Project to inherit Main/Sandz members, authorities, private sources or permissions. Any additional knowledge bases and memberships remain explicitly configured on that Project.

## Read-only organization Explorer

Add a small read-only Explorer that helps users visualize the organization through relationships that already exist in KB Sandbox. It is a navigation aid, not a file manager and not a new hierarchy model.

Display the Explorer on a Project page. The Project the user opened is the visual root. For example, navigating to the **Sandz** Project displays Sandz at the top and discovers the user's other accessible Projects through shared knowledge-base attachments such as `sandz-shared-kb`.

This does not make Sandz a native Organization entity or technical parent. It is an ordinary Project serving as the human-recognizable entry point for the visualization. No organization setting, organizations table or parent identifier is required.

The Explorer should present:

```text
Current Project, for example Sandz
|
+-- shared knowledge base, for example sandz-shared-kb
|   +-- accessible shared sources
|   +-- connected accessible Project
|       +-- additional attached knowledge base
|           +-- accessible sources
|
+-- additional attached knowledge base
    +-- accessible sources
```

The relationships come from the existing Project-to-knowledge-base attachments and each knowledge base's source documents. A connected Project is one that shares an attached knowledge base with the current root Project. Do **not** add `parent_project_id`, infer a durable parent/child relationship from Project names, or create another source of truth for hierarchy.

An organization-wide knowledge base, such as `sandz-shared-kb`, may appear beneath every Project to which it is attached. This repetition is intentional: it shows that the Project can use that common body of knowledge. A Project may also show additional shared knowledge bases and knowledge bases created specifically for that Project.

Visibility must be calculated for the current user:

- ordinary users see only Projects where they are active members;
- within those Projects, they see only knowledge bases, sources and documents they are permitted to discover;
- restricted branches must be omitted rather than displayed as locked placeholders;
- administrators and curators receive the same content-access filtering, even if their separate portfolio view shows safe Project metadata; and
- source counts must not reveal hidden resources.

The root Project is visible only when the current user is authorized to enter it. Its use as a visual starting point is not evidence that the user may view every connected Project or every source beneath it.

Every visible node is navigation only:

- selecting a Project opens its Project page;
- selecting a knowledge base opens its permitted knowledge/source view; and
- selecting a source opens that source only when direct access is authorized.

The Explorer must not support moving, attaching, detaching, renaming, deleting or drag-and-drop operations. Existing governed screens remain responsible for those changes.

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

## View 4 — Ember awareness of Project members

When Ember is opened from a Project page, users should be able to ask:

- “Who is working on this Project?”
- “Who owns this Project?”
- “Who handles commercial approval?”
- “Can I send Maria a Project note?”

Do **not** copy the full Project roster into every system prompt. Membership changes, may contain personal information and is unnecessary for most turns. The prompt addendum may tell Ember that member lookup is available, but records should be fetched only when required.

Add a Project-bound tool such as `list_project_members`. It must:

- be offered only when the conversation has a server-resolved Project binding;
- accept no model-supplied `projectId`;
- query through the caller's RLS-scoped session or an equivalently narrow permission-checked function;
- default to active members;
- support an optional bounded search by name, email fragment, Project role or business function; and
- return only the minimum authorized fields needed for collaboration.

Suggested result fields are a stable recipient/member identifier, authorized display label, Project role, business function where available, owner status and approval responsibilities already visible to the caller.

Do not return unrelated profile data, global platform roles, private activity, conversations, journals, resource-access grants or membership in other Projects. Ember must fetch current results rather than guess from chat history and must not persist the roster into summaries or long-term memory merely because it was retrieved.

General, unbound Ember chat must not offer this tool or enumerate any Project roster. It should ask the user to open or select an authorized Project first.

### Optional note sending through Ember

The member directory's **Send note** action uses the existing Project Notes flow directly and does not depend on Ember. As a later increment, Ember may gain a separate `send_project_note` tool.

That tool must:

- be available only in a Project-bound conversation;
- accept a recipient returned from the bound member lookup rather than an arbitrary user;
- re-check that sender and recipient are active members of the same Project;
- reuse the existing `project_notes` record with `recipient_type = user`;
- preserve current note RLS, reply and resolution behavior;
- show the recipient, subject and body to the user; and
- obtain explicit confirmation immediately before sending.

Return a structured link to the resulting note. Email, SMS, attachments, group chat and external delivery remain out of scope.

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

### Project evidence retrieval remains permission-scoped

The existing evidence design is the security foundation and must be preserved:

1. The conversation's Project binding is resolved server-side.
2. Project-specific prompt guidance and tools are offered only when that binding resolves.
3. `search_project_knowledge` accepts no model-controlled Project ID.
4. Knowledge scope comes from existing Project-to-knowledge-base and Project-to-Wiki attachments.
5. Retrieval runs using the current user's RLS-scoped Supabase client.
6. Strict Project membership policies constrain visible attachments.
7. `has_evidence_access` independently filters restricted sources, documents, Wiki content and artifacts without an administrator, curator or owner content bypass.
8. Information sensitivity separately decides whether the selected AI provider may process the authorized material.

Member awareness and evidence authorization are separate. Seeing that someone belongs to a Project does not reveal that person's restricted sources. Ember must not infer evidence access from Project role, business function or approval responsibility, and member results must never become an alternate retrieval authorization list.

Prompt instructions explain the behavior but do not enforce it. Database/RPC policies and server-side tool scoping remain the authorization boundary.

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
- Add the read-only organization Explorer using existing Project-to-knowledge-base-to-source relationships.
- Show the active member directory on the main Project page and connect **Send note** to the existing addressed Project Notes flow.
- Confirm that every connected Project link opens the complete Project workspace, including its member directory/Members page and attached knowledge bases.

### Stage 2 — Ember-first member home

- Introduce the Project selector and visible conversation-scope chip.
- Make project-bound Ember the dominant member action.
- Add recent authorized Projects/conversations and role-aware prompt suggestions.
- Keep the full Workbench reachable through a secondary “Explore workspace” action.

### Stage 3 — Project-bound Ember member awareness

- Add the bound `list_project_members` tool with no Project ID input.
- Add narrow prompt guidance for participant, ownership, responsibility and recipient questions.
- Return structured, minimal member results.
- Verify that general Ember chat cannot enumerate members.
- Re-run evidence-access regression tests to prove member visibility does not weaken retrieval controls.

### Stage 4 — optional addressed notes through Ember

- Add `send_project_note` only if conversational note sending is wanted for this release.
- Require explicit confirmation of recipient and message.
- Reuse existing Project Notes storage, access rules and pages.
- Return a working structured note link.

### Stage 5 — refinement and measurement

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
13. The Explorer introduces no Project-parent schema or name-derived authorization behavior.
14. The Explorer contains only links and offers no move, attach, detach, rename or delete action.
15. Shared knowledge bases appear under each attached, visible Project without duplicating their underlying data.
16. Hidden Projects and restricted resources do not leak through labels, counts, placeholders or links.
17. Opening the Sandz Project displays Sandz as the Explorer root and discovers accessible connected Projects through `sandz-shared-kb` attachments.
18. The Explorer works from the selected Project and creates no Organization entity, Project hierarchy, tenancy boundary or access entitlement.
19. Cycles caused by many-to-many knowledge-base attachments are collapsed into one visible node or reference and never cause recursive rendering.
20. The main Project page lists all active members the current viewer is authorized to see.
21. Selecting a member opens a small addressed-note form and creates an existing Project Note for that user.
22. A user cannot address a note to a non-member, inactive member or member of another Project.
23. The recipient can open and reply to the note through the existing Project Notes pages.
24. No new private-message table, unrestricted user directory or cross-Project messaging channel is introduced.
25. Every connected Project has its own main page, member directory, authorized Members management page and attached-knowledge-base section.
26. Opening a connected Project binds Ember to that Project rather than the Main/Sandz root.
27. Sharing the Main/Sandz knowledge base does not inherit members, roles, authorities or access grants between Projects.
28. A bound Project member can ask Ember who belongs to the Project and receive only current authorized member information.
29. `list_project_members` accepts no Project ID from Ember.
30. General Ember chat has no member-lookup tool and cannot enumerate a Project roster.
31. Removed or inactive members disappear from default Ember results without a prompt or deployment update.
32. Project role, business function and approval authority are not conflated.
33. Member lookup reveals no restricted evidence or resource-level grants.
34. `search_project_knowledge` continues to return only evidence authorized by Project membership and resource grants.
35. A non-member platform administrator or curator cannot retrieve restricted Project evidence through Ember.
36. A member without access to restricted pricing cannot retrieve, cite, summarize or infer it through Ember; a separately granted member can.
37. Switching Project conversations changes both member and evidence scope without carrying results across the boundary.
38. If Ember note sending is implemented, she cannot address a non-member or inactive member and must obtain explicit confirmation before sending.

## Required live regression personas

Test with at least:

- a platform administrator who is not a member of the target Project;
- a platform curator who is not a member;
- a Project owner;
- a Project curator;
- a consultant/member with access to general Project evidence but not a restricted pricing source;
- a member explicitly granted access to that pricing source;
- an authenticated non-member; and
- a removed or inactive former member.

For each persona, test the Projects list, direct Project URL, direct source URL, Ember retrieval, citations, Project switching and membership revocation.

## Documentation updates on completion

After implementation and live verification:

- do not change the organization Wiki while Claude's current Wiki test is active; update it only after the owner explicitly reopens it;
- update `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` with the exact routes, intents, role visibility and Ember navigation actions; and
- add a release note that distinguishes the staff portfolio from the Ember-first member workspace.
