# A Method Is Not an Agent Graph

## Why governed AI work needs a procedure, an execution design, and evidence—not just more agents

Someone recently described the Methods in KB Sandbox as “agent graphs.” It is an understandable interpretation. A Method often contains a sequence of activities, dependencies, review points and possible loops. Draw those activities as boxes and arrows, and the result certainly looks like a graph.

But a Method and an agent graph are not the same thing.

A **Method** defines how a class of work should be conducted and judged. A **graph** defines how a particular execution is coordinated. An **agent** is only one possible participant in that execution. The evidence may have been produced by an AI agent, deterministic software, an external platform, a subject-matter expert—or some combination of all four.

That distinction matters if we want enterprise AI to remain understandable, portable and governable.

## Four concepts that are easy to confuse

The simplest way to separate the ideas is to ask what each one contributes.

| Concept | The question it answers |
|---|---|
| Method | What procedure should we follow, what evidence is required, and how will the result be assessed? |
| Graph | In what order—or in what parallel branches—will the work be coordinated and controlled? |
| Agent | Which AI system is permitted to perform a bounded piece of judgment or tool-using work? |
| Evidence | What source, observation or artifact supports the eventual finding and decision? |

A Method is therefore broader than its execution graph. It includes purpose, scope, prerequisites, source requirements, guardrails, expected deliverables, evaluation criteria, implementation boundaries and human approval points.

The same Method might be executed in several ways without ceasing to be the same Method.

For example, an AI model evaluation Method could be performed by:

- a practitioner running several models manually;
- an external platform producing result files that are returned for review;
- a native Workbench runner calling model endpoints;
- a deterministic test harness combined with one evaluator model; or
- a future graph coordinating multiple bounded workers and an independent verifier.

The execution shape changes. The governed question, required evidence and evaluation standard can remain stable.

## What a KB Sandbox Method is today

Today, KB Sandbox Methods are governed Handbook definitions rather than executable agent graphs.

They help a practitioner and Ember—the conversational Workbench assistant—reason about:

1. the user's goal;
2. the Method that fits that goal;
3. the evidence and prerequisites the Method requires;
4. what is already available in the project;
5. what is missing;
6. whether another Method can produce a missing prerequisite;
7. the artifacts that should come back;
8. how those artifacts should be assessed; and
9. where a human decision or external implementation begins.

Ember itself is a single conversational agent with a bounded tool loop. It can clarify a request, retrieve governed Method guidance, check readiness, explain options and help the user navigate the Workbench. It should not be presented as a hidden society of collaborating agents when that is not how it operates.

This is an important form of transparency. A visually impressive multi-agent diagram should not be used to imply capabilities that do not exist—or to add complexity that has not demonstrated value.

## Most work does not have to happen inside KB Sandbox

The Methods catalogue deliberately supports three execution patterns.

### Native Workbench

KB Sandbox performs or coordinates the activity using capabilities available within the Workbench. Examples may include knowledge curation, retrieval evaluation and, in the future, controlled graph execution.

### External Workstream

KB Sandbox defines and governs the work, but a practitioner performs it using an external environment such as Claude Code, ChatGPT, Grok, a local model, LangGraph or another specialist platform. The resulting sources and artifacts return to the project for comparison, assessment, approval and preservation.

### Document-First Engineering

KB Sandbox investigates the problem and produces an evidence-backed specification, review or implementation handoff. A developer, coding agent or delivery platform then performs the consequential implementation elsewhere.

This means the “agent” associated with a project is often external to KB Sandbox. In other cases, there may be no agent at all. A user might upload an approved policy, a test report, an architecture diagram or the output of an external research process.

KB Sandbox does not need to claim authorship of that work. Its role is to preserve where it came from, what it was asked to do, which Method and evidence boundary applied, how the result was assessed, and who approved its use.

## A better name for what enters the Method

Calling every contributor an agent is misleading. A better general term is **participant** or **workstream**.

A participant might be:

- a person;
- an external AI assistant;
- a customer-built agent;
- a model endpoint;
- deterministic software;
- a testing service;
- a research platform; or
- a hybrid human-and-AI process.

The participant produces an output. The output becomes a governed artifact only when its source, scope, provenance and access restrictions are known. It becomes trusted project knowledge only after the applicable evaluation and human approval.

This allows KB Sandbox to compare work without pretending that all work was produced in the same place.

For example, three teams could apply the same OpenAPI Discovery Method:

- one uses Claude Code against a fixed repository commit;
- one uses a different repository-aware AI tool;
- one uses a human architect supported by conventional analysis tools.

The Method provides the common requirements, deliverables and assessment structure. The participants and execution environments differ. Their outputs can still be evaluated against the same evidence boundary.

## A concrete example: collecting logs and metrics

Consider a future **Evidence Collection Agent** that gathers logs and operational metrics from external platforms. This would remove a common source of delay and error: asking a practitioner to copy figures manually from several dashboards into an experiment or assessment.

The request might sound simple:

> Collect the deployment logs, error rates, latency and AI usage metrics required to evaluate this pilot.

The Method, graph, agent and evidence still have different responsibilities.

The **Method** determines which measurements are required, the permitted period, the relevant project boundary, the evaluation criteria and the human authority needed to use the results.

The **graph** coordinates the collection sequence: check authorization, choose the appropriate connector, call the external API, handle pagination, normalize the response, verify completeness, preserve the evidence and request review.

The **agent** helps interpret the request, select appropriate measurements, map unfamiliar fields, identify gaps and summarize anomalies. It should not invent missing observations or recalculate source values through free-form reasoning.

The **evidence** consists of the retrieved logs, metrics, timestamps, collection status and provenance—not merely the agent's written summary.

Platform-specific capabilities could be supplied as connectors or skills for systems such as:

- Vercel deployment and runtime logs;
- Supabase database, authentication and API activity;
- Azure Monitor and Application Insights;
- AWS CloudWatch and CloudTrail;
- regional infrastructure and storage platforms;
- GitHub build and deployment activity;
- AI-provider latency, usage, token and error metrics; and
- customer agents exposing an approved telemetry endpoint.

Most of this collection should remain deterministic. Authentication, API requests, pagination, timestamps, redaction, hashing, calculations and storage should be implemented as inspectable software operations. AI is useful where judgment is genuinely required—for example, translating a Method's evidence requirement into platform-specific metrics or explaining why a requested interval is incomplete.

A simplified execution might be:

```text
Approved evidence request
        ↓
Check project authority and credentials       deterministic
        ↓
Select platform connector or skill            rules / bounded agent
        ↓
Call the permitted APIs                        deterministic tools
        ↓
Normalize and validate the results             deterministic
        ↓
Preserve an immutable evidence snapshot        deterministic
        ↓
Explain anomalies and missing intervals        agent/model
        ↓
Human review or continuation of the Method     authorized person
```

This is a particularly useful demonstration of the distinction. “Collect Logs and Metrics” could be a reusable capability within many Methods, including pilot evaluation, architecture review, RAG strategy evaluation and customer-agent assessment. Its execution may be graph-shaped and may contain an agent, but the governing Method determines why the evidence is being collected, what is sufficient and what decision it is allowed to support.

## Where graph engineering fits

Graph engineering becomes useful when the execution itself needs explicit coordination.

A graph can describe:

- which tasks run sequentially or in parallel;
- which data and artifacts move between stages;
- where authorization is rechecked;
- which node uses an AI model and which uses deterministic code;
- what happens when a node fails;
- how many retries are allowed;
- when an independent verifier is required; and
- where an authorized human must approve continuation.

Not every node should be an agent.

Calculating latency, checking that required evidence exists, enforcing access, recording state and applying a threshold are usually deterministic operations. Forming a hypothesis, interpreting conflicting evidence or judging qualitative output may justify a model. Approving a consequential commercial, legal or architectural decision remains a human responsibility unless an organization has explicitly defined otherwise—and an AI model should not silently become that authority.

A future executable Method could therefore use a graph like this:

```text
Question
   ↓
Check requirements and authority        deterministic
   ↓
Collect approved evidence               retrieval/tools
   ↓
Run two alternative investigations      external or native participants
   ↓
Calculate measurable results            deterministic
   ↓
Evaluate qualitative differences        evaluator model
   ↓
Verify evidence completeness            deterministic verifier
   ↓
Human review and decision                authorized person
```

The graph operationalizes the Method. It does not replace it.

## “Methods are graphs” is a possible future—not the current product

The intended post-pilot direction is that selected Methods may become versioned graph templates.

That could make executions more repeatable and observable. Each graph version could record its nodes, permitted models and tools, input/output schemas, evidence rules, retry limits, failure paths, evaluation criteria and human gates. A completed run would remain attributable to the exact Method and graph version that produced it.

But this direction should be earned through experiments.

A multi-agent graph is not automatically more accurate than a single bounded agent. It may cost more, take longer, fail in more places and make responsibility harder to understand. KB Sandbox should be able to compare a single loop, an iterative critic loop, parallel researchers and an independent-verifier design using the same task set and evidence.

The real question is not:

> Are agent graphs better?

It is:

> For this task, evidence boundary and service target, does the graph improve quality and reliability enough to justify its additional cost and complexity?

## Customer agents remain customer agents

There is also a separate case: an organization may already have its own agent implemented through custom code, an MCP server, LangGraph, Langflow or another platform.

KB Sandbox does not need to become the editing environment for that agent. The external implementation can remain authoritative while KB Sandbox registers a versioned, read-only specification for governance and observability. The Workbench can then associate the agent with permitted sources, tools, evaluations, evidence and approval expectations without taking ownership of its runtime.

This preserves a useful boundary:

- the customer's agent platform builds and runs the agent;
- KB Sandbox records what the agent is allowed to do and how its outputs are evaluated; and
- the Workbench Method defines the governed procedure in which that agent may participate.

## The durable architectural principle

The clearest formulation is:

> **Conversational on the surface; optionally graph-orchestrated underneath; evidence-driven at the output.**

“Optionally” is important. Some work deserves a graph. Some deserves one bounded agent. Some should remain deterministic. Some should be completed by a person or an external platform and returned as evidence.

The Method gives those different execution patterns a stable governance envelope.

That is why a Method is not merely an agent graph. It is the agreement about how work will be prepared, bounded, evidenced, assessed and approved—regardless of where, or by whom, the work is performed.

---

## Suggested Substack note

Are enterprise AI Methods just agent graphs? Not quite. A Method defines the governed procedure, evidence, assessment and human decisions. A graph is one possible execution design, and an AI agent is only one possible participant. The distinction becomes especially important when much of the work is performed in external AI and engineering platforms.
