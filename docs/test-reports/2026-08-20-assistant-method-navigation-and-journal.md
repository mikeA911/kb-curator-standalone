# Exploratory Test Report: Assistant Method Guidance, Navigation, and Journal

**Date:** 20 August 2026  
**Environment:** Local development server (`192.168.8.102:3000`)  
**User:** Admin account  
**Conversational model:** Groq / GPT-OSS 120B  
**Scope:** Five Workbench-method prompts followed by one Journal generation attempt

## Summary

The Assistant correctly recognized and explained two of five requested Workbench methods before repeated Groq provider failures prevented completion of the remaining three. Responses contain raw Markdown formatting and, in an earlier response, a hard-coded example-domain link; the chat UI does not render Markdown or provide validated in-app navigation actions. The Journal page and privacy disclosure render correctly, but the journal download did not begin within a two-minute test window and no visible error was shown.

## Method results

| # | Intended method | Result | Navigation |
|---:|---|---|---|
| 1 | Organization Knowledge Base | Pass: correctly identified the method and described requirements, deliverables, boundary, and next steps. | Fail: no clickable in-app destination in the completed clean run. |
| 2 | AI Strategy Comparison | Pass: correctly identified the method and described shared evidence, approaches, evaluation criteria, deliverables, and next steps. | Fail: no clickable in-app destination. |
| 3 | OpenAPI Discovery | Blocked: prompt was persisted, but the turn ended with `groq generateChat failed`. | Not testable. |
| 4 | MCP Architecture | Blocked: prompt was persisted, but no Assistant reply completed after the provider failure. | Not testable. |
| 5 | Legacy System Understanding | Blocked: prompt was persisted, but no Assistant reply completed after the provider failure. | Not testable. |

An earlier pre-clean-run response for Organization Knowledge Base included this model-authored target:

`https://kb-sandbox.example.com/wiki/organization-knowledge-base-workbench-method`

The URL used an example domain rather than the current application's canonical route and appeared as literal Markdown because Assistant content is rendered as plain text.

## Bugs and gaps

### 1. Assistant Markdown is rendered as plain text

**Severity:** High usability

Visible responses display formatting tokens such as `**bold**`, Markdown table syntax, headings, separators, `<br>`, and `[label](url)` instead of formatted content. This makes otherwise useful method guidance difficult to scan and prevents links from being actionable.

**Expected:** Safely render a supported Markdown subset, including paragraphs, headings, lists, emphasis, tables, and links. Sanitize generated content and apply suitable chat-width styling.

### 2. Navigation is not implemented as a trusted application action

**Severity:** High functional gap

The Assistant can mention a page in generated prose, but `ChatPanel` does not render typed navigation targets or route actions. A model-authored link used `kb-sandbox.example.com`, demonstrating why raw generated URLs should not be trusted.

**Expected:** Resolve authorized record identifiers or allow-listed destinations to canonical relative routes in application code and render actions such as **Read Handbook article**. Preserve the conversation across navigation.

### 3. Groq chat generation failed repeatedly during the method sequence

**Severity:** High reliability

After two successful method responses, the next turn ended with `groq generateChat failed`. The following method prompts were visible in conversation history but did not receive responses.

**Expected:** Each submitted user message should end in either a durable Assistant reply or a durable, per-message failure state with a retry action. Capture a safe diagnostic category—rate limit, timeout, provider response, tool-loop failure, or network error—rather than exposing only the generic provider message.

### 4. Send has a brief double-submit/race window

**Severity:** Medium

During the initial automated pass, the input remained enabled briefly after Send was activated. Additional messages could begin before the pending state disabled the form, resulting in multiple persisted user prompts without corresponding replies.

**Expected:** Guard synchronously against re-entry before starting the asynchronous action. Disable the input and Send action in the same event cycle and reject duplicate/in-flight submissions at the server boundary.

### 5. Journal generation produced no download or visible error within two minutes

**Severity:** High reliability / inconclusive root cause

The Profile page correctly displayed the Journal disclosure and current provider/model. Activating **Download my journal (DOCX)** did not produce a browser download event within 120 seconds. The page remained on `/profile`, the link remained active, and no console or visible error was present.

**Expected:** Provide immediate pending feedback, enforce a documented generation timeout, and either start the DOCX download or show a useful recoverable error. A background job/progress flow may be necessary for histories that exceed a synchronous request window.

## What worked

- Authentication and user/admin identity were correctly reflected after signing in.
- Conversation history resumed across page reload/session use.
- GPT-OSS 120B was visibly selected as the default conversational model.
- Successful responses used the relevant Handbook content and gave strong requirement-oriented guidance.
- The Profile Journal disclosure clearly described the 30-day range, Groq/GPT-OSS 120B processing, private download, non-retention, and separation from Assistant memory.

## Recommended next pass

After addressing rendering and provider reliability, retest five methods using one completed turn at a time. Confirm method recognition separately from the typed navigation target, then generate a journal from those completed conversations and inspect the downloaded DOCX for source coverage and formatting.

---

## Regression retest — 21 August 2026

Retested after the reported bug-fix pass using Groq / GPT-OSS 120B. Each method ran in a fresh conversation to prevent a failed turn from affecting the next case.

| Method | Recognition | Provider completion | Rendering/navigation |
|---|---|---|---|
| Organization Knowledge Base | Pass | Pass, approximately 11 seconds | Raw Markdown remains; handbook target is plain inline text. |
| AI Strategy Comparison | Pass | Pass, approximately 10 seconds | Raw Markdown remains; handbook target is plain inline text. |
| OpenAPI Discovery | Pass | Pass, approximately 8 seconds | Raw Markdown/table remains; `/platform_handbook/...` is not clickable. |
| MCP Architecture | Pass | Pass, approximately 31 seconds | Raw Markdown/table and `<br>` text remain; no clickable method action. |
| Legacy System Understanding | Pass | Pass, approximately 51 seconds | Raw Markdown/table and `<br>` text remain; no clickable method action. |

### Improvements confirmed

- All five turns completed successfully; no `groq generateChat failed` response occurred.
- Every case selected the intended Workbench method and returned relevant requirements and next steps.
- Send disabled synchronously in the observed cases; the earlier rapid double-submit window was not reproduced.
- Handbook references no longer used the `kb-sandbox.example.com` hostname in this pass.
- Grok (xAI) / Grok 4.6 is now visibly distinct from Groq models in the Assistant model selector.

### Issues still present

- Assistant responses still render Markdown syntax as literal text rather than formatted content.
- Tables and `<br>` strings remain difficult to read at chat-panel width.
- Handbook destinations are plain text or inline code, not validated clickable in-app navigation actions.
- Journal generation was invoked after the five successful conversations, but no browser download began within the test timeout. The browser navigated to `/profile/journal`; the generated DOCX was therefore not available for inspection during this pass.
