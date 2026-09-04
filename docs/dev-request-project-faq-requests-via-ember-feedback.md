# Project FAQ Requests Through Ember Feedback

## Context

KB Sandbox already lets a signed-in user open Ember's Feedback flow to report a problem, suggest an
improvement, or request a new feature. Project users also need a low-friction way to say, “This
question should have an approved answer for everyone on this Project.”

This should extend the existing feedback intake and owner board. It must not introduce a separate
FAQ system or allow an ordinary user or AI response to become approved knowledge automatically.

## Goal

Add **Request an FAQ** as a fourth user-facing choice in Ember's Feedback menu. Ember gathers the
question, why it recurs or matters, the intended audience, and any known evidence. It then files a
Project-scoped request for human triage.

## Required behaviour

### User flow

1. A signed-in user opens Ember from the relevant Project page.
2. The user selects **Feedback -> Request an FAQ**.
3. Ember asks only for missing information, aiming to capture:
   - the proposed question;
   - why or how often it arises;
   - who needs the answer;
   - any source, page, conversation, or artifact that may support the answer.
4. Ember summarizes the request and files it through the existing feedback-report mechanism.
5. The user receives the report number and can see it under **My feedback**.

### Classification and storage

- Add an explicit internal feedback type such as `faq_request`; do not disguise it as a generic
  feature request or documentation bug.
- Preserve `project_id`, reporter, originating page, conversation, timestamps, and any safe attached
  artifacts already supported by feedback reports.
- A Project-bound FAQ request must remain associated with that Project.
- A general/platform FAQ request may have no Project, but Ember should encourage the user to start
  from the relevant Project when the question concerns customer or departmental knowledge.

### Human governance

- Filing the request does **not** create or modify a Wiki article and does not make the proposed
  answer retrievable by Ember.
- The owner board may triage the request using the existing status lifecycle.
- A Project owner or curator should be the knowledge decision-maker for Project FAQ requests. The
  platform owner may route and monitor the request but must not gain access to restricted source
  content merely because a report exists.
- Before publication, a curator must identify approved supporting evidence, draft or update the
  appropriate Wiki/Project guidance, apply the correct visibility, and use the existing human
  approval process.
- If no approved answer exists, the request may remain open as a documented knowledge gap.

## Ember guardrails

Ember must clearly distinguish among:

- **request received** -- the question has been logged;
- **answer under review** -- a curator is resolving it against evidence;
- **approved FAQ/guidance** -- human-approved knowledge is available;
- **knowledge gap** -- no approved answer currently exists.

Ember must never claim that submitting an FAQ Request publishes an answer, approves the user's
suggestion, or makes conversational content organizational truth.

## Owner and curator experience

- Show **FAQ request** as a filter and label on the existing feedback board.
- Display its Project and reporter using the same privacy rules as other reports.
- Provide a clear route back to the Project and, after an approved article is created, allow the
  triager to record the resulting Wiki/article link in the resolution notes.
- A later enhancement may offer “Draft FAQ from request,” but Phase 1 should remain intake and
  triage only.

## Acceptance criteria

1. Ember's Feedback menu contains **Request an FAQ** alongside the three existing user choices.
2. A member can file a Project-scoped FAQ request conversationally and receives one report number.
3. The report is visible to its reporter and on the authorized owner board with the correct type
   and Project.
4. The request itself creates no Wiki article, source, embedding, or retrievable answer.
5. A user without access to the Project cannot gain Project/source information through the report.
6. Ember accurately explains that a curator must resolve and approve the answer before it becomes
   trusted knowledge.
7. Existing bug, improvement, and feature-request flows remain unchanged.

## Documentation updates

- Add the new choice to Ember's capability and navigation catalogue.
- Keep the canonical **FAQ Request** definition in `docs/workbench-handbook-kb-sandbox-vocabulary.md`.
- Add the delivered capability to the owner roadmap/change register when implementation is
  scheduled.

## Out of scope

- Automatic FAQ generation or publication.
- A separate FAQ database or public FAQ portal.
- Voting, popularity ranking, duplicate clustering, or analytics.
- Allowing platform administrators to bypass Project or source permissions.
