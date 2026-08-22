# Development Request: Fix Assistant Completion State, Trusted Navigation, and Artifacts

**Status:** Proposed  
**Created:** 21 August 2026  
**Area:** Workbench Assistant  
**Priority:** High — core Assistant interaction is partially blocked

## Summary

Fix four connected regressions in the Workbench Assistant:

1. A completed response can remain displayed as **Thinking…**, leaving the model selector and message input disabled until another UI action forces the conversation to refresh.
2. Method guidance still produces model-authored placeholder URLs instead of validated KB Sandbox navigation actions.
3. A response can claim that an artifact was attached while no usable artifact is persisted or exposed through an **Artifacts** control.
4. Conversation-history selection can stop updating the displayed conversation after the completion-state failure.

The fix must make the server-side completion result authoritative, guarantee that the client leaves its sending state, and distinguish trusted internal navigation from durable conversation artifacts.

## Live reproduction

Environment:

- Local application: `http://192.168.8.102:3000`
- Signed-in role: admin
- Conversational model: Groq / GPT-OSS 120B
- Test date: 21 August 2026

Prompt:

> I need to understand an undocumented legacy application before planning a refactor. Recommend the best Workbench method, give me a quick summary and next steps, and provide a trusted in-app link to the relevant Handbook page. Put any citations or documents in Artifacts.

Observed result:

- The Assistant correctly selected **Legacy System Understanding**.
- The response contained a well-rendered requirements table and useful next steps.
- The panel remained on **Thinking…** for more than one minute.
- The model selector and message input remained disabled.
- Opening History caused the completed response to appear, indicating that generation or persistence had finished but the active conversation had not refreshed correctly.
- The Handbook link was `https://kb-sandbox.example.com/handbook/platform_handbook/legacy-system-understanding-workbench-method`.
- Clicking the link produced no navigation.
- The response claimed a `Design Note` artifact with an artifact ID, but no **Artifacts** button or panel appeared.
- Selecting an earlier conversation from History did not replace the displayed conversation after the stuck completion.

An older OpenAPI Discovery response also contained an invalid placeholder URL:

`https://kb‑sandbox.example.com/wiki/openapi-discovery-workbench-method`

That address additionally contains a non-standard hyphen in the hostname.

## User impact

- Users cannot tell whether a request is still running or has completed.
- The Assistant can leave its controls disabled indefinitely.
- Method guidance appears actionable but does not lead to the requested page.
- Artifact claims cannot be verified.
- A navigation link may be incorrectly represented as a durable artifact.
- Conversation history becomes unreliable precisely when it is needed to recover from a stuck response.
- Placeholder hostnames weaken trust and may create unsafe external-navigation behaviour.

## Required change

### 1. Make completion state reliable

The client must leave its sending state for every terminal server outcome:

- successful response;
- structured response with optional fields absent;
- generation failure;
- tool-loop or iteration-limit failure;
- provider timeout;
- network or Server Action failure;
- persistence failure;
- cancellation, if cancellation is supported.

Use a `finally`-equivalent cleanup path so the model selector, message input, Send control, New conversation action, and History remain usable after any terminal result.

On successful completion:

1. Treat the persisted Assistant message or explicit action result as authoritative.
2. Insert or replace the optimistic activity item with that completed message.
3. Clear the activity poll and all sending flags.
4. Reconcile the active conversation from the server if the local state cannot confidently apply the result.

Do not require the user to open History, close the panel, or reload the page to reveal a completed response.

Add a bounded client-side timeout or stale-run recovery state. A timeout must not invent a failure if the server may still be working; it should tell the user that the operation is taking longer than expected and provide a safe refresh/recovery action.

### 2. Stop accepting model-authored internal URLs

The model must not construct KB Sandbox hostnames or internal application URLs.

Internal navigation must use structured data with a validated route identifier, for example:

```json
{
  "type": "internal_navigation",
  "label": "Legacy System Understanding",
  "route": "wiki_article",
  "target": {
    "slug": "legacy-system-understanding-workbench-method"
  }
}
```

The server or client must resolve the identifier into the canonical application route:

`/wiki/legacy-system-understanding-workbench-method`

Validation requirements:

- Accept only supported route types.
- Validate identifiers or slugs against records the current user may access.
- Resolve paths in application code, not in the model prompt.
- Reject absolute URLs that claim to be KB Sandbox internal navigation.
- Reject placeholder hosts, including `kb-sandbox.example.com` and variants containing Unicode hyphens.
- Render external citations separately with an external-link treatment.
- Preserve normal authorization checks at the destination route.

If a requested internal target cannot be resolved, render non-clickable explanatory text rather than a fabricated URL.

### 3. Separate navigation, citations, and artifacts

Use distinct response concepts:

- **Internal navigation:** a validated action leading to an existing application page.
- **Citation:** a source supporting a claim.
- **Artifact:** a durable document or record created, selected, or explicitly attached to the conversation.

A Handbook navigation destination is not automatically a conversation artifact.

Do not allow the Assistant to claim `Artifacts attached` based only on model-generated text or an invented identifier. Artifact presentation must be derived from persisted records returned by the application.

### 4. Make the Artifacts control truthful

Show the **Artifacts** button only when the conversation has one or more authorized persisted artifacts, unless the approved design intentionally uses a disabled empty-state control.

When artifacts exist, the button or badge should show the current count and open a panel containing, as applicable:

- title;
- artifact type;
- created/attached status;
- source conversation or workstream;
- created time;
- provider/model provenance where AI generated it;
- validated destination or download action;
- access status.

The panel must query or receive artifact records scoped to the signed-in user and active conversation. Never trust artifact IDs supplied solely in model text.

If structured output proposes an artifact but persistence fails:

- do not display it as attached;
- preserve the conversational answer where possible;
- show a concise failure notice;
- log the persistence failure for diagnosis.

### 5. Restore reliable History switching

Selecting a conversation in History must:

1. Cancel or detach obsolete activity polling for the previous conversation.
2. Clear stale local sending flags that do not belong to the selected conversation.
3. Load the selected conversation and its messages from the server.
4. Load or clear its artifact collection.
5. Update the active conversation identifier before accepting another message.

If the current request is genuinely still running, History should remain usable. Returning to that conversation may show its in-progress status, but the running state must not disable unrelated historical conversations.

Protect against late responses: completion from conversation A must not be inserted into conversation B after the user switches.

### 6. Repair or safely render historical placeholder links

New responses must no longer persist placeholder internal URLs.

For existing messages, implement one of the following safe behaviours:

- transform recognised historical placeholder links into canonical routes at render time when the slug can be validated; or
- render them as non-clickable legacy text.

Do not perform a blind hostname replacement. The target record and current authorization must be validated.

## Response contract direction

The structured response envelope should support optional collections such as:

```ts
type AssistantResponse = {
  message: string
  quickSummary?: string
  nextSteps?: Array<{ label: string; detail?: string }>
  navigation?: Array<{
    type: "internal_navigation"
    label: string
    route: "wiki_article" | "project" | "workstream" | "evaluation" | "agent"
    target: Record<string, string>
  }>
  citations?: Array<{
    title: string
    url?: string
    sourceType: "external" | "platform_wiki" | "project_evidence"
    sourceId?: string
  }>
  artifactRefs?: Array<{
    artifactId: string
  }>
}
```

This is an interface direction, not a requirement to adopt these exact TypeScript names. Persisted, authorized application records remain authoritative.

## Failure and recovery behaviour

The Assistant panel must present a clear terminal state for each failure class:

- **Provider or generation failure:** explain that the response could not be completed and allow retry.
- **Response completed but refresh failed:** offer to reload the active conversation without resubmitting the prompt.
- **Navigation target unavailable:** keep the answer, omit the action, and explain that the page could not be resolved.
- **Artifact persistence failed:** keep the answer and clearly state that the artifact was not attached.
- **History load failed:** preserve the current display and allow the user to retry loading the selected conversation.

Never leave `Thinking…` as the final visible state.

## Out of scope

- Automatically creating a Project or Workstream from method guidance.
- Treating every cited Wiki page as an artifact.
- Broad autonomous navigation without user action.
- Repairing arbitrary external links generated in historical conversations.
- Changing the currently configured default model.
- Redesigning the complete chat interface beyond the affected completion, navigation, Artifacts, and History behaviour.

## Acceptance criteria

1. A successful response replaces the activity indicator without requiring another UI action.
2. All controls return to their correct enabled state after success or failure.
3. A stale or slow request produces a visible recovery state rather than indefinite `Thinking…`.
4. Method responses never construct KB Sandbox absolute URLs or placeholder hostnames.
5. Legacy System Understanding navigation resolves to the canonical authorized Wiki route.
6. OpenAPI Discovery navigation resolves to the canonical authorized Wiki route.
7. Clicking a validated method action navigates within the current KB Sandbox deployment.
8. Unresolvable internal destinations do not render as clickable fabricated links.
9. Navigation actions, citations, and artifacts are represented and rendered separately.
10. The Assistant cannot claim that an artifact is attached unless an authorized persisted artifact exists.
11. The Artifacts control accurately reflects the active conversation's persisted artifact count.
12. Opening the Artifacts panel shows usable records with validated destinations.
13. Switching History during or after a request loads the selected conversation and correct artifact collection.
14. A late response from one conversation cannot appear in another conversation.
15. Historical placeholder KB Sandbox links are either safely resolved through validated records or rendered non-clickable.
16. Existing row-level security and authorization boundaries remain intact.

## Required regression tests

### Scenario A — successful method guidance

1. Start a new conversation.
2. Submit the live reproduction prompt.
3. Verify that `Thinking…` is replaced by the completed response.
4. Verify that input and model controls recover.
5. Verify selection of Legacy System Understanding.
6. Click the internal Handbook action.
7. Verify navigation to `/wiki/legacy-system-understanding-workbench-method`.

### Scenario B — OpenAPI Discovery

1. Ask which method recovers an API contract from legacy source.
2. Verify OpenAPI Discovery is recommended.
3. Verify the navigation action resolves to `/wiki/openapi-discovery-workbench-method`.
4. Verify no `example.com` or Unicode-hyphen hostname is rendered.

### Scenario C — no created artifact

1. Ask only for method guidance and a Handbook destination.
2. Verify that the link appears as navigation, not as an artifact.
3. Verify that the conversation does not claim an artifact was attached.

### Scenario D — real artifact

1. Use a controlled test path that creates or attaches an authorized document.
2. Verify persistence succeeds before the response claims attachment.
3. Open Artifacts and verify title, type, provenance, scope, and destination.

### Scenario E — provider timeout or forced error

1. Simulate a provider timeout or terminal generation error.
2. Verify a visible failure message replaces `Thinking…`.
3. Verify controls recover and retry does not double-submit.

### Scenario F — History during completion

1. Submit a deliberately slow request in conversation A.
2. Open conversation B from History.
3. Verify conversation B loads and remains usable.
4. Allow A to complete.
5. Verify A's response is stored only in A and does not change B's visible messages or artifacts.

### Scenario G — refresh reconciliation

1. Simulate successful server persistence followed by a client update failure.
2. Use the recovery action to reload the active conversation.
3. Verify the completed message appears exactly once and the original prompt is not resubmitted.

## Verification expectation

Run focused component/action tests, the full automated suite, type checking, and linting. Then live-test the exact Legacy System Understanding and OpenAPI Discovery prompts in the local UI. Verification is incomplete unless the proposed navigation action is clicked and the Artifacts panel is inspected in the browser.

