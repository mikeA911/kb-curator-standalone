# Development Request: Make AI Model Roles Clear in Admin

**Status:** Proposed  
**Created:** 20 August 2026  
**Area:** Admin → AI Providers  
**Priority:** High usability / low-to-medium implementation effort

## Summary

The AI provider administration pages currently label models as `default` and `default (structured)`. These labels expose implementation concepts without explaining which product experiences use each model. An administrator cannot readily tell which model powers the conversational Assistant, which model powers structured-output workflows, or whether defaults are global or provider-specific.

Update the AI administration experience so model roles, current assignments, and their effects are explicit before an administrator changes them.

## Current behavior

- A model with `is_default = true` and `model_type = generation` is displayed as **default**.
- This generation default is global across providers, not a separate default within each provider.
- The Workbench Assistant uses this generation default when the user has not selected a different model for the next message.
- A model with `is_default_structured_output = true` is displayed as **default (structured)**.
- The structured-output default is an independent global assignment and may be a different model or provider.
- Buttons labelled **Set as default** and **Set as default (structured)** do not explain the affected features.
- Because each provider has a separate detail page, the administrator cannot easily see that changing a model on one provider replaces a global assignment currently held by another provider.

## User problem

An administrator reviewing models such as GPT-OSS 120B, GPT-OSS 20B, and Qwen cannot confidently answer:

1. Which model will the conversational Assistant use by default?
2. Which model will be used when the application requests validated structured output?
3. Does changing a default affect only this provider or the whole application?
4. Can a model be enabled without being assigned either role?
5. Which workflows currently rely on each role?

This makes routine configuration risky and makes it harder to compare or test newly discovered models.

## Requested change

### 1. Add a global “Model assignments” summary

At the top of the AI Providers area, and preferably also on each provider detail page, show two clearly named assignments:

| Role | Current model | Explanation |
|---|---|---|
| **Conversational AI default** | Provider + model | Used by the Workbench Assistant and other general text-generation features when no model is explicitly selected. |
| **Structured-output default** | Provider + model | Used by workflows that require output conforming to a defined schema. |

The summary must show assignments across all providers, even when the administrator is viewing one provider's detail page.

Include the following note:

> These are application-wide assignments. Changing one here replaces the current assignment, which may belong to another provider. Enabling a model only makes it available; it does not assign either role.

### 2. Replace ambiguous labels and actions

Change model badges and buttons as follows:

| Current text | Replacement text |
|---|---|
| `default` | `Conversational default` |
| `default (structured)` | `Structured-output default` |
| `Set as default` | `Use for conversational AI` |
| `Set as default (structured)` | `Use for structured output` |

Add concise help text or tooltips:

- **Conversational default:** “Used by the Assistant unless the user chooses another model for the next message.”
- **Structured-output default:** “Used when a feature requires validated, schema-constrained AI output.”

Avoid describing the first assignment as merely “generation.” That is an implementation category and does not tell an administrator which user-facing capability it controls.

### 3. Confirm global replacement before changing an assignment

When an administrator selects either assignment, show a confirmation that names both models and providers, for example:

> Change the Conversational AI default from Groq / GPT-OSS 20B to Groq / GPT-OSS 120B? This changes the application-wide default used by the Workbench Assistant when no per-message model is selected.

The structured-output confirmation must similarly state that the model supports structured output and that the change is application-wide.

### 4. Show model capabilities separately from assignments

Each model row should distinguish:

- availability: enabled/disabled and operational status;
- capabilities: chat, tool calling, structured output, embeddings, or other capabilities represented in the registry;
- assignments: Conversational default and/or Structured-output default.

Do not infer a capability merely because a provider returned a model during discovery. Display only capabilities recorded and validated by the application.

### 5. Document actual feature consumers

Add an expandable **Where is this used?** explanation for each assignment.

For the initial implementation:

- Conversational AI default: list the Workbench Assistant and any other code paths verified to resolve the default generation model.
- Structured-output default: list the currently implemented workflows verified to resolve the independent structured-output model.

The implementation task should include a code-path audit so this list reflects actual behavior rather than assumptions. If a complete dynamic consumer registry is disproportionate, maintain a small, tested UI description alongside the resolver definitions.

## Out of scope

- Automatically choosing a model based on prompt complexity.
- Benchmarking GPT-OSS, Qwen, DeepSeek, or OpenAI models.
- Changing the currently assigned defaults as part of this UI request.
- Adding provider credits or API keys.
- Treating every enabled model as eligible for every role.

## Acceptance criteria

1. An administrator can identify the conversational and structured-output defaults without opening every provider page.
2. Both assignments display provider and model names.
3. The UI explicitly states that assignments are application-wide.
4. The conversational role is described as the Workbench Assistant fallback when there is no per-message selection.
5. The structured-output role is described in plain language and is assignable only to a model recorded as supporting structured output.
6. Model badges and action labels use the new role-specific wording.
7. Changing an assignment presents a confirmation naming the old assignment, new assignment, affected role, and application-wide scope.
8. Enabled/status controls remain clearly separate from role assignment controls.
9. Tests cover the assignment summary, labels, confirmation behavior, cross-provider replacement, and capability restriction.
10. Existing database guarantees—one default per model type and one independent structured-output default—remain intact.

## Suggested validation scenario

Using the current Groq configuration:

1. Display GPT-OSS 20B as the current **Conversational default**.
2. Display GPT-OSS 120B as the current **Structured-output default**.
3. Display Qwen 3.6 27B as enabled but unassigned, with only its recorded capabilities shown.
4. Select **Use for conversational AI** on GPT-OSS 120B.
5. Verify that the confirmation explains that GPT-OSS 20B will be replaced globally and that the Assistant will use GPT-OSS 120B when no per-message model is selected.
6. Cancel and verify that no configuration changes.

## Implementation note

The current behavior is represented by `ai_models.is_default` for the generation model and the independent `ai_models.is_default_structured_output` flag. The change should improve the administrative language and visibility without merging these assignments or weakening their existing database constraints.
