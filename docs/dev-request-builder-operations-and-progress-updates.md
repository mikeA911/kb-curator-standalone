# Builder Operations and Consent Based Progress Updates

## Status

Proposed follow-up request. The core Builder product request is complete; this adds operator support visibility without changing the private Builder workspace model.

## Decision

Each Builder has one private Project. Their LLM Wiki is their private lightweight CRM: prospect context, customer notes, proposal thinking, architecture work and next actions.

The Builder operator needs a limited operational view to support builders and evaluate the programme. It must not read private notebooks, Ember conversations, drafts, repositories, credentials or unsubmitted artifacts.

> The LLM Wiki is the Builder's private CRM memory. Builder Operations is the agency's consent-based progress and support dashboard.

## Objective

Give the operator a small Builder Operations view that answers:

- Who is active, paused or nearing their credit limit?
- Who is learning, discovering, specifying, building, validating or converting a customer?
- Who has submitted milestone evidence?
- Who has asked for a mentor or is blocked?
- How is the Builder Programme performing in aggregate?

This is not a CRM, sales forecast, surveillance console or shared pipeline.

## Builder Operations view

Operator administrators may see only:

- builder identity and account state;
- credits used and remaining;
- most recent activity date;
- active workstream count;
- current highest workstream stage;
- next milestone;
- milestone evidence status;
- Builder-approved progress update;
- help-request or blocked indicator; and
- aggregate programme measures.

They may not open or query:

- Builder Notebook content;
- private Ember conversations;
- private artifacts and drafts;
- unsubmitted architecture documents;
- repository content, credentials or logs; or
- a customer name or detail that the Builder has not chosen to share.

## Share Builder Update

Add a compact **Share Builder Update** action in a Builder workstream and through Ember.

Ember may draft an update from the selected workstream, but the Builder reviews and explicitly submits it. Suggested structure:

```text
Current stage: Specifying
Opportunity label: Regional bank document-search assistant
Progress: Architecture and source review completed
Next step: Validate access-control model with customer
Help requested: Need a mentor familiar with OnBase
Confidence: On track
```

Rules:

- A Builder may use a customer alias, a general capability label or no customer label.
- An update is never sent automatically from a private conversation or LLM Wiki.
- A Builder may replace or withdraw their update until it becomes milestone evidence or a separately approved customer handoff.
- Ember may issue a dismissible reminder after a meaningful stage change or explicit help request.
- Initial delivery excludes scheduled weekly reporting, email, SMS, chat messaging, manager hierarchies and direct operator edits.

## Security invariants

1. Builder Operations access is metadata-only and enforced server-side.
2. A platform/operator administrator receives no default read access to private Builder content.
3. The Operations view cannot infer private content from activity metadata, direct links, search, IDs or error messages.
4. All shared updates are explicit Builder actions and are auditable.
5. Aggregated measures contain no private prompt, source, notebook or customer content.

## Scope

### In scope

- Builder Operations list and filters for account state, stage, help requested, milestone status and allowance state.
- Builder-approved progress updates.
- Ember drafting assistance and explicit submission confirmation.
- Aggregate counts and allowance/milestone measures.
- Strict RLS and action-level tests.

### Out of scope

- CRM records, contact databases and sales forecasts.
- Automatic mining of private LLM Wiki or conversation content.
- Mandatory or scheduled status reporting.
- Operator editing of Builder updates.
- Email, SMS or chat notifications.
- Team Builder projects.
- Support-access exceptions to private content.

## Acceptance criteria

1. An operator sees account state, activity date, allowance, active-workstream count, milestone state and explicitly shared updates for every Builder account.
2. A Builder can have Ember draft an update, edit it, use a non-sensitive opportunity label, submit it and replace or withdraw it in an allowed state.
3. Nothing is submitted from a Builder LLM Wiki or private conversation without an explicit Builder action.
4. The operator can filter for Builders needing help or approaching an allowance threshold.
5. The operator cannot open, query, enumerate or infer private notebooks, conversations, artifacts, repositories or credentials through UI, direct URL, API or guessed identifiers.
6. Aggregate programme metrics disclose no private Builder content.
7. Existing Builder privacy and Enterprise authorization tests remain green.
8. Ember's navigation and capability catalogue describes the update flow and its privacy boundary.

## Required live validation

Create two Builder accounts, each with private notebook content, a workstream and a conversation. Have each submit a different approved progress update. Confirm the operator can see activity and support needs, but cannot access or infer either Builder's private content through the UI, direct routes, APIs, search or error responses.
