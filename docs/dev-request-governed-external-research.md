# Development Request — Governed External Research for the AI Assistant

## Summary

Give the KB Sandbox Assistant an explicit, user-initiated capability to research current information on the public internet, produce source-grounded findings, and optionally save those findings as project evidence or submit sources for curation.

This first release is **read-only research**. It must not perform external transactions or represent the user outside KB Sandbox.

## Product principle

Internet content is candidate evidence, not approved organizational knowledge.

The Assistant must distinguish clearly between:

- approved platform or organizational knowledge;
- approved project knowledge;
- project evidence and artifacts;
- external research gathered during the current task; and
- unsupported model knowledge.

External research does not enter an approved knowledge base without the existing human curation and approval process.

## Current gap

The Assistant currently has tools for approved Wiki search and selected Workbench/project operations. It does not have a web-search or page-retrieval tool. A model may answer from training knowledge, but that is neither current internet research nor verifiable browsing.

## Goals

1. Let an authorized user deliberately ask the Assistant to research the web.
2. Return a concise synthesis with traceable sources.
3. Preserve source and execution provenance.
4. Prevent accidental disclosure of private context in external queries.
5. Treat web pages as untrusted content and defend the agent loop from prompt injection.
6. Let useful findings become governed project evidence or curation candidates.
7. Give administrators practical controls without building a general browser automation platform.

## Non-goals for this release

- booking appointments;
- ordering food or products;
- purchases or payments;
- submitting forms;
- sending email, chat, or social posts;
- logging into third-party sites;
- changing external records;
- downloading or executing arbitrary files;
- autonomous background browsing;
- automatically adding web content to an approved KB;
- a general-purpose computer-use agent.

These are future **action tools**, with materially different consent, identity, approval, confirmation, and liability requirements.

## User experience

### Explicit research mode

Provide a visible **Research the web** action or mode in the Assistant. Ordinary conversation should not silently begin browsing.

Before execution, show enough information for informed use:

- that external services will receive a search query;
- whether project context will be used to formulate it;
- that results are unverified until reviewed;
- any applicable provider or cost notice.

For an ordinary public-information query, one clear user action can authorize the research turn. If the proposed query contains private project content, customer names, personal data, secrets, or confidential excerpts, require a warning and explicit confirmation or redact/generalize the query.

### Research response

Render research results using the Assistant's structured response system:

- quick summary;
- findings;
- citations;
- limitations or conflicting evidence;
- suggested next steps;
- optional **Save as project evidence** and **Submit source for curation** actions.

Each citation should include title, publisher/site, canonical URL, publication date when available, access date/time, and the claim or finding it supports.

Do not place ordinary KB Sandbox navigation links in the citation or artifact collection.

### Research status

Show understandable activity labels such as:

- Searching the web…
- Reviewing selected sources…
- Comparing evidence…
- Preparing cited findings…

Display which research provider and language model produced the result in response details.

## Research workflow

1. User explicitly starts external research.
2. Assistant prepares the minimum necessary search query.
3. Privacy policy checks the query before it leaves KB Sandbox.
4. Search returns candidate results.
5. The system retrieves a bounded number of permitted pages safely.
6. The Assistant compares sources and prepares a cited synthesis.
7. The user may keep the answer only in conversation, save a research artifact to a project, or submit selected sources to the curation queue.
8. Curators follow the normal review process before external material becomes approved knowledge.

## Tool boundaries

Prefer two narrow internal tools rather than an unrestricted browser:

### `search_web`

Accepts a query and bounded result count. Returns normalized metadata such as title, URL, publisher/domain, snippet, and publication date where available.

### `read_web_source`

Retrieves a selected public HTTP(S) page through a controlled server-side service. Returns normalized readable content plus retrieval metadata. Enforce response-size, redirect, timeout, content-type, and domain rules.

The model must not choose arbitrary network methods or access internal infrastructure.

## Security requirements

### Untrusted content and prompt injection

- Treat all retrieved page text as untrusted evidence, never as system or tool instructions.
- Delimit external content from application instructions.
- Ignore page instructions asking the Assistant to reveal prompts, secrets, private context, or call unrelated tools.
- Do not allow retrieved content to expand tool permissions.
- Record detected prompt-injection indicators and warn the user when material is excluded or unreliable.

### Network safety

- Permit only public HTTP(S) destinations.
- Block localhost, private/link-local IP ranges, cloud metadata endpoints, non-web schemes, and DNS rebinding behavior.
- Revalidate every redirect destination.
- Bound page size, redirect count, request duration, and pages per research turn.
- Reject executables and unsupported binary content.
- Do not store or replay third-party cookies or credentials.

### Privacy

- Never include secrets, API keys, credentials, full private documents, personal journals, or unnecessary personal data in a search query.
- Default to generalized queries derived from the user's objective.
- Clearly identify when an external provider processes the query.
- Apply project membership and visibility controls to saved research artifacts.
- Do not expose one user's research history to another user unless it was deliberately saved into shared project evidence with appropriate access.

## Source quality and citations

- Prefer primary and authoritative sources where available.
- For consequential claims, seek corroboration or clearly state that only one suitable source was found.
- Distinguish publication date from access date.
- Preserve the exact URL used and a content fingerprint or bounded snapshot/reference sufficient for later audit, subject to copyright and retention policy.
- Do not fabricate citations or present a search-result snippet as though the full page was reviewed.
- Show disagreement, uncertainty, missing dates, inaccessible pages, and paywall limitations.
- Respect publisher terms, robots controls where applicable, copyright constraints, and configured retention rules.

## Evidence and curation integration

### Save as project evidence

Saving should create a versioned research artifact containing:

- research question;
- concise synthesis;
- findings and limitations;
- selected source records;
- query and access timestamps;
- research provider and model identity;
- initiating user and project/workstream;
- tool trace or durable trace reference;
- status such as `unreviewed`, `reviewed`, or `superseded`.

The artifact is project evidence, not approved KB knowledge.

### Submit source for curation

Allow selected URLs to enter the existing curation queue with provenance back to the research task and user. Curators must inspect, ingest, review, and approve the material through normal controls.

Do not automatically upload every source or create duplicate queue entries for the same logical source without warning.

## Administration

Add a simple external-research configuration area for administrators:

- feature enabled/disabled;
- search/retrieval provider and credential status;
- allowed user/project scopes;
- optional allowed or blocked domains;
- page and result limits;
- per-user/project usage limits;
- retention policy for query and source snapshots;
- audit visibility appropriate to role and project access.

The interface must state that this configuration controls **web research**, not the Assistant's conversational or structured-output model assignment.

## Audit and provenance

Record at minimum:

- requesting user, project/workstream, conversation, and message;
- user authorization event;
- outbound query, including any redaction/generalization;
- provider and tool versions;
- searched and retrieved URLs;
- timestamps and retrieval outcomes;
- model/provider used for synthesis;
- citations returned;
- saved artifact or curation-queue records;
- errors, denials, and security exclusions.

Audit access must follow project and privacy boundaries. Administrators should not gain access to private conversation content merely because they administer provider configuration.

## Failure behavior

- If browsing is disabled or unconfigured, say so and offer internal-KB search instead.
- If a source cannot be retrieved, label it as not reviewed and do not infer its full contents from the snippet.
- If sources conflict, present the disagreement.
- If authoritative/current evidence cannot be found, say that the research was inconclusive.
- Tool failure must not be disguised as a model answer based on current research.
- Reaching research limits should return partial, clearly labeled results rather than loop indefinitely.

## Suggested implementation stages

### Stage 1 — Read-only cited research

- Add administrator configuration.
- Implement safe `search_web` and `read_web_source` services/tools.
- Add explicit research mode, privacy checks, structured citations, activity status, and audit records.
- Keep findings in the conversation only.

### Stage 2 — Governed evidence capture

- Save findings as project/workstream research artifacts.
- Submit selected sources to the curation queue.
- Add duplicate detection, review status, and artifact provenance.

### Stage 3 — Quality and evaluation

- Add source-quality signals and research evaluation cases.
- Test citation correctness, freshness, conflicting evidence, hostile pages, and privacy redaction.
- Add usage reporting and bounded cost controls.

## Acceptance criteria

1. The Assistant cannot browse during an ordinary chat turn unless the user explicitly invokes or authorizes research mode.
2. A research response identifies external findings separately from internal approved knowledge.
3. Every externally grounded claim has a resolvable citation to a source actually retrieved.
4. Search snippets are not represented as fully reviewed pages.
5. Private or secret content is blocked or generalized before forming an external query.
6. Retrieved prompt-injection text cannot reveal instructions, access private context, or cause unrelated tool calls.
7. Private-network and non-HTTP(S) destinations are blocked, including through redirects.
8. Saving research creates a project-scoped, provenance-rich, unreviewed artifact—not an approved KB entry.
9. Submitting a source creates a curation candidate requiring human review.
10. Disabled, unconfigured, exhausted, or failed research returns an honest, useful state.
11. Role, project membership, and RLS tests prevent cross-project research leakage.
12. Provider/model details and the research trace are available to authorized reviewers.

## Required verification

- Unit tests for query privacy checks, URL validation, redirect validation, response bounds, citation normalization, and tool limits.
- Integration tests for the search and retrieval provider adapter using deterministic fixtures.
- Agent-loop tests with hostile page content attempting prompt injection and tool escalation.
- RLS tests for conversations, audit records, saved research artifacts, and curation candidates.
- Structured-response tests proving citations and artifacts render correctly.
- Live test using one current-information question, one conflicting-source question, one inaccessible source, one private-query warning, and one hostile-page fixture.

## Future action-tool boundary

Appointments, food ordering, purchasing, messaging, and similar capabilities should be designed later as a separate **governed action-tool framework**. That framework will need explicit identity delegation, least-privilege credentials, preview and confirmation of consequential actions, approval policies, spend and scope limits, idempotency, receipts, cancellation/compensation behavior, and a complete audit trail.

Do not generalize the read-only research tools into transactional browser automation as part of this request.
