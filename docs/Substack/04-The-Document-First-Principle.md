# The Document-First Principle for Enterprise AI

## Let AI prepare the work before allowing it to perform the work

The current enthusiasm for AI agents often assumes that greater autonomy is automatically better. If a system can analyse a repository, why not let it change the code? If it can draft a policy, why not let it publish? If it can identify an account problem, why not let it alter the account?

Sometimes that is appropriate. Often it is an unnecessary leap.

A document-first approach creates a useful intermediate boundary: the AI investigates, compares, evaluates, and prepares an evidence-backed handoff. A human or approved specialist environment then performs the consequential action.

## Analysis and execution are different authorities

An AI system may have enough information to recommend a change without having the authority to make it.

That distinction is familiar outside AI. An auditor identifies a control weakness but does not silently rewrite production systems. An architect prepares a design but does not personally approve every investment. A clinician’s analysis and a patient’s consent remain different steps.

AI interfaces can blur this distinction because conversation makes recommendation and execution feel continuous. The system should restore the boundary explicitly.

## What a document-first handoff contains

A useful implementation handoff is more than a transcript or a list of suggestions. It should be self-contained enough for another person or tool to review and act upon.

It may include:

- Context and objective
- Evidence examined
- Scope and exclusions
- Assumptions and constraints
- Findings and their confidence
- Proposed approach
- Risks and alternatives
- Required tests or verification
- Decisions still requiring a person
- Provenance: sources, system, model, and date

For software work, it might become a code-review report, refactoring plan, test plan, or implementation specification. For governance work, it might become an assessment, exception request, decision record, or review pack.

## Why the boundary improves safety

OWASP describes excessive agency as a risk arising from excessive functionality, permissions, or autonomy in LLM-based systems. Its mitigations include minimising available tools and requiring human approval for high-impact actions. [OWASP: Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

The document-first pattern helps because it:

- Separates analysis from authority
- Gives reviewers time to inspect evidence
- Makes assumptions visible before execution
- Creates a durable record
- Allows a specialist tool to work within its proper controls
- Supports staged increases in autonomy

It also reduces a subtler risk: the system pretending that work was completed when it only described what should be done.

## It is not a rejection of agents

Document-first does not mean document-only. It is a maturity pattern.

An organisation can begin with AI-generated analysis and human execution. Later, well-understood actions may become executable after explicit approval. Low-risk and reversible tasks may eventually run automatically, while high-impact changes continue to require review.

The boundary can be adjusted according to:

- Impact and reversibility
- Quality of available evidence
- Strength of validation
- User and system permissions
- Regulatory or contractual obligations
- Monitoring and rollback capability

The question is not “Can the model call the tool?” It is “Under what evidence, authority, and controls should this action occur?”

## Documents create organisational memory

Chat is useful for exploration, but important decisions are easily lost inside long conversations. A reviewed artifact can become organisational knowledge: versioned, cited, approved, and discoverable.

The artifact also supports accountability. The OECD AI accountability principle emphasises traceability across datasets, processes, and lifecycle decisions so AI outputs can be analysed and questions can be answered. [OECD accountability principle](https://oecd.ai/en/dashboards/ai-principles/P9)

## A practical operating pattern

A simple document-first lifecycle looks like this:

1. Understand the goal
2. Identify the appropriate method
3. Gather and assess evidence
4. Produce findings and options
5. Prepare a structured handoff
6. Obtain human review or approval
7. Execute in an authorised environment
8. Verify the outcome and preserve the record

This does not eliminate mistakes. It makes them easier to detect before they become operational changes.

Enterprise AI should not be measured only by how many actions it can perform. Sometimes the more valuable capability is knowing when to stop, assemble the evidence, and hand the decision back to a responsible person.

---

*Suggested Substack note:* Before giving an AI agent more tools, consider a simpler step: require it to produce an evidence-backed handoff that a person can review.

*This article provides general information and does not constitute security, legal, or compliance advice.*

