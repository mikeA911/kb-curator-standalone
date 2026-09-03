# OR-030 Curator-led Project Onboarding — Live Regression

**Date:** 2026-09-03  
**Environment:** `https://kbsandbox.tech`  
**Project:** Sandz Pilot Feedback and Q&A (`17a9c27c-a271-43ce-9882-a62c62b02d8c`)  
**Owner:** `mikecolligodata@gmail.com`  
**Member persona:** `test-user-for-builder@kbsandbox.local` (platform `consultant`, Project `viewer`)

## Outcome

The main OR-030 governance path works: an existing user can be added to a Project, the member can submit a source, Ember cannot retrieve its test fact before approval, the owner can approve it, and Ember can retrieve the fact afterward. Three defects and two UX/content issues remain.

## Passed

1. **Existing-user membership:** Owner added `test-user-for-builder@kbsandbox.local` as Project `viewer`; the membership persisted and appeared in both owner and member views.
2. **Everyday member view:** The member could access only the role-appropriate Project view. Owner-only membership controls were absent.
3. **Starter prompt:** The Project displayed: “Ask anything about the Sandz pilot, suggest an improvement, or report a problem.”
4. **Curator-only Members route:** Direct navigation by the viewer to `/members` redirected safely to the Project page.
5. **Member source submission:** The member uploaded `or030-member-source-test.txt` into `Zadara / Sandz` and received “Submitted -- this project's curator or owner will review it.”
6. **Pending review:** The owner saw `Pending sources (1)`, the submitter identity, and working Approve/Reject controls.
7. **Pre-approval retrieval boundary:** The unapproved source contained the synthetic fact “every Thursday at 3:15 PM.” Ember searched approved Project evidence and correctly said the checkpoint schedule was unavailable.
8. **Approval and processing:** Owner approval removed the pending item after processing.
9. **Post-approval retrieval:** Repeating the question returned “every Thursday at 3:15 PM,” demonstrating that approved content became retrievable.
10. **Ember onboarding guidance:** Ember accurately directed an ordinary member to Project → Knowledge → Submit a source, explained File versus Workstream artifact, and stated that pending content is not usable as evidence until human approval and processing.
11. **Durable conversation history:** The member's earlier conversation and response survived sign-out/sign-in and reopened correctly.

## Defects

### 1. Brand-new account creation fails in the membership UI

Attempted to add the new address `codex-or030-member-20260903@kbsandbox.local` as Project `viewer`. The page displayed:

> Minified React error #441

After reloading, neither the new account nor Project membership existed. Adding an already-existing user through the same form worked.

**Severity:** High for client onboarding; the advertised curator-created-account path is unusable live.

### 2. Unauthorized workstream creation shows a React error instead of the promised explanation

The Project viewer directly opened `/workstreams/new`, entered `OR-030 unauthorized creation test`, and submitted. No workstream was created, but the UI displayed:

> Minified React error #441

The intended clear role/authorization message did not render.

**Severity:** Medium. Authorization appears enforced, but the user experience contradicts OR-030's error-handling goal.

### 3. Ember did not visibly cite the approved source

The post-approval prompt explicitly asked Ember to cite the source. Ember returned the correct fact, and Details showed `search_project_knowledge`, but the answer contained no visible citation or link to `or030-member-source-test.txt`.

**Severity:** Medium for evidence-led use; retrieval worked, but provenance was not presented to the user.

## Items requiring investigation

### Unexpected `Sandz General` attachment

Before approval, the Project showed only `Zadara / Sandz`. After the source approval sequence, the member view showed both `Sandz General` and `Zadara / Sandz`, and Ember reported both in its knowledge scope. The tester did not intentionally click Attach. Confirm whether another concurrent change attached it; otherwise investigate form/action cross-wiring or stale UI state around the approval operation.

### Role terminology

The everyday persona appears as platform `consultant` and Project `viewer`. This works technically but may confuse users expecting the product's everyday-user role to be called `member`. Consider aligning the displayed terms or explaining their different scopes.

### Approval timing wording

Ember says a source becomes usable “the moment” a curator clicks Approve and later says chunks become “instantly available.” Live approval and processing took approximately 10–20 seconds. Prefer “after approval and processing complete.”

## Test artifacts left live

- Project membership: `test-user-for-builder@kbsandbox.local` as `viewer`.
- Approved synthetic source: `or030-member-source-test.txt`, source id `dfcaa150-6062-40fc-8fc8-ec2aba50dafb`.
- Two member conversations: the pre/post-approval retrieval test and the onboarding-guidance test.

These are intentionally retained for developer diagnosis and can be removed after the fixes are verified.
