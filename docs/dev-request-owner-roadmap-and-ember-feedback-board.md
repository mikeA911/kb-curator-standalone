# Development Request — Owner Roadmap and Ember Feedback Board

**Status:** Proposed  
**Priority:** P1 — complete before Journal enhancements  
**Related roadmap item:** OR-014  
**Public roadmap alignment:** M3 Evaluate, M5 Apply, M7 Govern, M8 Communicate

## Objective

Create one private operational board for bugs, improvement suggestions, feature requests and owner roadmap decisions. Pilot users submit feedback conversationally through Ember; authorized owners triage it. The existing owner-confidential Markdown roadmap remains a strategic reference and is not edited directly by the running application.

## Authorized owner access

Initially authorize only:

- `mike.aguilar@gmail.com`
- `mikecolligodata@gmail.com`

Enforce access from verified authenticated identity in application authorization and database policies. Do not rely only on hidden navigation, email text in the UI, or the existing platform `admin`/`curator` roles. Design the owner allowlist so it can later move to a governed owner role or membership table without rewriting board records.

Ordinary authenticated users may create feedback and view the status of their own submissions. They must not see the private owner roadmap, commercial notes, internal priority, other reporters, other users' submissions or private triage discussion.

## Ember user experience

Add a consistently visible **Feedback** action inside Ember's chat modal with three choices:

1. **Report a problem** — Ember asks “What went wrong?”
2. **Suggest an improvement** — Ember asks “What could work better?”
3. **Request a new feature** — Ember asks “What would you like KB Sandbox to do?”

Ember should:

- reuse relevant facts already provided in the active conversation;
- ask at most one essential follow-up question in the normal path;
- draft a title, short description, expected/actual result where applicable, impact and optional reproduction steps;
- offer a screenshot of the relevant KB Sandbox view and optional file attachment;
- show attachment previews and allow removal or replacement;
- present a compact editable preview card; and
- submit only after the user selects **Send**.

A typical submission should take: **Feedback → choose type → describe it → review → Send**.

After submission, Ember shows the report ID, initial status and a link to the user's report.

## Privacy and artifact rules

Automatically capture only the minimum useful metadata: authenticated reporter, time, current KB Sandbox path, authorized project/conversation reference, application version, environment and correlation/request ID when available.

Never silently capture or attach passwords, API keys, browser storage, full conversations, full prompts, journals, customer documents, retrieved evidence text or unrelated screen content. A screenshot must be previewed and explicitly confirmed. Warn users to check screenshots for personal, commercial, pricing, customer or credential information.

Suspected security or privacy incidents require a confidential classification and restricted notification path rather than ordinary board visibility.

## Unified board

Support record types:

- Bug
- Improvement
- Feature request
- Usability feedback
- Documentation issue

Minimum workflow:

`New → Triaged → Accepted / Deferred / Declined → In progress → Ready to verify → Resolved`

Keep severity separate from roadmap priority. Owners may reclassify submissions, merge duplicates into a canonical item, link related reports and record:

- owner decision and rationale;
- public milestone relationship;
- pilot position;
- assignee;
- affected/fixed/deployed versions;
- implementation and test evidence;
- reporter verification; and
- deferral review trigger.

Only items affecting scope, architecture, commercial commitments or roadmap priority need an owner-roadmap identifier such as `OR-015`. Routine defects can remain operational board items.

## Guardrails

- Ember assists intake; it cannot accept/decline requests, promise dates, set final severity/priority or close defects.
- Platform admin status alone does not grant owner-board access.
- Project association does not automatically expose restricted project evidence to board triagers.
- Do not let the application write to `docs/commercial/ROADMAP.md` or the Git repository.
- Preserve an auditable history of classification, status and owner-decision changes.
- Avoid building a general project-management suite in this stage.

## Pilot reporting

Provide owner-only summaries for:

- submissions by type and workflow;
- affected users and duplicate signals;
- time to triage and resolution;
- reopen rate;
- reporter-confirmed fixes;
- recurring issues by pilot workflow; and
- unresolved P0/P1 items.

Do not rank individual employees or use feedback volume as a productivity score.

## Acceptance criteria

1. Each of the three Ember feedback choices can create a correctly typed record through the short conversational flow.
2. The user previews the generated report and attachments before submission.
3. No report is created when the user cancels before **Send**.
4. The reporter can view only their own submissions and user-visible statuses.
5. The two authorized owner identities can access and triage the unified board.
6. A different platform admin/curator cannot access the owner board or owner-only fields.
7. Screenshot/attachment access follows the report authorization boundary and uses non-public storage.
8. Sensitive conversational/project content is not silently copied into reports.
9. Duplicate linking retains each reporter and impact signal.
10. Security/privacy classifications receive appropriately restricted handling.
11. Status and decision changes are auditable.
12. Automated authorization tests and live verification cover owner, reporter, unrelated user and non-owner admin/curator cases.

## Delivery sequence

1. Data model, storage boundary and authorization tests.
2. Owner board and reporter's own-submissions view.
3. Ember feedback mode and structured drafting.
4. Screenshot/attachment review.
5. Triage workflow, duplicate linking and pilot summaries.
6. End-to-end isolation, privacy and usability verification.

Journal calendar and Ember weekly-continuity enhancements should begin after this request is implemented and verified, unless a P0 pilot or security issue intervenes.
