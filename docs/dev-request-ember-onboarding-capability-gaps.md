# Development Request: Ember Onboarding Capability Gaps

**Status:** Proposed
**Created:** 30 August 2026
**Area:** Ember tool registry / project governance / navigation knowledge / project lifecycle
**Priority:** Blocks re-running the Ember-guided Enterprise Knowledge Onboarding experiment
**Source:** Run 1 of the Sandz Enterprise Knowledge Onboarding experiment (`Onboarding.docx`) -- Ember was asked, unaided, to onboard a realistic Sandz knowledge structure through natural conversation. Full run created and then cleanly rolled back two test Projects; findings below are drawn directly from the recorded conversation, its `chat_messages.tool_calls`, and the live UI, not from a desk review.

## Purpose

Close four concrete gaps the onboarding experiment surfaced before re-running it as an instrumented dry run. Each gap below is deliberately scoped to what Run 1 actually evidenced -- this is not a general Ember roadmap request.

## 1. Tool Gap — Ember cannot discover existing Projects

### What happened

Asked to onboard Sandz, Ember's only tool call was `search_wiki` (found the matching Workbench Method articles), then she went straight to `create_project`. She created a brand-new onboarding project without ever checking for -- or asking about -- the three pre-existing Sandz–Zadara pilot Projects, only reasoning about them once the user volunteered they existed. **This was not a judgment lapse: there is no list/search-projects tool in her registry at all** (confirmed against `src/lib/mcp/tools.ts`'s `getToolSpecs()`), so she had no way to have found them even if she had thought to look.

### Goal

Give Ember a tool to find existing Projects by name/topic before proposing to create a new one, and instruct her to use it early in any onboarding-shaped request.

### Design

Since KB Sandbox is deployed as one dedicated instance per client (ADR-0001), this needs no tenant/org scoping -- it's a plain search over `projects`, gated by the same RLS every other project read already goes through (the caller's own `ctx.supabase` client, no service-role bypass).

- New tool `search_projects` in `src/lib/mcp/tools.ts`, registered alongside `create_project`/`create_workstream` in the same `getToolSpecs()`/`callTool` registry (matches the file's own stated principle: each tool wraps an existing, already-permission-checked service function, no new authorization logic here).
- Input: `{ query: string, limit?: number }` -- simple `ilike` match on `projects.name` (and maybe `objective`) is sufficient; this doesn't need embedding-based search like `search_wiki`, the corpus is small and names are the signal.
- Output: array of `{ id, name, projectType, status, objective }` -- enough for Ember to reason about relevance and cite a project by name, not enough to leak restricted content (matches `search_wiki`'s own shape: metadata + enough context to decide, not a data dump).
- Service function: a thin new function in `src/lib/workbench/projects.ts` (e.g. `searchProjects(ctx, query, limit)`), reusing the same RLS-scoped `ctx.supabase` pattern every other read in that file already uses.

### System-prompt change

`src/lib/chat/loop.ts`'s `SYSTEM_PROMPT` should instruct Ember to call `search_projects` before proposing to create a new Project whenever the request is about organizing, onboarding, or setting up something that might already exist in some form -- mirroring the existing "call search_project_knowledge before search_wiki" precedence guidance already in the project-bound addendum.

### Completion criteria

Re-running Run 1's opening prompt results in a `search_projects` (or equivalent) tool call before any `create_project` call, and Ember's reply references the existing Sandz–Zadara pilots without being told about them first.

## 2. Governance/Security Gap — Ember's "restricted" language outruns what she actually enforced

### What happened

Ember created a Project she called "Restricted," with a workstream guardrail reading "no general company or client-facing users should be added," and told the user HR documents would be "only accessible to HR personnel." **None of that was actually true at the point she said it.** `create_project`'s tool schema has no visibility/access field; a workstream `guardrail` is confirmed free text with no runtime enforcement (this is also the exact open item already tracked in `docs/ROADMAP.md`'s M7 section: "Replace free-text-only guardrails with reusable, versioned guardrail templates where runtime enforcement is meaningful"). No `resource_access_policies` row was created, no membership was restricted -- the new project's access was identical to any other project's.

This is not a request to build a new access-control system. The classification/enforcement mechanism this needs already shipped this week (Information Sensitivity Classification: `resource_access_policies.classification` + `.information_sensitivity`, `projects.information_sensitivity`, enforced pre-inference in `src/lib/chat/loop.ts` and via `withPolicyGate`). **The gap is entirely that Ember cannot invoke it, and that her prose doesn't distinguish "I did this" from "here is what still needs to happen."**

### Design

**2a. Expose project-level classification as an Ember tool.** A thin wrapper tool `classify_project` (or fold into a general `classify_resource` tool if a future call site needs the resource-level form too) around the already-existing `setProjectInformationSensitivity` (`src/lib/projects/evidence-access.ts`) -- lets Ember actually set a project's `information_sensitivity` tier when a user asks for something to be treated as sensitive, so when she says "restricted" it corresponds to a real row, not just a guardrail string.

**2b. Do not add a member-invite tool.** `addProjectMember` (`src/lib/workbench/projects.ts`) already exists as a service function, but granting a specific person access to specific content is exactly the kind of consequential, authority-approved decision the platform's own principle already protects (see the loop's project-prompt addendum: "consequential decisions remain human- or authority-approved"). Run 1's transcript shows Ember handling this well *once she's honest about it* -- declining to fake the action, explaining the security boundary, and directing the user to do it themselves. That behavior should be preserved and generalized, not replaced with an auto-tool.

**2c. Fix the overclaiming itself.** Add explicit guidance to `SYSTEM_PROMPT` (or a project-onboarding-specific addendum): Ember must never describe a Project, resource, or workstream as "restricted," "secured," or "isolated" unless she has just invoked a real classification/policy tool this turn. Where access needs configuring but she cannot do it herself, she should say so plainly and name the specific next human action -- the same honesty already on display in the member-invite exchange, applied consistently to every access-sounding claim, not just the ones she happens to lack a tool for.

**2d. Fix the specific navigation inaccuracy this exposed.** When guiding the user to restrict membership, Ember's reply hedged between two different real pages: "Go to Access & Evidence (or the project membership settings)." These are not the same page -- `/projects/[id]/members` adds people, `/projects/[id]/access` classifies resources/the project itself. Worth noting: a `get_navigation_guide` tool already exists (`src/lib/mcp/tools.ts`, reads `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` live) and the catalogue's "Manage access and AI-processing sensitivity" entry (added this week) already names both pages correctly and distinctly -- **but Ember never called `get_navigation_guide` during Run 1 at all.** Add system-prompt guidance to call it before giving any specific page-level navigation instruction, rather than answering from general/trained knowledge -- this is a broader fix than this one instance, since it's the same failure mode item 4 of the source experiment's discovery backlog would eventually surface elsewhere too.

### Completion criteria

Re-running the HR-restriction portion of Run 1: Ember either (a) actually invokes `classify_project` and her reply matches what was set, or (b) explicitly says the project isn't yet restricted and names the exact page for the user to do it -- never both claims "restricted" and takes no corresponding action. Navigation guidance for a specific page comes from a `get_navigation_guide` call, not memory.

## 3. Documentation/Method Gap — no naming-convention guidance for Ember to follow

### What happened

Across the whole run, Ember never asked about or surfaced a naming convention, and invented her own ("Sandz HR Workspace" instead of "Sandz-HR"). This is expected, not a defect: nothing in the Handbook/Wiki currently documents an organization/naming convention for her to have found via `search_wiki` even if she'd looked.

### Status: waiting on Mike, not a build item here

Mike is authoring a Wiki article covering how to represent an "organization" (a client/deployment, per the ADR-0001 single-tenant model) using the Project + naming-convention pattern. Once written:

1. Approve it into the Wiki as `platform_handbook` category, same review gate as every other Handbook article.
2. Confirm `search_wiki` actually retrieves it for a query like "Sandz organization structure" or "naming convention" before the next test run (a quick manual check, same pattern used to verify the Vocabulary article's retrievability earlier this week).
3. Re-run the onboarding conversation and confirm Ember surfaces and follows the convention without being told it directly.

No code change is implied by this item -- it's purely a content gap, and the fix is Mike's Wiki article plus the retrieval check above.

## 4. KBS Capability Gap — no way to delete a Project

### What happened

Not part of Run 1's live conversation, but discovered while cleaning up its test data: **there is no project-deletion capability anywhere in KB Sandbox**, for anyone, including admin. Cleanup required direct service-role database access outside the application entirely. This item is a standing product gap independent of the onboarding experiment, not just a testing convenience -- flagged explicitly by Mike as something KBS needs regardless of this experiment.

### Design

`projects.status` already includes `'archived'` (shipped this week as part of the project status pipeline) -- that remains the right default "get this out of the way" action for most cases: reversible, no data loss, already built. This item adds a genuine, separate **hard delete**, for the cases archiving doesn't cover (test/experiment cleanup, a project created by mistake, an explicit removal request).

- Scope to admin only (or admin + the project's own owner -- decide during implementation; admin-only is the safer default to start).
- Require the project to be `archived` first, or require typing the project's name to confirm -- a deliberate speed bump on an irreversible action, consistent with this codebase's existing pattern for other consequential actions.
- Cascade delete in dependency order: `workstream_artifacts` → `project_workstreams` → `project_members` → `resource_access_policies`/`resource_access_grants` scoped to the project → `project_knowledge_bases`/`project_wiki_articles` links → any `conversations` bound to the project (and their `chat_messages`) → the `projects` row itself. (This is the same order Run 1's manual cleanup used successfully -- see the experiment log.)
- New service function `deleteProject(ctx, projectId)` in `src/lib/workbench/projects.ts`, a Server Action wrapper in `src/app/actions/projects.ts`, and a confirmation-gated control on the project page (visible only to admin) or a dedicated admin project-management view.
- **Not an Ember tool.** Deletion is irreversible and consequential -- Ember may navigate a user to the delete control (once `get_navigation_guide`'s catalogue documents it) but should never be able to invoke it herself, matching the reasoning in 2b above.

### Completion criteria

An admin can delete a Project (and everything it owns) entirely through the KB Sandbox UI, with no need for direct database access -- verified against a real test project the same way Run 1's manual cleanup was verified (row counts back to baseline, no orphaned children in any of the tables listed above).

## Recommended sequencing

1. Item 4 (project deletion) first -- independent of Ember, unblocks faster/cleaner iteration on the rest, and was already needed regardless of this experiment.
2. Item 1 (`search_projects`) and item 2 (classification tool + honesty/navigation prompt fixes) together -- both are `src/lib/mcp/tools.ts` + `SYSTEM_PROMPT` changes touching the same files, worth doing as one pass.
3. Item 3 waits on Mike's Wiki article; re-verify retrieval once it's approved.
4. Re-run the onboarding experiment (Run 2, the instrumented dry run originally planned to follow Run 1) once 1, 2, and 4 are live and 3's Wiki article is approved and confirmed retrievable.

## Related documents

- `docs/design-notes/ai-policy-enforcement-service-and-context-manifest.md` -- the classification/policy mechanism item 2 wires Ember into.
- `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` -- item 2d's navigation-accuracy fix and item 4's eventual documentation.
- `docs/ROADMAP.md` (M7 — Govern) -- guardrail runtime-enforcement is already a tracked open item there; item 2 is a concrete instance of it, not a new direction.
