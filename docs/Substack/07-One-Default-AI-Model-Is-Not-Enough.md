# One Default AI Model Is Not Enough

## Conversation, structured output, retrieval, and evaluation are different jobs

An enterprise AI administration screen may show a list of providers and models with a reassuring label beside one of them: **Default**.

Default for what?

A model that gives a fluent conversational answer may not be the best model for producing schema-valid JSON. An embedding model does not perform the same job as a generation model. A fast low-cost assistant may be unsuitable as an evaluator for a complex assessment.

Treating all of these roles as one global default hides important operational decisions.

## Begin with roles, not provider names

A practical AI system may need several assignments:

**Conversational generation**  
Used for general explanation, exploration, and assistant interactions.

**Structured-output generation**  
Used when a workflow requires output that validates against a defined schema.

**Embedding and retrieval**  
Used to represent documents and queries for semantic search.

**Evaluation or judging**  
Used to assess outputs against criteria, preferably with controls against self-evaluation bias.

**Specialised extraction or classification**  
Used for narrowly defined tasks where a smaller model may be faster and more reliable.

One model may support several roles, but the assignments should remain conceptually separate.

## Enabled is not the same as assigned

Discovering a model from a provider does not prove that it supports every required capability. Enabling it should simply make it available for validated uses.

An administrative interface should distinguish:

- **Availability:** Is the provider configured and the model enabled?
- **Capability:** Has chat, tool use, structured output, or embedding behaviour been verified?
- **Assignment:** Which application role currently uses the model?
- **Health:** Is the configuration operating successfully now?

Without those distinctions, an administrator may believe that checking “Enabled” has changed the assistant, or that selecting a default on one provider affects only that provider when it actually replaces an application-wide assignment.

## Use product language

Labels such as “generation default” and “structured default” expose implementation terminology without explaining the user impact.

Clearer labels would say:

- **Conversational AI default — used by the assistant when no other model is selected**
- **Structured-output default — used by workflows requiring validated schema-constrained output**

Before a change, the interface should identify both the old and new assignment and explain which experiences will be affected.

## Model choice is an operational decision

The best model is not always the largest or most expensive. Selection depends on:

- Accuracy for the actual task
- Tool-use and schema reliability
- Latency
- Context requirements
- Cost and rate limits
- Data-processing constraints
- Regional availability
- Failure and fallback behaviour

These factors should be tested using representative work, not inferred solely from a benchmark or provider description.

NIST’s AI Risk Management Framework presents testing, evaluation, verification, and validation as continuing parts of responsible AI risk management. [NIST AI Resource Center](https://airc.nist.gov/)

## Preserve the model used for each output

Administrative assignments change over time. Historical outputs should retain the provider and model that actually produced them.

This turns model changes into reviewable operational events. Teams can compare failure rates before and after a change, reproduce an evaluation, and avoid falsely relabelling old work with the current default.

## Fallbacks should not be invisible

If a primary model is unavailable, a fallback may keep a service usable. But silently moving to a different model can affect quality, cost, data location, or capability.

Fallback rules should specify:

- Which roles permit fallback
- Which models are eligible
- Whether the user is informed
- What happens when structured validation fails
- How the event is logged and reviewed

For consequential work, failure may be safer than an undisclosed substitution.

## Make the assignment map visible

An administrator should be able to answer these questions from one screen:

1. Which model powers ordinary conversation?
2. Which model produces structured outputs?
3. Which model creates and queries embeddings?
4. Which model evaluates results?
5. Which workflows consume each assignment?
6. What will change if an assignment is replaced?

The phrase “AI model” hides a growing collection of specialised operational roles. An evidence-led AI enterprise should make those roles visible, test them independently, and record which model did the work.

---

*Suggested Substack note:* “Default model” is not enough information. Conversation, structured output, retrieval, and evaluation are different jobs—and administrators should see exactly which model performs each one.

*This article provides general information and does not constitute procurement, security, or compliance advice.*

