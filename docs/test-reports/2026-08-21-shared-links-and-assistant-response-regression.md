# Regression Test Report: Shared Links and Assistant Response View

**Date:** 21 August 2026  
**Environment:** Local development server (`192.168.8.102:3000`)  
**User:** Admin account  
**Assistant model:** Groq / GPT-OSS 120B

## Summary

The new dashboard Shared Links experience passed the focused UI and automated checks performed in this pass. The Assistant completed the OpenAPI Discovery reasoning turn and preserved it across reload, but the response-view bugs are not fixed in the running application: Markdown remains literal text, the model still emits an invented example-domain Handbook URL, and no trusted clickable navigation action is rendered. A delayed history load also temporarily replaced a newly completed response with an older conversation.

## Shared Links results

### Passed in the live UI

- The dashboard displays **Shared links** for the signed-in user.
- The card explains that entries are user recommendations rather than approved knowledge.
- **View all shared links** opens Trending.
- **+ Add a link** exposes URL, title, explanation, publisher, and tags fields.
- Empty submission is rejected client-side with a clear required-fields message.
- An active shared link displays title, external indicator, domain, contributor, date, explanation, and administrator-only **Remove** control.
- The external link uses `target="_blank"` and `rel="noopener noreferrer"`.
- Archived content is excluded from the dashboard card.
- The full Trending collection continues to display status and detail links.

No live link was added or removed during this pass because those actions change content visible to other users.

### Automated verification

Targeted suites passed:

- Trending RLS;
- URL safety and normalization;
- Trending queries;
- Trending Server Actions;
- Assistant loop;
- conversation conversion/history;
- chat Server Actions.

**Result:** 7 test files passed; 79 tests passed; 0 failed.

## Assistant response-view results

### Reasoning and reliability — pass

Prompt:

> I have legacy source code but no API specification. Which Workbench method should I use? Give me a quick summary, required inputs, next steps, and lead me to the relevant Handbook page.

The Assistant:

- completed in approximately ten seconds;
- selected **OpenAPI Discovery**;
- returned a relevant quick summary;
- identified repository, scope, and branch/commit requirements;
- described deliverables and next steps;
- recorded Groq / GPT-OSS 120B provenance and `search_wiki` tool use;
- persisted the turn and restored it after reload.

### Response rendering — fail

The response still displays raw syntax including:

- `**bold**` markers;
- Markdown table pipes and separator rows;
- list markers embedded in a long plain-text block;
- headings that are not visually rendered.

Expected behavior is a safe rendered subset or the proposed structured response view.

### Trusted navigation — fail

The response produced this model-authored destination:

`https://kb‑sandbox.example.com/wiki/openapi-discovery-workbench-method`

The hostname is not the running application's canonical host and contains a nonstandard hyphen character. It is shown as plain text rather than a validated in-app action.

Expected behavior is for trusted application code to resolve the authorized Wiki article identifier to a canonical relative route and render a real action such as **Read OpenAPI Discovery method**.

### Conversation-state race — fail, recoverable

The user opened the Assistant and began a new conversation before the asynchronous history load had completed. The new OpenAPI response appeared normally. When history loading later completed, it replaced the visible new conversation with an older Legacy System Understanding conversation without user action.

After reloading the page, the new OpenAPI conversation was correctly restored, confirming that it had persisted. The defect is therefore a client-state overwrite rather than data loss.

Expected behavior:

- once the user selects **New conversation** or sends a message, delayed auto-resume must not overwrite that active state;
- cancel or ignore the pending history-resume result when the user has interacted;
- keep the History list update separate from active-conversation selection.

## Remaining fixes recommended before the next UI pass

1. Render Assistant prose safely rather than displaying Markdown source.
2. Replace model-authored URLs with typed, authorized navigation targets.
3. Cancel or ignore delayed auto-resume when the user starts or selects a conversation.
4. Add a UI regression test covering “send before history load completes.”
5. Add a response-view test proving that a retrieved Handbook article becomes a canonical clickable action and that invented hosts are discarded.
