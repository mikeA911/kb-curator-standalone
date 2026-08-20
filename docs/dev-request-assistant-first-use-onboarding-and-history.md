# Development Request: Assistant First-Use Onboarding and Conversation Continuity

**Status:** Proposed  
**Created:** 20 August 2026  
**Area:** Workbench Assistant  
**Priority:** High product experience

## Summary

Make the Workbench Assistant feel more welcoming and purposeful the first time a user opens it. A first-time user should receive an upbeat, exploratory introduction that explains what the Assistant can help them discover and do. The introduction must also clearly disclose that conversation history is retained so the user can return to it in future sessions.

Because the application currently persists conversations and messages but the chat panel does not restore or expose them after a reload, the history promise must be implemented together with usable conversation continuity. The product must not tell users that history will help future conversations unless users can actually revisit or resume that history.

## Desired first-use experience

When a user who has never used the Workbench Assistant opens the panel, show a welcome message immediately, before they submit a prompt.

Suggested initial copy:

> Hi! I’m your Workbench Assistant, and I’m excited to explore KB Sandbox with you. We can investigate what you’re trying to accomplish, find the right Workbench method, check what information you already have, search approved platform guidance, and help you create projects or workstreams.
>
> Your Assistant conversations are saved to your account, so you can return to them in future sessions. What would you like to explore first?

Follow the welcome message with a small set of optional starter prompts, such as:

- “Help me choose the right Workbench method.”
- “Show me what KB Sandbox can do.”
- “Help me turn an idea into a project.”
- “Explain what information I need to get started.”

The greeting should be enthusiastic but concise. It should encourage exploration without implying that the Assistant can write or apply source-code changes.

## First-use definition

Treat a user as first-time only when no Assistant conversation belonging to that user exists.

Do not use any of the following as a substitute for that check:

- the panel being opened for the first time in the current browser session;
- an empty client-side message array;
- a missing browser-storage flag;
- the user starting a new conversation;
- the browser cache having been cleared.

The server-side, user-scoped conversation record is the source of truth. Existing row-level security must continue to ensure that users can see only their own conversation history.

## Returning-user experience

When a returning user opens the Assistant:

- restore the most recently active conversation, or show a clear choice to resume it;
- provide access to prior conversations through a simple history control;
- provide an explicit **New conversation** action;
- do not repeat the full first-use greeting in every new conversation;
- use a shorter contextual welcome, such as “Welcome back—would you like to continue where we left off or start something new?” when appropriate.

Starting a new conversation must not erase prior conversations.

## Conversation-history disclosure

The disclosure must be visible and understandable, not hidden only in terms or settings.

Use wording that accurately describes implemented behavior:

- history is saved to the signed-in user's account;
- it can be revisited in future sessions;
- other users cannot access it through the normal product experience;
- deletion or retention controls must be described only if those controls actually exist.

Do not claim that saved history automatically becomes long-term Assistant memory unless the application deliberately retrieves prior conversations and supplies relevant information to the model. Conversation storage, conversation resumption, and cross-conversation memory are separate capabilities and must be described separately.

## Storage capacity assumptions

Conversation text is expected to be modest compared with uploaded evidence and generated artifacts. Plan capacity using the following working estimates, then replace them with measured production percentiles once sufficient usage exists:

| Stored content per turn | Working estimate |
|---|---:|
| User message | 0.2–1 KB |
| Assistant response | 1–4 KB |
| Tool calls and provenance metadata | 1–3 KB |
| Persisted tool results, including bounded Wiki results | 4–12 KB |
| **Typical total** | **6–20 KB per turn** |

Approximate raw transcript storage:

| Usage | Working estimate |
|---|---:|
| 100 turns | 1–2 MB |
| 1,000 turns | 10–20 MB |
| 10,000 turns | 100–200 MB |

Allow additional capacity for database row overhead, indexes, summaries, and vectors. For initial planning, allow approximately **25–100 MB per normal active user per year**, **250–500 MB for a heavy user**, and monitor exceptional users who may exceed 1 GB. These are capacity assumptions, not user quotas.

Do not duplicate uploaded files, artifacts, or source documents inside chat messages. Store stable references to those records. Continue to apply defensive bounds to persisted tool results so a single turn cannot copy an unbounded amount of evidence into the transcript.

Add operational measurement for:

- conversation and message count per user;
- stored bytes per conversation and per user;
- distribution of user-message, Assistant-message, and tool-result sizes;
- growth rate and retained inactive history;
- summary/vector storage separately from raw transcript storage.

Use measured p50, p95, and p99 values to refine capacity plans and any future retention policy.

## Context-management strategy

Persisting the complete transcript does not mean sending the complete transcript to the AI model. Implement context as three separate layers with explicit provenance and token budgets.

### 1. Short-term working context

For each turn, assemble a bounded working set containing:

- the current user message;
- the most recent relevant messages, initially approximately 8–15 messages;
- the active project and workstream context;
- tool results produced during the current turn;
- a compact summary of relevant older conversation state.

Use a configurable token budget—initially in the range of 12,000–24,000 tokens—rather than filling the selected model's entire context window. Reserve output tokens before selecting input. When the input exceeds its budget, retain system instructions and the current message, then prefer relevant recent messages and the rolling summary over simply truncating from an arbitrary character boundary.

Token counts must be computed or conservatively estimated before the provider request. Record enough internal telemetry to understand truncation and context-composition decisions without logging secrets or duplicating sensitive content.

### 2. Conversation memory

Maintain a rolling structured summary for each conversation. The summary should capture, where present:

- the user's objective;
- confirmed requirements and constraints;
- decisions made and their rationale;
- open questions;
- projects, workstreams, artifacts, or notes created;
- important referenced evidence;
- the agreed or suggested next action.

Refresh the summary after a configurable number of turns—initially around ten—or whenever the working-context budget approaches its threshold. Summary generation must not replace or modify the authoritative transcript.

Each summary should carry its source conversation, covered-message boundary, generation timestamp, provider/model provenance, and summary format version. If summary generation fails, continue with recent-message context rather than blocking the conversation.

### 3. Long-term retrievable memory

Add cross-conversation retrieval as a later, separately testable capability. When implemented, use this precedence:

1. approved project knowledge;
2. relevant project evidence and artifacts;
3. confirmed decisions and summaries from the user's prior conversations;
4. platform Wiki knowledge.

Retrieve only a small number of relevant summaries or excerpts within a separate token budget. Results must retain links to their source conversation and message where possible. The Assistant should be able to tell the user when a response relies on a prior conversation.

Do not treat every past user statement or Assistant inference as a permanent fact. Long-term memory records should distinguish at least:

- user-confirmed information;
- Assistant inference;
- project-specific context;
- temporary context;
- superseded information;
- removed information.

User-confirmed decisions should outrank Assistant inferences. Newer confirmed information should be able to supersede older information without deleting the historical transcript.

## History, context, and memory terminology

Use these terms consistently in code, documentation, and user-facing explanations:

- **Conversation history:** the complete saved transcript that the user can revisit.
- **Working context:** the bounded recent information supplied to the model for the current turn.
- **Conversation memory:** the rolling summary of an individual conversation.
- **Long-term memory:** selected, provenance-bearing information retrieved across conversations.

Do not describe resumable history as long-term AI memory. Do not claim cross-conversation memory until retrieval, isolation, correction, and deletion behavior have been implemented and validated.

## Functional requirements

### 1. Determine onboarding state on the server

Add a user-scoped server query that determines whether the user has any existing Assistant conversations and retrieves the appropriate recent-conversation metadata. Do not expose another user's conversation identifiers or titles.

### 2. Render a real Assistant welcome message

Present the first-use greeting visually as an Assistant message, not merely placeholder text. It should appear without calling an AI model and without creating token cost.

The welcome message may remain UI-authored rather than being inserted into `chat_messages`. If it is persisted, mark it unambiguously as a system-generated onboarding message so it is not mistaken for model output and does not receive false provider/model provenance.

### 3. Provide starter prompts

Starter prompts should populate or submit the user's first message and then follow the normal Assistant flow. They must be accessible by keyboard and screen reader and remain usable at narrow panel widths.

### 4. Make stored history usable

Add the minimum viable conversation continuity needed to support the disclosure:

- list the signed-in user's recent conversations;
- resume a selected conversation with its messages in chronological order;
- start a new conversation intentionally;
- preserve per-message provider/model provenance when older messages are displayed;
- handle missing, deleted, or inaccessible conversations gracefully.

### 5. Preserve the document-first boundary

The greeting and starter prompts should describe the Assistant as helping users explore, reason, search guidance, and produce plans or Workbench records. They must not suggest autonomous code editing or implementation.

### 6. Add bounded context composition

Introduce a dedicated context-composition service rather than assembling an ever-growing transcript directly in the provider call. It should:

- accept the selected model's context and output limits;
- reserve space for system instructions, tool definitions, tool results, and the response;
- choose recent messages and summaries within configured budgets;
- preserve message ordering and valid tool-call/tool-result pairs;
- report when older content was omitted or represented by a summary;
- produce provider-neutral messages for the existing AI abstraction.

### 7. Add conversation summary metadata

The core transcript can remain in the existing `conversations` and `chat_messages` tables. A migration may extend `conversations` with fields such as:

- `summary` or a structured `summary_json`;
- `summary_through_message_id` or an equivalent stable boundary;
- `summary_updated_at`;
- `summary_provider` and `summary_model`;
- `summary_version`;
- `last_message_at`;
- `archived_at`.

If multiple summary versions, memory facts, or semantic chunks are required, prefer related tables over repeatedly widening `conversations`. A future long-term-memory table must be user-scoped, provenance-bearing, correctable, deletable, and protected by row-level security. Do not add that table merely to deliver the first history UI.

### 8. Preserve deletion semantics

When a user deletes a conversation, remove or invalidate its derived summaries, vectors, and long-term-memory records according to the documented retention policy. A deleted conversation must not continue influencing future context through an orphaned embedding or summary.

### 9. Add contextual navigation

The Assistant should connect its guidance to the relevant KB Sandbox screen. When a response refers to a project, workstream, Wiki article, artifact, assessment, provider configuration, or other identifiable application record, it should be able to present a clear in-app navigation action such as:

- **Open project**
- **View workstream**
- **Read Handbook article**
- **Review artifact**
- **Open AI settings**
- **Continue in Assessments**

Prefer a visible link or action attached to the response over silently moving the user. Navigate automatically only when the user explicitly asks to go, open, show, or take them to a page and the destination is unambiguous. If navigation would discard unsaved form input or interrupt an active workflow, request confirmation first.

Navigation targets must be structured tool results or validated application routes, not untrusted URLs invented by the model. The model may identify the intended destination, but server-side application code must resolve the canonical route from an authorized record identifier or an allow-listed route definition.

Before offering or executing navigation:

- verify that the signed-in user is authorized to access the destination;
- avoid revealing the existence, title, or identifier of an inaccessible record;
- distinguish internal application routes from external references;
- open external destinations only with the product's normal safety treatment;
- preserve the conversation and draft input when the user moves to another page.

The Assistant panel should remain available after in-app navigation, with the same conversation restored. When helpful, attach lightweight navigation context to the subsequent turn—for example, “You’re now viewing Project Alpha”—without treating page presence as proof that the user completed an action.

Navigation is distinct from mutation. Opening a project or settings page does not authorize the Assistant to edit it. Existing confirmation and authorization boundaries for create/update tools remain unchanged.

Suggested implementation shape:

- define a small typed navigation-target contract, for example `kind`, authorized record identifier, canonical label, and optional presentation hint;
- return navigation targets alongside Assistant text instead of embedding raw routes in generated prose;
- render them as accessible response actions in the chat panel;
- resolve canonical routes in trusted application code;
- record the offered and selected destination as interaction telemetry without storing sensitive page content;
- support browser back/forward behavior and deep links.

## Product decisions to document before release

The development work must record the actual policy for:

- how long conversations are retained;
- whether users can delete individual conversations or all history;
- whether administrators have any exceptional access beyond normal row-level security;
- whether previous conversations are merely resumable or are also searched automatically for cross-conversation memory;
- what happens to conversation history when a user account is deleted.

If retention and deletion policy are not yet settled, use a narrowly truthful disclosure and log the unresolved controls as follow-up work. Do not invent a retention duration in the UI.

## Acceptance criteria

1. A signed-in user with no prior conversation sees the exploratory greeting when opening the Assistant.
2. The greeting appears without an AI request and therefore has no model cost or model provenance.
3. The greeting states that conversations are saved to the user's account and can be revisited in future sessions.
4. The greeting includes at least three relevant starter prompts.
5. Selecting a starter prompt begins a normal persisted conversation.
6. Reloading the application does not cause the same user to be treated as first-time again.
7. A returning user can resume at least the most recent conversation and see its prior messages.
8. A returning user can intentionally begin a new conversation without deleting previous history.
9. Users cannot retrieve another user's conversations or messages.
10. The full first-use greeting is not repeated for every new conversation.
11. The UI does not describe stored history as cross-conversation AI memory unless that retrieval behavior has been implemented and tested.
12. Tests cover first-time state, returning-user state, reload, new conversation, history retrieval, empty/deleted history, and user isolation.
13. Provider requests use a bounded working context rather than an unbounded full transcript.
14. Context composition reserves output capacity and preserves valid tool-call/tool-result pairs.
15. A rolling summary can represent older conversation state without modifying the raw transcript.
16. Summary records include their source boundary, format version, timestamp, and provider/model provenance.
17. Summary failure does not prevent the user from continuing the conversation.
18. Cross-conversation retrieval, if enabled, is user-scoped and returns provenance-bearing results within a separate token budget.
19. Deleting a conversation also removes or invalidates all derived context that could otherwise influence later conversations.
20. Operational reporting can measure stored bytes and growth per user without exposing message content.
21. When the Assistant identifies a relevant application destination, it can render a labelled in-app navigation action alongside its response.
22. Navigation actions are generated from validated routes or authorized record identifiers rather than arbitrary model-authored URLs.
23. The Assistant does not expose or navigate to records the signed-in user cannot access.
24. The application navigates immediately when the user explicitly requests an unambiguous destination; otherwise it offers an action for the user to select.
25. Potential loss of unsaved work requires confirmation before navigation.
26. In-app navigation preserves the active conversation and any safe-to-preserve draft message.
27. Navigating to a page does not grant permission for a create, update, approval, or deletion action.

## Suggested validation scenarios

### Brand-new user

1. Create a user with no `conversations` rows.
2. Open the Assistant.
3. Confirm the welcome message and history disclosure appear without a network call to an AI provider.
4. Choose a starter prompt and confirm that a conversation is created and the reply follows the normal provenance flow.

### Returning user

1. Sign in as a user with multiple conversations.
2. Open the Assistant and verify that the full first-use greeting is absent.
3. Resume the most recent conversation and verify chronological messages and response details.
4. Start a new conversation and confirm older history remains available.

### Isolation

1. Sign in as a different non-admin user.
2. Confirm that the first user's conversation titles, identifiers, and messages cannot be listed or retrieved.

### Long conversation

1. Create a conversation that exceeds the configured working-context budget.
2. Verify that the model request retains system instructions, the current message, relevant recent turns, and a summary of older state.
3. Confirm that omitted content is not cut through the middle of a tool-call/tool-result pair.
4. Confirm that the full original transcript remains available to the user.

### Correction and deletion

1. Record an inferred fact in an older conversation and later replace it with newer user-confirmed information.
2. Confirm that retrieval favors the confirmed correction while retaining historical provenance.
3. Delete the source conversation and confirm that its summaries, vectors, and memory records can no longer influence a subsequent conversation.

### Contextual navigation

1. Ask, “Which method should I use if I have source code but no OpenAPI specification?”
2. Confirm that the response can offer a validated link to the relevant Handbook article and any appropriate next-step screen.
3. Ask the Assistant to open that article and confirm that the application navigates while preserving the conversation.
4. Return to the Assistant and verify that the same conversation and draft state remain available.
5. Attempt the same flow with a record the user cannot access and confirm that neither its metadata nor a working route is disclosed.
6. Begin editing an unsaved form, request navigation, and confirm that the user is warned before the form is abandoned.

## Implementation note

The existing `conversations` and `chat_messages` tables already provide durable, user-owned storage, and the current Assistant loop can continue a conversation when given its identifier. The missing product layer is first-use detection plus retrieval, selection, and rendering of persisted conversations in the chat panel.

Implement this incrementally:

1. expose saved history and conversation resumption;
2. add bounded recent-message context and a rolling conversation summary;
3. measure real storage and context behavior;
4. add provenance-bearing cross-conversation retrieval only after the simpler strategy has been evaluated.
