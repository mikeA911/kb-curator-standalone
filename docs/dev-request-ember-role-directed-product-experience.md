# Ember Role-Directed Product Experience

## Status

Proposed high-priority product-experience development request.

## Executive decision

KB Sandbox will remain one governed platform, but it will present two deliberately different experiences:

- **Ember** is the everyday product for members and the primary delivery workspace for consultants, builders and forward-deployed engineers (FDEs).
- **KB Sandbox** is the administration, configuration, knowledge-curation, evaluation and governance environment used primarily by curators and administrators.

Do not split these into separate applications or duplicate their data, authentication or authorization systems. Build role-directed shells over the same Projects, conversations, knowledge, artifacts, Methods, permissions and audit records.

Customer-facing language:

> **Ember is your organization's trusted AI workspace.**
>
> **Powered by KB Sandbox: governed knowledge, evidence and connected capabilities.**

Builder-facing language:

> **Build with KB Sandbox. Deliver through Ember.**

## Overall objective

Make useful, governed organizational AI accessible to employees without first teaching them KB Sandbox's internal architecture. A new member should be able to open Ember on a phone or computer, select an authorized work context and complete a useful task without understanding Projects, Workstreams, Methods, RAG, Wiki articles, artifacts, agents or MCP servers.

At the same time, give consultants, builders and FDEs a compelling delivery experience: they should be able to guide customer work, apply Methods, create evidence-backed deliverables and connect external capabilities while using the same approachable Ember interface their customers will use.

Curators and administrators retain the deeper KB Sandbox interface because their jobs require visibility into knowledge quality, approvals, permissions, configuration and operational governance.

## Why this direction is necessary

The current interface exposes too much of the platform's internal structure to ordinary users. It makes KB Sandbox appear broad and complicated before the user experiences its value. The role model already implies four different jobs:

- a **member** wants help completing everyday work;
- a **consultant** acts as a builder or FDE helping customers adopt and extend AI;
- a **curator** is normally a department head or trusted assistant responsible for improving the team's productivity and knowledge quality; and
- an **administrator** owns and operates the single-client platform.

These roles should not receive essentially the same navigation with different buttons hidden. They require different starting points, vocabulary and levels of detail.

This direction also sharpens competitive positioning. Governed enterprise AI platforms such as ReN3 already combine enterprise knowledge, no-code agents, permissions and workflow governance. KB Sandbox should not differentiate merely by claiming that it also has chat, RAG or governed agents. Its stronger proposition is the operating model around them:

1. employees accomplish daily work through Ember;
2. curators make departmental knowledge trustworthy and useful;
3. builders and FDEs use evidence-led Methods to design, integrate, evaluate and improve customer solutions;
4. external agents, connectors, APIs and MCP servers remain portable capabilities rather than trapping customers inside one no-code studio; and
5. decisions, evidence, approvals and continuing fitness remain visible through KB Sandbox.

The differentiator is therefore not simply an agent builder. It is a governed collaboration and assurance platform that enables regional builders to deliver practical AI solutions to organizations that may not have large internal AI teams.

## Product principles

1. **One platform, role-directed experiences.** Preserve one source of truth and one authorization model.
2. **Conversation on the surface.** Members primarily express an intent or desired outcome to Ember.
3. **Governance underneath.** Retrieval, tools and actions continue to use server-side Project, resource, sensitivity and authority checks.
4. **Evidence in the result.** Answers remain concise, with sources, context, approvals and execution details available progressively.
5. **Mobile first, not mobile only.** Quick questions, approvals and actions must work well on a phone; document-heavy work must remain strong on desktop.
6. **Outcome language first.** Internal concepts may be revealed when useful but must not be prerequisite knowledge.
7. **Capabilities appear when relevant.** Extra consultant authority should surface contextually instead of turning Ember into a permanent engineering dashboard.
8. **No security through navigation.** Hiding a page or control improves usability but never replaces authorization.

## Experience 1 — member Ember workspace

After sign-in, a platform `member` should land in Ember rather than the current general dashboard.

The first viewport should contain only:

- Ember identity and organization name;
- a prominent conversation composer;
- the current authorized Workspace/Project selector and visible scope;
- a short greeting appropriate to the user's current context;
- a small set of Project- and role-relevant suggestions;
- recent authorized work or conversations; and
- compact access to notifications and profile.

Suggested mobile navigation:

```text
Ember | My work | Explore | Me
```

Typical suggestions include:

- prepare a proposal;
- answer a support question;
- find approved company guidance;
- continue recent work;
- submit a candidate source;
- report a problem;
- suggest an improvement; and
- request an FAQ.

Members must not need to navigate directly through knowledge-base administration, Wiki curation, evaluations, agent registration or provider settings.

## Experience 2 — consultant, builder and FDE workspace

The `consultant` role represents builders and forward-deployed engineers. Consultants should start in Ember and retain the same clean core experience as members, with additional capabilities revealed when relevant.

Suggested navigation:

```text
Ember | Client work | Explore | Me
```

Contextual consultant capabilities may include:

- create or continue a customer Workstream;
- apply a guided Method;
- prepare architecture and implementation artifacts;
- compare implementation options;
- design a connector, API integration, agent or MCP server;
- register a candidate connected capability;
- run an evaluation;
- prepare a handoff; and
- request curator or customer approval.

Ember should begin with the customer's desired outcome—for example, “What are you trying to help this customer accomplish?”—and recommend the appropriate Method. Workstream, Method and technical execution details may appear in an expandable **How this work is being performed** view.

This request must not grant consultants new authority merely because the UI exposes a capability. Existing Project roles, resource permissions and approval authorities remain decisive.

## Experience 3 — curator workspace

Curators continue to use KB Sandbox's management interface, but their home should increasingly be framed as a departmental productivity and knowledge-governance workspace.

It should help answer:

- what needs my review or approval;
- what knowledge staff have submitted;
- which sources are stale, missing or frequently needed;
- where staff repeatedly ask the same questions;
- where AI could save the team time;
- whether Ember's answers are adequately supported; and
- which members, authorities and knowledge bases are configured for my Projects.

Provide a prominent **Open Ember as a team member** action so curators can experience and validate the member journey.

## Experience 4 — administrator workspace

Administrators retain the full KB Sandbox operating interface, including:

- users, platform roles and Project membership;
- Projects and organization-wide safe metadata;
- knowledge configuration and curation;
- model and provider configuration;
- information sensitivity and security policies;
- agent, connector and MCP registration;
- evaluation, governance and audit;
- deployment and platform settings; and
- builder/customer setup.

These functions should be grouped clearly under KB Sandbox management and must not leak into the normal member experience.

Administrators and curators should be able to open Ember without changing accounts. Their content access while using Ember must still follow the established Project and resource authorization model.

## Member-facing vocabulary

Keep canonical database and documentation terminology, but prefer approachable labels in Ember:

| Canonical concept | Preferred Ember wording |
| --- | --- |
| Project | Workspace or team context |
| Workstream | Task or piece of work |
| Method | Guided approach |
| Knowledge base | Approved knowledge |
| Source/RAG evidence | Supporting documents |
| Wiki article | Organizational guidance |
| Agent, connector or MCP server | Connected capability |
| Artifact | Result or document |
| Evaluation | Quality check |

Do not mechanically rename existing routes, tables or governance documentation in this stage. Labels must remain unambiguous, and advanced details may show the canonical term alongside the approachable one.

## Ember response hierarchy

Build on the existing structured-response and Artifacts implementation. Do not create another response format.

The default response presentation should prioritize:

1. **Answer** — the concise response or outcome;
2. **Result** — a generated document, comparison, record or completed action;
3. **Next step** — no more than three high-value actions;
4. **Evidence** — authorized citations and their role;
5. **Context** — the Workspace/Project and knowledge scope used; and
6. **Approval** — any required human decision or remaining authority gap.

Evidence, retrieval details, Method, Workstream and execution details should be expandable. Do not hide warnings, uncertainty, approval requirements or consequential-action confirmations behind optional disclosure.

Routine navigation links remain response actions and must not be collected as Artifacts merely because Ember proposed them.

## Responsive requirements

Design from a narrow phone viewport upward:

- one dominant action per screen;
- large touch targets and keyboard accessibility;
- no essential wide tables in Ember;
- concise cards with expandable detail;
- a composer that remains reachable during a conversation;
- usable document previews and downloads;
- explicit confirmation screens for consequential actions;
- predictable focus when panels open and close; and
- no nested modal journeys.

The first release remains a responsive web application. A native mobile application is out of scope. Preserve the option of a later installable progressive web application.

## Authorization and privacy invariants

This request builds on, and must not weaken, `docs/dev-request-role-aware-project-views-and-ember-first-workspace.md` and the existing project-aware retrieval implementation.

In particular:

- the Workspace/Project selector lists only Projects the current user may use;
- launching Ember from a Project binds the conversation server-side;
- changing scope establishes a hard retrieval boundary and must not carry private evidence from the previous Project;
- general Ember must not retrieve Project-private evidence merely because the user belongs to a Project;
- resource-level access remains independent of Project membership;
- information sensitivity remains independent of content access;
- no platform-role shortcut may expose restricted evidence;
- tools must not trust model-supplied Project or user identifiers where a server-resolved binding is available;
- consequential actions retain confirmation and approval gates; and
- restored conversations must re-authorize referenced records before rendering them.

## Relationship to existing development requests

- This request **refines and supersedes the presentation requirements** in “View 3 — Ember-first home” of `docs/dev-request-role-aware-project-views-and-ember-first-workspace.md`.
- It **does not supersede** that request's portfolio, Explorer, member-awareness, Project membership or evidence-access rules.
- It reuses `docs/dev-request-structured-assistant-responses-and-artifacts-panel.md` for response payloads, rendering, navigation and Artifacts.
- It reuses the project starter prompt and curator-led onboarding implemented under OR-030.
- It must use `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` rather than introduce a parallel navigation guide.

## Suggested implementation stages

### Stage 0 — inventory and design confirmation

- Inventory current post-login routing, role navigation, Ember launcher states, recent conversations, Project selection and narrow-screen behavior.
- Identify which existing components can be reused without duplicating chat or authorization logic.
- Produce simple member and consultant mobile/desktop wireframes before implementation.
- Confirm the exact role-routing matrix and escape route.

### Stage 1 — role-directed shell

- Redirect `member` and `consultant` users to the Ember workspace after login.
- Preserve curator/admin landing behavior.
- Add role-specific navigation and remove management navigation from the member shell.
- Add a temporary **Switch to classic workspace** escape route for the pilot.
- Allow curator/admin users to open Ember deliberately without changing role.

### Stage 2 — Ember-first home

- Add the visible authorized Workspace/Project selector.
- Add current-scope labeling and safe scope switching.
- Add role- and Project-aware starter suggestions.
- Display recent authorized conversations and work.
- Provide useful empty states for users with no Project access or no recent activity.

### Stage 3 — progressive work experience

- Apply the response hierarchy consistently using existing structured responses.
- Add **My work** for resumable tasks, Workstreams and relevant pending actions.
- Add a permission-aware **Explore** surface for organizational guidance and supporting documents.
- Surface consultant capabilities contextually through Ember and Client work.
- Keep canonical Workbench links available as secondary actions for authorized users.

### Stage 4 — measurement and refinement

- Test on representative phone, tablet and desktop sizes.
- Measure whether new members can complete defined tasks without training in KB Sandbox terminology.
- Measure time to first useful result, task completion, abandonment, clarification loops, source opening and approval completion.
- Use pilot feedback to decide when the classic-workspace escape route can be removed.

## Out of scope

- Splitting Ember and KB Sandbox into separately deployed applications.
- Rewriting existing RLS or evidence-access architecture except to correct a proven defect.
- A native iOS or Android application.
- A general-purpose no-code agent studio.
- Automatic authority expansion based on platform role or UI route.
- Replacing curators or administrators with autonomous agents.
- A complete CRM, HRIS, accounting or project-management system.
- Exposing graph construction as the primary user experience.
- Building every proposed member and consultant quick action in the first stage.

## Acceptance criteria

1. A `member` signs in and lands in the Ember workspace rather than the administrative/general dashboard.
2. A `consultant` signs in and lands in the consultant Ember shell with **Client work**, without receiving curator/admin controls.
3. Curator and administrator landing behavior remains available and their existing management capabilities are not removed.
4. A curator or administrator can deliberately open Ember and experience the appropriate user-facing flow.
5. Member navigation contains only Ember, My work, Explore and Me, plus explicitly authorized contextual actions.
6. The initial Ember viewport is usable on a narrow phone without horizontal scrolling or essential controls hidden off-screen.
7. The Workspace/Project selector contains only authorized Projects and makes the active scope unmistakable.
8. Changing Project starts a new conversation or an equivalent proven hard retrieval boundary.
9. No response, citation, artifact or hidden summary from one private Project leaks after switching to another.
10. General Ember remains unable to retrieve private Project evidence solely because the user holds membership elsewhere.
11. Starter suggestions are appropriate to both the user's role and current Project, with a safe generic fallback.
12. Recent work and conversations reveal only currently authorized records.
13. Member-facing labels use approachable language while advanced views retain canonical traceability.
14. Existing structured response cards, trusted navigation and Artifacts continue to work after the shell change.
15. Answers show the useful result first while evidence, context and execution details remain available progressively.
16. Warnings, uncertainty, approval requirements and confirmations remain prominent rather than hidden.
17. Consultant-only options never confer authority beyond existing Project roles and approval rules.
18. Curator/admin management functions do not appear in the normal member shell.
19. The temporary classic-workspace escape route is visible, auditable if needed and does not bypass authorization.
20. Keyboard, focus, screen-reader and touch interactions are covered for navigation, Project selection, response actions and expandable sections.
21. Existing project-bound retrieval, direct-source access and membership-revocation regression tests remain green.
22. The navigation catalogue and release notes accurately describe the final role-directed paths and terminology.

## Required live validation journeys

### Journey A — everyday member

On a phone-sized viewport, sign in as a member, enter an authorized sales Workspace, ask Ember to prepare a proposal outline, inspect the supporting documents, continue the work and report a problem. The user must never need a management screen or an explanation of RAG, Wiki, Workstream or MCP.

### Journey B — restricted member

Sign in as a member who can use the Project but cannot access a restricted pricing source. Confirm that the Project appears, the restricted source does not appear in Explore or recent work, Ember cannot retrieve it, and a direct URL remains denied.

### Journey C — consultant/FDE

Sign in as a consultant, start from Client work, ask Ember to help design a connected capability, follow a recommended Method, create a governed artifact and request the appropriate approval. Confirm that technical detail is available without dominating the initial experience.

### Journey D — curator

Sign in as a curator, review a member-submitted source and Project starter guidance, then open Ember as a team member and verify the department experience without gaining access to unrelated restricted material.

### Journey E — administrator

Sign in as an administrator, confirm all operating/configuration functions remain available under KB Sandbox, then open Ember and verify that its Project evidence still follows the established permission path.

## Success measures

The primary product test is:

> A new employee can open Ember, choose an authorized work context and complete a useful task without being taught KB Sandbox's internal vocabulary.

Track at least:

- median time from sign-in to first useful Ember result;
- percentage completing the representative task without curator/admin assistance;
- clarification turns before the task begins;
- rate of opening evidence and generated results;
- approval completion time;
- member return usage over seven days;
- consultant time to establish a customer Workstream and produce a handoff; and
- permission or scope errors, especially attempted cross-Project retrieval.

Do not claim quantified productivity savings unless the baseline and measurement method are recorded.

## Documentation on completion

- Update `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` in the same production commit.
- Add release notes describing the role-specific landing pages, navigation and vocabulary.
- Update onboarding material for members, consultants/builders, curators and administrators.
- Record deliberate deferrals and the continued availability of the classic workspace.
- Add the implementation and pilot-measurement status to the owner roadmap using the next available identifier.

