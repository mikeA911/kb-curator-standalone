# Development Request: Structured Assistant Responses and Conversation Artifacts

**Status:** Proposed  
**Created:** 21 August 2026  
**Area:** Workbench Assistant  
**Priority:** High product experience / follow-on to current Assistant bug fixes

## Summary

Replace the Assistant's plain-text-only response contract with a versioned hybrid response envelope. The Assistant should continue to speak conversationally, but links, documents, citations, summaries, requirements, next steps, and suggested replies should be returned as validated structured data and rendered as native KB Sandbox interface elements.

Add an **Artifacts** button to the Assistant header. It should open a conversation-scoped collection of the durable outputs and evidence accumulated during the active conversation: documents, citations, created records, requirement states, and proposed next actions. Routine KB Sandbox navigation links are response actions, not artifacts, and must not be collected in this panel. The collection is a view over persisted Assistant responses and tool results, not a new source of AI memory.

This is a follow-on development request. It should not be combined with or block the Assistant rendering, provider-reliability, navigation, Send-race, and Journal fixes already under active development.

## Product intent

The Assistant should feel conversational without forcing the user to search long prose for the useful outcome. A response may contain:

- a readable explanation;
- a one-sentence summary;
- one or more trusted, response-local destinations in KB Sandbox;
- relevant supporting citations;
- documents or artifacts created or discovered;
- a small set of requirements or next steps;
- suggested replies that help the user continue.

The prose and the structured elements should reinforce each other. The structured elements must not become a rigid form that appears in every response.

Internal navigation and conversation artifacts are separate concepts:

- **Navigation actions** help the user move to a relevant KB Sandbox screen now. They remain attached to the response that proposed them.
- **Artifacts** are durable outputs, evidence, decisions, requirements, or next actions worth revisiting later.

Opening a Wiki article, project, settings page, or workstream is not itself an artifact.

## Proposed response envelope

Use a versioned envelope similar to the following. Final field names may change during implementation, but the concepts and trust boundaries should remain.

```json
{
  "schemaVersion": "1.0",
  "message": "OpenAPI Discovery is the best fit because you have source code but no documented API contract.",
  "quickSummary": "Recover an OpenAPI specification from the existing application.",
  "requirements": [
    {
      "label": "Application source repository",
      "status": "available",
      "importance": "required"
    },
    {
      "label": "Defined repository scope",
      "status": "needed",
      "importance": "required"
    }
  ],
  "links": [
    {
      "label": "Read the OpenAPI Discovery method",
      "target": {
        "kind": "wiki_article",
        "id": "openapi-discovery-workbench-method"
      }
    }
  ],
  "documents": [
    {
      "label": "OpenAPI Discovery plan",
      "documentType": "implementation_plan",
      "artifactId": "00000000-0000-0000-0000-000000000000"
    }
  ],
  "citations": [
    {
      "label": "OpenAPI Discovery (Workbench Method)",
      "sourceType": "wiki_article",
      "sourceId": "openapi-discovery-workbench-method"
    }
  ],
  "nextSteps": [
    {
      "label": "Define the repository scope",
      "status": "suggested",
      "action": null
    }
  ],
  "suggestedPrompts": [
    "I have the repository.",
    "Help me define the repository scope."
  ]
}
```

All fields other than `schemaVersion` and `message` should be optional. A simple greeting or factual answer may contain only those two fields.

## Response rendering

### Conversational message

Render `message` as readable prose. Support a deliberately small, sanitized Markdown subset:

- paragraphs and line breaks;
- headings within a limited level range;
- ordered and unordered lists;
- emphasis;
- inline code and bounded code blocks;
- tables where they remain usable at chat-panel width.

Do not permit raw HTML, scripts, embedded media, arbitrary iframes, or model-authored event handlers. External Markdown links should not be the primary mechanism for application navigation.

### Quick summary

When present, render `quickSummary` as a compact highlighted block near the beginning or end of the response. Avoid showing it when it merely repeats a short `message`.

### Requirements and next steps

Render requirements and next steps as compact native cards or checklist-style rows. Recommended status vocabulary:

- requirements: `available`, `needed`, `optional`, `can_be_produced_elsewhere`, `unknown`;
- next steps: `suggested`, `ready`, `blocked`, `completed`.

These are Assistant observations unless backed by a persisted project requirement record. Do not silently write conversational status into project state.

### Suggested prompts

Render suggested prompts as accessible buttons. Selecting one should populate the input by default; submitting immediately may be offered as a separate interaction. Do not submit a suggestion merely because it receives keyboard focus.

## Trusted links and navigation

The model must not provide canonical in-app URLs. It may propose a typed destination using a target kind and stable record identifier. Trusted application code must:

1. validate the target kind;
2. load or resolve the target record;
3. verify that the signed-in user may access it;
4. construct the canonical relative route;
5. return a safe label and action to the client.

Supported initial target kinds may include:

- `wiki_article`;
- `project`;
- `workstream`;
- `workstream_artifact`;
- `assessment` or `evaluation`;
- `source`;
- an allow-listed application screen such as AI settings.

Do not render a working link or reveal metadata for a target the user cannot access. External links require a distinct type, visible external-site treatment, URL validation, and the normal product safety behavior.

The Assistant panel and active conversation must survive in-app navigation.

Validated internal navigation actions should remain visible with the response that introduced them and may be restored with conversation history. They must not increase the Artifacts count or appear as standalone entries in the Artifacts panel.

An internal destination may still appear through another legitimate artifact category. For example, a Wiki article used as supporting evidence can appear under **Citations**, and a workstream artifact can appear under **Documents** or **Created records**. In those cases it is included because of its evidence/output role, not merely because it has a KB Sandbox route.

## Documents and created records

Structured document entries must refer to real, authorized application records or short-lived private downloads. The model must not claim a document exists merely by returning a title.

Trusted server code should enrich a valid `artifactId` or download token with:

- canonical title;
- document/artifact type;
- current status;
- owning project/workstream where appropriate;
- view/download availability;
- provenance.

If the Assistant proposes a document that has not been created, render it under next steps as **Proposed**, not under Documents.

## Citations

Citations should be assembled from actual retrieval and tool provenance wherever possible rather than invented by the language model.

For a `search_wiki` result, the server already knows the returned article identifiers and titles. The final response may select which retrieved sources support its answer, but application code must verify that every citation was present in the turn's authorized tool results.

Each citation should retain:

- source type and stable identifier;
- source label/version where available;
- the message that cited it;
- enough location information to open the relevant record;
- whether it is platform knowledge, project evidence, an artifact, or prior conversation history.

Do not present a retrieval result as supporting a claim when it was not actually available to that turn.

## Artifacts button and panel

Add an **Artifacts** button to the Assistant header beside **History** and **New conversation**. The button may display a count when the current conversation contains structured items.

Selecting it opens a drawer, popover, or secondary panel scoped to the active conversation. It should provide these groups when populated:

1. **Documents** — created or referenced artifacts and private downloads;
2. **Citations** — sources used in Assistant responses, including internal sources when they support a claim;
3. **External resources** — substantive third-party reading or reference links worth retaining, clearly marked as external;
4. **Next steps** — current proposed actions and requirements needing attention;
5. **Created records** — projects, workstreams, notes, or artifacts created through Assistant tools.

Do not add routine internal navigation actions—such as **Open project**, **Read Handbook article**, **Open AI settings**, or **View workstream**—to the Artifacts panel. Those actions belong only to their originating responses unless the destination independently qualifies as a citation, document, or created record.

The word “Artifacts” in this interface means durable conversation resources and outputs. Do not imply that every collected item is a persisted `workstream_artifacts` record. The panel should visually distinguish actual Workbench artifacts from citations, external resources, requirements, and proposed actions.

Each entry should show which Assistant response introduced it and provide **Go to message** where useful. Deduplicate the same record within a conversation while retaining references to every message that used it.

The panel should update as turns complete and restore correctly when a saved conversation is resumed. A new conversation starts with an empty Artifacts collection; prior conversation collections remain available when their conversations are reopened.

## Storage and schema strategy

Persist the validated response envelope with the final Assistant message so it can be rendered identically after reload. Recommended options:

- add a nullable `response_payload jsonb` column to `chat_messages`; or
- add a related immutable `assistant_message_payloads` table keyed one-to-one to the final Assistant message.

Prefer the simpler JSONB column unless indexing, payload versioning, or access patterns justify a separate table. Keep `content` populated with the plain conversational message for backward compatibility, searching, exports, journals, and graceful fallback.

The persisted payload should contain only validated model-facing fields and stable references. Do not persist resolved authorization decisions or temporary signed URLs; resolve them again for the current user when displaying history.

The Artifacts panel should initially derive its collection from the active conversation's persisted response payloads and trusted tool provenance. Do not create a second independently editable collection that can drift away from the messages.

## Producing structured responses

The response must retain the conversational model's identity and provenance. Do not silently send the user's final answer to the independently configured structured-output default unless the product deliberately discloses and records that second model.

Use one of these provider-neutral strategies:

1. native structured-output generation by the selected conversational model;
2. a required final tool call such as `present_assistant_response` whose arguments match the schema;
3. validated JSON extraction with one bounded repair attempt.

The final-tool approach is preferred when it works consistently across enabled conversational providers because it fits the existing tool loop and avoids treating raw JSON as user-visible prose.

Validate the envelope with a versioned runtime schema. Enforce maximum lengths and item counts. If validation or repair fails, persist and display the plain-text response rather than failing the entire turn.

## Failure and fallback behavior

- Invalid optional items should be omitted without losing a valid conversational message.
- An unauthorized or missing target should render as unavailable or be omitted; it must not break the response.
- A failed document lookup must not turn a proposed document into a real artifact.
- Unsupported future schema versions should fall back to `content` and show no structured cards.
- A provider incapable of reliable structured output must remain usable for plain conversational replies if it otherwise supports chat.
- Retried turns must not duplicate created records or Artifacts entries.

## Privacy and authorization

- The Artifacts panel inherits the active conversation's ownership and row-level security.
- Every referenced record must be re-authorized when displayed or opened.
- Conversation access alone does not grant access to a referenced project, source, artifact, or document whose permissions have since changed.
- Private Journal downloads must not appear in conversation Artifacts unless the user explicitly requested journal generation from that conversation and the temporary download remains valid.
- Do not expose raw tool results, hidden prompts, credentials, internal provider errors, or inaccessible record metadata through structured payloads.

## Accessibility and responsive behavior

- The Artifacts button, category controls, response cards, and suggested prompts must be keyboard accessible.
- Counts and status must not rely on color alone.
- Cards and tables must remain readable in the current narrow chat panel.
- Screen readers should announce external destinations, unavailable items, current requirement status, and download actions.
- Opening and closing the Artifacts panel must manage focus predictably without discarding draft input.

## Out of scope for the first version

- Automatically executing every proposed next step;
- treating proposed next steps as a full task-management system;
- sharing a conversation's Artifacts collection with other users;
- editing Workbench artifacts directly inside the Artifacts panel;
- permitting arbitrary model-authored HTML or URLs;
- rebuilding existing project/workstream artifact storage;
- using the Artifacts collection as cross-conversation long-term memory.

## Acceptance criteria

1. The final Assistant message may include a validated, versioned structured response payload while retaining plain `content`.
2. Simple responses work without optional structured sections.
3. The UI safely renders the supported Markdown subset instead of exposing raw formatting tokens.
4. Quick summaries, requirements, next steps, suggested prompts, links, documents, and citations render as distinct native elements when present.
5. In-app links are resolved from an allow-listed target kind and authorized stable identifier, not a model-authored URL.
6. An inaccessible target does not reveal its title, identifier, or route.
7. Citations can be traced to authorized sources actually retrieved or available during the turn.
8. Documents refer to real records or valid private downloads; proposed documents are visibly distinguished.
9. The Assistant header displays an Artifacts control and an accurate count for the active conversation; routine internal navigation actions do not increase that count.
10. The Artifacts panel groups Documents, Citations, External resources, Next steps, and Created records without implying that every entry is a Workbench artifact.
11. Duplicate references to the same record are consolidated while retaining source-message references.
12. Selecting **Go to message** moves focus to the corresponding response.
13. The collection restores when a saved conversation is resumed and clears when a new conversation begins.
14. In-app navigation preserves the active conversation and draft input.
15. Response payloads preserve conversational provider/model provenance and disclose any additional model used for repair or transformation.
16. Schema failure falls back to the plain conversational message rather than failing the turn.
17. Existing plain-text historical messages continue to render.
18. Retried turns do not duplicate created records or structured entries.
19. Tests cover validation, version fallback, authorization changes, inaccessible records, malicious URLs/Markdown, duplicate entries, restored conversations, narrow layout, and keyboard navigation.
20. Journals and conversation summaries continue to use the authoritative plain message content and do not accidentally ingest UI-only labels as user facts.
21. A KB Sandbox destination offered only for navigation remains attached to its response and is excluded from the Artifacts panel.
22. An internal record appears in Artifacts only when it independently qualifies as a citation, document, or created record.

## Suggested validation scenario

1. Ask: “I have legacy source code but no API specification. Which method should I use?”
2. Confirm that the response names OpenAPI Discovery in conversational prose.
3. Confirm that a Quick summary, requirements, next steps, and suggested prompts render without raw JSON or Markdown syntax.
4. Confirm that **Read the OpenAPI Discovery method** resolves to the authorized local Wiki route rather than an invented hostname.
5. Open Artifacts and confirm that the supporting citation and next steps appear in their correct groups, while the response's **Read the OpenAPI Discovery method** navigation action is excluded.
6. Navigate to the Handbook article and confirm that the active conversation remains available.
7. Resume the conversation after reload and confirm that the same response cards and Artifacts collection reappear.
8. Remove the user's access to a referenced private record and verify that reopening the conversation no longer exposes or opens it.
9. Repeat using a provider that returns malformed structured output and confirm graceful plain-text fallback.

## Implementation note

This request should build on the current `AssistantTurnResult`, `DisplayMessage`, `chat_messages`, tool provenance, and conversation-history paths rather than creating a parallel chat system. The central change is to make the final response a validated hybrid of human-readable content and trusted structured references, then derive a useful conversation-level Artifacts view from that durable response data.
