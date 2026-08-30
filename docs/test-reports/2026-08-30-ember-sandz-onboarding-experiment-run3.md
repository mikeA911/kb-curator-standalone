# Sandz Enterprise Knowledge Onboarding — Ember Experiment Report, Run 3

**Date:** 2026-08-30
**Environment:** local dev build (`kb-sandbox-dev`), Supabase project shared with production
**User:** `test-consultant@kbsandbox.local` (ordinary consultant role — not admin/founder, per the experiment's own success criterion, unchanged from Run 1/2)
**Model displayed:** Gemini 3.5 Flash (default)
**Prior reports:** `2026-08-30-ember-sandz-onboarding-experiment.md` (Run 1, Run 2)

## Objective

Run 1/Run 2 tested whether Ember could guide Sandz's onboarding unaided. That report's own "Recommended improvements" list named three things as the path to closing its remaining gaps: fix the Access & Evidence catalogue entry (done, before this session), build the read-only organization Explorer (done, this session's Stage 1), and — flagged as "longer-horizon, correctly out of scope for this pass" at the time — the Ember-first home and staff portfolio view (also done, this session's Stage 1-4, which additionally shipped `list_project_members`/`send_project_note`, neither of which existed or was anticipated as in-scope when Run 1/2 were written).

This run re-executes the identical opening prompt and follows the same natural trajectory as Run 1/Run 2, to check whether the shipped work actually changed Ember's behavior — not just whether the code changed — and additionally exercises the new member-awareness capabilities inside the same onboarding scenario, since they are now real and directly relevant to it.

## Method followed

Same identical opening prompt as Run 1/Run 2, verbatim: *"Ember, I want to onboard Sandz into KB Sandbox and organize our company knowledge. Can you help me set it up?"* — no engineered prompt, no information volunteered ahead of what Ember asked for.

Full raw transcript (`chat_messages` + `tool_calls`, queried directly from Supabase, not reconstructed from the UI) preserved as the source of truth for every claim below.

**Procedural note, for transparency:** the first attempt to send the opening prompt was appended to a stale auto-resumed conversation by a browser-automation mistake (unrelated to the product itself — a stray click landed the message in an old, unrelated project-bound conversation from 2026-08-24), which caused Ember to correctly create a real onboarding project in response, just in the wrong conversation context. That project, its workstream, and the stray messages were deleted and the affected conversation restored to its exact prior state before restarting cleanly in a genuinely new, general (unbound) conversation — verified via a direct database check before proceeding, not merely assumed. Everything reported below is from that clean, single, continuous conversation.

## Navigation journey

**Changed from Run 1/Run 2:** `/login` → `/dashboard` now lands directly on the Ember-first home for this `consultant`-role account — a Project selector, a persistent "Using: General platform guidance" scope chip, and a dominant **Ask Ember** button, replacing the staff stat-card dashboard Run 1/2 used. Opening Ember still required zero page navigation beyond `/dashboard` itself (one click on **Ask Ember**, same as Run 1/2's floating launcher). The one page a human still had to be *told* to visit remained a project's own Members page — but see Automation level below for what changed about *which* page Ember named.

## Automation level

| Action | Run 1 | Run 2 | **Run 3** |
|---|---|---|---|
| Find matching Workbench Method | A (search_wiki) | A (search_wiki) | **A (search_wiki)** |
| Check for an existing Sandz project first | D — no tool existed | A (search_projects) | **A (search_projects) — real empty-result check, verified in the tool trace** |
| Create the onboarding project | A | A | **A** |
| Create departmental projects, correct naming | A, wrong naming | A, correct naming (`Sandz-HR`) | **A, correct naming (`Sandz-HR`, `Sandz-Sales`, `Sandz-Engineering`)** |
| Classify HR as AI-processing restricted | D — no tool; claimed "restricted" anyway | A (classify_project) | **A (classify_project → confidential), applied within the same turn the department projects were created, not a separate follow-up** |
| Explain restriction is two separate axes | Not raised unprompted | A — raised and explained unprompted | **A — raised and explained unprompted, same as Run 2** |
| **Guide the user to invite a member** | C (correctly declined, guided) | C (correctly declined, guided — but named the wrong page for *invitation* specifically) | **C — correctly declined, and this time named the correct page and sequence: Members first, Access & Evidence second, unprompted** |
| Show the overall structure | Degraded A (plain text list, memory-based) | Degraded A (nicer text tree, still memory-based, not data-verified) | **A — re-queried `search_projects` + `list_project_notes` live and built the answer from that result, not from conversation memory (confirmed in the tool trace, not just Ember's own claim)** |
| Naming-convention guidance | D — never surfaced, invented her own pattern | A — cited and followed correctly | **A — followed correctly again** |
| **Report who is actively on a departmental project (new capability)** | *(tool didn't exist)* | *(tool didn't exist)* | **A (list_project_members) — asked inside the bound `Sandz-Engineering` conversation after a real member (`test-curator`) was added via the UI; Ember reported both members correctly with roles** |

Legend unchanged: A = Ember executed it herself; B = guided the user to do it; C = correctly declined and asked for/directed to human judgment; D = could not do it and had no fallback.

## What's newly fixed since Run 1/Run 2

- **The last recurring friction point (Access & Evidence vs. Members conflation) is gone.** Both Run 1 and Run 2 sent the user to "Access & Evidence" to *invite* a team member — a documentation gap in the navigation catalogue, not a model failure. This run, unprompted and on the first attempt, Ember correctly said: *"Go to the new Sandz-HR project space. Add your HR team members via the Members page first. Navigate to the Access & Evidence page... (Note: You must add members there first...)"* — and named the exact correct URL for that specific project's Members page, not a generic pointer.
- **"Show me the structure" is no longer purely memory-based.** Run 1/Run 2's gap analysis (item 5) explicitly said Ember's structure answer "isn't re-verified against the database and wouldn't reliably extend to structure Ember didn't personally just create." This run, the tool trace shows Ember called `search_projects` and `list_project_notes` in response to that exact question, before answering — the structure she described was read back from the database, not recalled. This is a genuine behavioral change, not something a human-only Explorer page could have caused by itself (Ember has no tool wrapping the Explorer UI) — it happened because `search_projects` already existed as a general tool and Ember chose to use it for verification, which the original gap analysis didn't anticipate as the fix.
- **Member awareness now works inside the exact onboarding scenario it was built for.** After adding a real second member to the `Sandz-Engineering` project through the ordinary Members UI, asking the project-bound Ember conversation "Who is currently working on this project?" correctly returned both members with their roles (`list_project_members`, verified via the tool trace, not just the reply text).
- **The staff portfolio correctly reflects everything created.** Logging in as `test-admin` (not a member of any Sandz project) and opening `/projects/portfolio` showed all four new Sandz projects with correct member counts and, correctly, "Membership required" rather than a link into any of them.

## New finding (not a regression): Confidential classification blocks the default model

Asking the project-bound Ember conversation on `Sandz-HR` (the project Ember herself classified `confidential` two turns earlier) "Who is currently on this project?" was correctly refused: *"This project contains Confidential information and cannot be processed by this model under your organization's AI policy. Please select a model approved for Confidential content."* Checking `ai_provider_sensitivity_eligibility` directly shows the table is empty in this dev environment — no AI provider has been explicitly approved for Confidential content, so `assertProviderEligible`'s documented fail-closed default (`no row = 'internal' only`) correctly blocks every model uniformly, not just the default one. This is the Information Sensitivity Classification system (built in an earlier session, unrelated to this dev request) working exactly as designed, and it correctly fires even against Ember's *own* classification of a project she created two turns earlier in the same conversation flow — a genuine end-to-end consistency check that happened to get exercised for the first time by this run. It surfaces a real, separate platform-configuration gap (no provider is configured as Confidential-eligible anywhere in this dev environment) that is out of scope for the role-aware-views dev request and not something this run's fixes were meant to address; noted here only because it was the reason `list_project_members` had to be demonstrated on `Sandz-Engineering` instead of `Sandz-HR`.

## Capability gaps, re-classified

Reusing Run 1/Run 2's numbering:

1–3. Unchanged — still closed, reconfirmed working in this run (search_projects, classify_project, naming-convention Wiki article).
4. Unchanged — still closed (Access & Evidence membership-prerequisite wording), and this run is the first live confirmation Ember actually benefits from the fix, having repeated the same mistake in both prior runs.
5. **Now closed for the tested scenario.** "Show me the structure" is now backed by a real `search_projects` call rather than pure memory recall. The dedicated, deterministic Organization Explorer (page-level, human-facing) also shipped this session and was not separately exercised by Ember in this run (she has no tool for it — see above), but a human onboarding Sandz can now open any of the four new projects and see the real, relationship-verified Explorer view directly.
6. **Still open, unchanged.** No project-deletion capability exists anywhere in the app; cleanup for this run again required direct database access outside the application.
7. Out-of-Scope Expectation — none observed, same as Run 1/Run 2.

## Conclusion

**YES, with meaningfully less assistance than Run 2.**

This run produced the same correctly-named, correctly-classified departmental Sandz structure as Run 2, with honest reporting throughout, but closed the one specific rough edge Run 2 left open (Members vs. Access & Evidence) and additionally demonstrated — for the first time — that Ember's own account of "what did we just build" is now checked against real data rather than recalled from the conversation, and that she can now answer real "who's on this project" questions inside the same onboarding flow. The scope Run 1/Run 2 explicitly deferred as longer-horizon (Ember-first home, staff portfolio, member awareness) is now built, shipped, and — for the pieces that intersect with onboarding — verified live in this exact scenario. Project lifecycle management (deletion) remains the one standing product gap from the original report, unaffected by this session's work and still deliberately out of scope.
