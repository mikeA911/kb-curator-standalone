# Workbench Assistant Flow and Gemini Smoke Test

**Date:** 22 August 2026  
**Environment:** Local development (`http://192.168.8.102:3000`)  
**Account:** Admin  
**Scope:** Assistant flow/harness visibility, compact Assistant explanation, Gemini conversational use, method guidance, navigation, artifact honesty, provenance, and AI configuration clarity

## Summary

The new Workbench Assistant flow visualization is functional and accurately presents the current Assistant as a single agent with a bounded tool loop. Gemini is enabled, selectable in chat, and successfully completed a real tool-assisted Workbench-method recommendation.

Three issues remain:

1. A requested trusted Handbook destination is still rendered as emphasized text rather than a clickable, validated in-app navigation action.
2. The Gemini turn crossed the client slow-run threshold before its completed response appeared, although the response subsequently reconciled without manual refresh.
3. The Gemini provider page incorrectly labels the embedding model as **Conversational default**, contradicting the application-wide assignment shown immediately above.

## Passed checks

### Full Assistant page

Route tested:

`/agents/workbench-assistant`

Observed:

- Page loads for the signed-in admin.
- Assistant is shown as active.
- Active prompt version is `m7-v5`.
- Purpose and owner are visible.
- The page correctly states that the Assistant is one conversational agent, not a multi-agent system.
- The maximum tool-loop iteration limit is shown as 8.
- The Wiki-search limit is shown as 2.
- Flow steps A through J are visible.
- Branches and loop-back paths are represented in text.
- Guardrails and document-first boundary are visible.
- Six actual Assistant tools are listed with descriptions, permission requirements, enforcement locations, and input schemas.
- The active system prompt is visible to the admin.

### Flow-node interaction

Selected node:

`D — Call conversational model`

The expanded node correctly displayed:

- purpose;
- inputs and outputs;
- provider-error and timeout behaviour;
- implementation reference.

The interaction is keyboard/semantic-control compatible at the DOM level because each step is rendered as a button with expanded state.

### Compact chat explanation

The **How this Assistant works** disclosure successfully loaded and displayed:

- Assistant name and purpose;
- current conversational provider/model;
- prompt version `m7-v5`;
- single-agent flow summary;
- tools;
- guardrails;
- link to `/agents/workbench-assistant`.

The displayed model changed to **Gemini · Gemini 3.5 Flash** after selecting Gemini for the next message.

### Gemini availability and execution

Gemini appears in the Assistant model picker as:

`Gemini · Gemini 3.5 Flash`

Test prompt:

> I have source code for a legacy service but no API specification. Which Workbench method should I use? Give me a quick summary, the required inputs, next steps, and a trusted in-app link to the relevant Handbook article. Do not create or attach an artifact.

Gemini successfully:

- selected **OpenAPI Discovery**;
- explained the document-first/external-tool operating model;
- identified source repository, repository scope, and branch/commit as required inputs;
- provided sensible next steps;
- avoided claiming that an artifact had been created or attached;
- completed its tool-calling turn and persisted the response.

Server timing for the turn was approximately 49 seconds. The browser showed the completed answer shortly after the slow-run recovery state appeared.

### AI configuration clarity

The Administration → AI Config page now clearly distinguishes:

- **Conversational AI default** — currently Groq · GPT-OSS 120B;
- **Structured-output default** — currently Groq · GPT-OSS 120B.

It also explains where each assignment is used and clarifies that enabling a model does not assign it to a role.

Gemini is shown as enabled with configured credentials and two models. Gemini 3.5 Flash advertises tools, structured output, and reasoning support.

## Findings

### 1. Trusted Handbook navigation is not rendered

**Severity:** Medium  
**Status:** Failed

The test explicitly requested a trusted in-app link. Gemini named **OpenAPI Discovery (Workbench Method)** in emphasized text, but no link or navigation action was present in the response DOM.

This is safer than fabricating a hostname, and the old invalid placeholder URL did not recur. However, the requested navigation behaviour remains incomplete. The user cannot click through to:

`/wiki/openapi-discovery-workbench-method`

The current system prompt explicitly instructs the model to name the destination in plain text because the chat interface cannot turn model-written links into trusted navigation. The remaining fix therefore requires the structured, server-validated navigation contract described in the earlier development request; another prompt-only change cannot provide a clickable trusted route.

**Expected:** A structured `internal_navigation` item validated against an accessible Wiki article and rendered as a clickable in-app action.

### 2. Gemini crosses the slow-run threshold

**Severity:** Low to Medium  
**Status:** Partial pass

The UI progressed from **Working…** to **This is taking longer than expected** and offered **Refresh conversation**. The server action completed in approximately 49 seconds, and the response subsequently appeared without requiring the recovery button.

Positive behaviour:

- the UI no longer remained indefinitely on **Thinking…**;
- a recovery action was offered;
- the final response reconciled automatically;
- the model picker and input recovered after completion.

Remaining concern:

- a normal successful Gemini tool turn looks like a possible failure before the configured provider timeout is reached;
- the recovery button disappeared as the response reconciled, which is correct but creates a short, potentially confusing state transition.

Consider a two-stage message such as **Still working — this request is using tools** before presenting recovery controls, or tune the threshold using observed provider/tool-loop latency. Do not remove the bounded recovery state.

### 3. Gemini embedding model has the wrong default-role badge

**Severity:** Medium — administrative configuration can be misread  
**Status:** Failed

On the Gemini provider page:

- the application-wide assignment correctly says the conversational default is **Groq · GPT-OSS 120B**;
- **Gemini 3.5 Flash** correctly offers **Use for conversational AI** and **Use for structured output**;
- **gemini-embedding-001** is incorrectly labelled **Conversational default**.

An embedding model cannot be the conversational default in this configuration, and the label directly contradicts the authoritative assignment displayed above.

Likely cause: the provider-detail model card is still interpreting a legacy per-model `is_default` flag as the conversational role rather than using the application-wide operation assignment.

**Expected:**

- Generation-model role badges must be derived from the authoritative conversational and structured-output assignments.
- Embedding defaults must be labelled separately, for example **Embedding default**, only where an authoritative embedding assignment exists.
- A legacy provider-local default must not be presented as the application conversational default.

### 4. Response Details control needs focused verification

**Severity:** Low / needs confirmation  
**Status:** Inconclusive

Each Assistant response displayed a **Details** button, but activating the Gemini response's control did not produce provenance content in the captured accessible DOM. No browser console error was recorded.

This may be a visual popover or state interaction that was not exposed in the DOM snapshot, but it should be manually verified. Expected details include the response-specific Gemini provider, `gemini-3.5-flash` model, prompt version, and applicable run metadata.

## Additional observation

The development server logged this provider warning during the Gemini turn:

> Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GOOGLE_API_KEY.

The database migration now configures Gemini with `GEMINI_API_KEY`, so retaining both environment variables creates ambiguity about which credential is authoritative. Standardise on the intended variable or explicitly document the precedence. Do not display either value in the UI or logs.

The application also emitted an unrelated Next.js image warning because the branding image uses `fill` without a `sizes` property.

## Recommended disposition

- Accept the Assistant flow/harness visualization as a successful first read-only implementation.
- Accept Gemini tool-calling support as operational, subject to latency observation.
- Implement structured, validated internal navigation as the next response-view enhancement.
- Correct the Gemini embedding model's default-role label before relying on the provider page for administrative decisions.
- Manually verify and, if necessary, repair the response **Details** display.
- Resolve or document the duplicate Gemini environment-variable precedence.
