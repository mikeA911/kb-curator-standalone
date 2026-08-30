# Sandz Enterprise Knowledge Onboarding — Ember Experiment Report

**Date:** 2026-08-30
**Environment:** local dev build (`kb-sandbox-dev`), Supabase project shared with production
**User:** `test-consultant@kbsandbox.local` (ordinary consultant role — not admin/founder, per the experiment's own success criterion)
**Model displayed:** Gemini 3.5 Flash (default)
**Source brief:** `Onboarding.docx` — Ember-Guided Enterprise Knowledge Onboarding Experiment

## Objective

Can Ember guide a new enterprise (Sandz) through initial KB Sandbox knowledge organization using the current Workbench, without a KB Sandbox founder explaining the product first?

Two runs: Run 1 (unaided baseline), a fix pass on what Run 1 found, then Run 2 (instrumented dry run, same script, from a restored baseline) to measure whether the fixes actually changed Ember's behavior — not just whether the code changed.

## Proposed Sandz structure

Ember's own structure, as built during Run 2, in her own words (reproduced verbatim — the visualization itself is a finding, see Capability gaps):

```text
Sandz Instance (Single-Client Environment)
│
├── 📂 Sandz-Knowledge Onboarding  [Active Design Headquarters]
│   └── ⚙️ Workstream: Client Knowledge Workspace Onboarding
│
├── 📂 Sandz-HR                    [Sensitivity: RESTRICTED 🔒]
│   └── ⚙️ Workstream: HR Access & Sensitivity Configuration
│        ⚠️ Action Required: Restrict human-access membership in the UI
│
├── 📂 Sandz-Sales                 [Sensitivity: Internal (Default)]
└── 📂 Sandz-Engineering           [Sensitivity: Internal (Default)]
```

Every project name follows the `<Organization>-<Department>` convention from the (newly swapped-in) organization Wiki article, unprompted.

## Method followed

What Ember actually did, not what was expected. Full raw transcripts (`chat_messages` + `tool_calls`, queried directly from Supabase, not reconstructed from the UI) are preserved locally as experiment artifacts, not committed to the repo as operational data:

- Run 1: `ember-onboarding-experiment-run1.md`
- Run 2: `ember-onboarding-experiment-run2.md`

Both runs used the identical opening prompt: *"Ember, I want to onboard Sandz into KB Sandbox and organize our company knowledge. Can you help me set it up?"* — no engineered prompt, no information volunteered ahead of what Ember asked for.

## Navigation journey

Both runs, identical: `/login` → `/dashboard` → Ember panel opened from the dashboard's floating launcher (no page navigation required — the whole exercise happened inside the chat panel, since every action Ember performed used a tool rather than requiring the user to visit a different page). The one page a human still had to be *told* to visit was the project's own `/projects/[id]/access` page, for the human-membership step Ember cannot perform herself.

## Automation level

| Action | Run 1 | Run 2 |
|---|---|---|
| Find matching Workbench Method | A (search_wiki) | A (search_wiki) |
| Check for an existing Sandz project first | **D — no tool existed** | **A (search_projects)** |
| Create the onboarding project | A | A |
| Create departmental projects, correct naming | A, **wrong naming** ("Sandz HR Workspace") | A, **correct naming** (`Sandz-HR`) |
| Classify HR as AI-processing restricted | **D — no tool; claimed "restricted" anyway** | **A (classify_project), and language now matches reality** |
| Restrict HR human membership | C (correctly declined, guided) | C (correctly declined, guided — but guidance still names the wrong page for member *invitation* specifically, see Friction) |
| Explain restriction is two separate axes | Not raised unprompted | **A — raised and explained unprompted** |
| Show the overall structure | Degraded A (plain text list) | Degraded A (nicer text tree, but still memory-based, not data-verified — see Capability gaps) |
| Naming-convention guidance | **D — never surfaced, invented her own pattern** | **A — cited and followed correctly** |

Legend: A = Ember executed it herself; B = guided the user to do it; C = correctly declined and asked for/directed to human judgment; D = could not do it and had no fallback.

## What worked (no changes needed)

- Method-fit reasoning: found the right Workbench Method from a vague request, both runs.
- Judgment quality: correctly declined to fabricate parent-child Project relationships, correctly reasoned that Sales/Engineering didn't need separate Projects until asked, correctly kept the pre-existing Sandz–Zadara pilots untouched once told they existed.
- Honesty about her own limits: in both runs, when she genuinely couldn't perform an action (inviting a member), she said so plainly and explained why, rather than pretending.
- Once given real tools (Run 2), she used them correctly and reported outcomes that matched the actual tool results — no observed case of claiming a tool succeeded when it hadn't, or vice versa.

## Friction

- **(Run 1 only, fixed)** No way to discover existing related work — first tool call for anything project-shaped was always `create_project`, never a search.
- **(Run 1 only, fixed)** Guardrail/prose implied enforcement ("Restricted Project") that had not actually happened.
- **(Both runs)** Minor navigation inaccuracy persists in one specific spot: directing the user to "Access & Evidence" to *invite* a team member. Traced to the source, not guessed: the navigation catalogue entry for that page (which I authored this week) describes granting access to "a group or named member" without stating that the member must already be a Project member, added via the separate Members page, before they're grantable there. Ember followed the documentation faithfully; the documentation itself has the gap.
- **(Both runs)** No project-deletion capability — cleanup for both runs required direct database access outside the application (tracked as dev-request item 4, not yet built).

## Capability gaps, classified

1. **Tool Gap — closed.** Ember had no way to discover existing Projects. Fixed: `search_projects` tool, verified in live use in Run 2.
2. **Governance/Security Gap — closed.** Ember could describe a project as "restricted" without having restricted anything. Fixed: `classify_project` tool + a system-prompt rule against claiming an unperformed action; verified live in Run 2 — she now only claims what she actually did, and explicitly flags the human step still required.
3. **Documentation/Method Gap — closed.** No naming-convention guidance existed for Ember to find. Fixed: the organization/naming Wiki article was authored, swapped in for the stale placeholder article, approved, and re-embedded; verified retrievable and followed unprompted in Run 2.
4. **Documentation/Method Gap — newly found, not yet fixed.** The navigation catalogue's "Manage access and AI-processing sensitivity" entry doesn't distinguish "grant an existing member access to a restricted resource" from "add a new person to the project" — both Ember and, on first read, I myself conflated them. Small, precise fix: state the membership prerequisite explicitly in that catalogue entry.
5. **KBS Capability Gap — not fixed, correctly scoped out for now.** No Project-to-Project relationship of any kind exists in the schema, so there is nothing for a true visualization to render. Ember's workaround (a memory-recalled text tree of her own actions) is a reasonable stand-in for "what did we just do," not a substitute for "show me the real current state" — it isn't re-verified against the database and wouldn't reliably extend to structure Ember didn't personally just create. Deliberately not built this pass, per the read-only organization Explorer already scoped (deterministic, relationship-based, no LLM inference) in `dev-request-role-aware-project-views-and-ember-first-workspace.md`.
6. **KBS Capability Gap — not fixed, standing product gap.** No project-deletion capability anywhere in the app. Tracked as dev-request item 4, not yet built.
7. **Out-of-Scope Expectation — none observed.** Nothing in either run asked KB Sandbox to do something that belongs in a different system.

## Recommended improvements, ranked by onboarding impact

1. Fix the navigation catalogue's Access & Evidence entry to state the membership prerequisite (small, immediate, closes the last recurring friction point).
2. Build project deletion (dev-request item 4) — not onboarding-specific, but every future test/demo/mistake cleanup depends on it.
3. Build the read-only organization Explorer (already scoped) — turns the memory-based text tree into something backed by real, verified relationships.
4. Everything else from the source brief (Product North Star UI, Ember-first home, staff portfolio view) is longer-horizon and correctly out of scope for this pass.

## Conclusion

**YES WITH ASSISTANCE.**

Run 2, unaided by any founder explanation, produced a correctly-named, correctly-classified departmental Project structure for Sandz, with honest reporting of what was and wasn't actually configured, entirely through natural conversation. The one remaining rough edge (the Access & Evidence vs. Members conflation) is a small, precisely diagnosed documentation fix, not a structural product gap — closing it would plausibly move this to an unqualified **YES** for the specific scope tested here (departmental Project setup + sensitivity classification). Real visualization and project lifecycle management (deletion) remain open, scoped, and deliberately deferred rather than papered over.
