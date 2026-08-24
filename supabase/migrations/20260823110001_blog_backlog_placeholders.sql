-- Editorial backlog audit (see
-- docs/dev-request-blog-contributor-workflow-and-editorial-placeholders.md,
-- "Planned editorial backlog"). The 9 posts already seeded by
-- 20260821110001/20260821120001/20260821130001 are left untouched. This
-- migration adds the 3 remaining planned articles, each guarded by a
-- slug-existence check so it is safe to re-run and safe if a full draft is
-- added by hand before this runs.

-- Post #12: a completed source exists, so this must be a full unpublished
-- draft, not a placeholder (dev request's explicit "Required treatment").
insert into blog_posts (slug, title, excerpt, content, status, source_reference)
select
  'before-the-ai-native-sdlc-test-what-is-worth-building',
  'Before the AI-Native SDLC: Test What Is Worth Building',
  'Faster AI-assisted coding does not make an untested assumption more reliable -- it can just help an organisation build the wrong thing sooner. An independent response to Anthropic''s AI-Native SDLC Playbook on the experimental layer that should sit upstream of it.',
  $md$# Before the AI-Native SDLC: Test What Is Worth Building

## Faster coding makes evidence before implementation more important

Anthropic’s recent [AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) describes a software lifecycle in which AI participates across planning, design, building, testing, deployment, and maintenance.

Its central observation is difficult to ignore: when AI can produce code at extraordinary speed, writing the code is no longer necessarily the main constraint. The bottleneck moves to the work around it—deciding what to build, expressing intent, reviewing results, applying policy, and learning from production.

This raises an important question:

**What should happen before an idea enters the software development lifecycle?**

An executive has an idea. A product manager has a theory about a feature. An architect believes one design will be safer, faster, or less expensive than another.

Those ideas may be promising, but they are not yet requirements. They are hypotheses.

## A hypothesis is not a specification

Consider three plausible statements:

> Adding retrieval-augmented generation will materially improve the accuracy of our assistant.

> A smaller local model can meet our quality threshold at a lower operating cost.

> A multi-agent design will improve this process enough to justify its additional complexity.

It is tempting to turn each statement directly into a development request. A team builds a prototype, configures infrastructure, creates tests, and reviews the result. Weeks later, it may discover that the original assumption was wrong—or that the question was too vague to answer.

AI can accelerate that implementation, but faster implementation does not make an untested assumption more reliable. It can simply help an organisation build the wrong thing sooner.

Before an idea becomes an approved intent, it needs a disciplined way to become testable.

## The missing experimental layer

This is the role I see for KB Sandbox: an experimental layer upstream of the SDLC.

A user begins with a theory stated in ordinary language. The Workbench helps turn it into a defined hypothesis with alternatives, prerequisites, success criteria, evidence requirements, and an appropriate method.

The resulting flow is:

**Theory → Hypothesis → Method → Experiment → Evidence → Evaluation → Decision**

The experiment does not always have to run inside one application. Some investigations can be performed in a native workbench. Others may require an external model endpoint, engineering environment, assessment, or specialist review. A document-first workstream can define the work, govern its handoff, and bring the resulting evidence back for evaluation.

What matters is that the work remains traceable.

Depending on the method, an experimental record might preserve:

- the hypothesis and alternatives considered;
- the model, provider, and version used;
- prompts and relevant configuration;
- tools, datasets, and knowledge sources;
- retrieval or execution settings;
- latency, token use, and cost;
- failures and unexpected behaviour;
- outputs and evaluation results;
- human reviews, decisions, and unresolved questions.

The result is not merely another AI-generated opinion. It is a reviewable record of what was tested, what was observed, and why a decision followed.

## From “I think” to “the evidence suggests”

Large language models are excellent partners for exploring possibilities. But asking a model whether an architecture is a good idea is not the same as evaluating that architecture against representative evidence.

The distinction is essential:

- **Reasoning** helps formulate the hypothesis and identify what would need to be true.
- **Experimentation** tests alternatives under stated conditions.
- **Evaluation** compares the results with explicit criteria.
- **Governance** records who accepted the conclusion and what limitations remain.

The decision may be to proceed. It may be to change the hypothesis and test again. It may be that the evidence does not justify further investment.

Preventing a weak idea from becoming a production project can be as valuable as accelerating a strong one.

## An experimental environment for more than developers

AI-assisted development is usually described from the developer’s perspective: generating code, reviewing pull requests, creating tests, and diagnosing failures.

The upstream opportunity is broader.

A product manager should be able to investigate whether retrieval improves a particular workflow without first mastering embedding algorithms. A business leader should be able to frame an inquiry into the operating costs and constraints of local AI without configuring an inference server. An architect should be able to compare approaches before asking a delivery team to implement the preferred one.

The user contributes domain knowledge, organisational context, and the hypothesis. The Workbench contributes structure, reusable methods, evidence discipline, and a durable decision trail.

Engineering becomes involved with a better-defined question—and, ideally, evidence that the question is worth pursuing.

## This is not no-code development

An experimental workbench should not be confused with a tool for bypassing production engineering.

The objective is not:

**Let non-developers build production systems without engineers.**

It is:

**Let people investigate whether an idea deserves to become a production system.**

A conventional path can easily become:

**Idea → Project → Architecture → Engineering → Prototype → Test → Decision**

An evidence-led path moves the decision forward:

**Idea → Controlled investigation → Evidence → Decision → Engineering**

Production software still requires secure design, implementation, testing, operations, and accountable human approval. The difference is that those activities begin with more than enthusiasm and a plausible story.

## A richer handoff to the AI-native SDLC

Anthropic’s playbook begins by capturing an idea as an intent artifact, then moving through connected stages in which accepted artifacts trigger the next activity. An upstream experimental layer can make that first accepted intent substantially richer.

The combined lifecycle looks like this:

**Management, product, or architecture question**

↓

**Hypothesis → Method → Experiment → Evidence → Evaluation → Decision**

↓

**Validated intent**

↓

**Plan → Design → Build → Test → Deploy → Maintain**

Instead of telling an AI development agent only, “Build this idea,” the organisation can provide:

- the original hypothesis;
- the alternatives examined;
- the evidence collected;
- the method and evaluation criteria;
- the constraints and failure cases discovered;
- the reasons one approach was selected;
- the open questions that remain.

That is better context for the AI agent and for every human accountable for the system it helps produce.

## Production closes the loop

The experiment should not disappear when software reaches production.

Real users behave differently from test users. APIs fail. Costs and latency change. Models are replaced. Policies evolve. An assumption that was sound six months ago may no longer hold.

Production observations can become new evidence:

**Observe → New evidence → New hypothesis → New experiment**

A production incident can become a permanent evaluation case. A newly available model can trigger a rerun of the original comparison. A material cost change can cause an architecture decision to be reconsidered.

The wider lifecycle becomes:

**Ask → Experiment → Learn → Build → Observe → Experiment again**

## From AI-native development to evidence-led decision-making

Anthropic’s AI-native SDLC offers a practical vision for moving trusted intent through software delivery faster while retaining human judgement at the gates.

KB Sandbox addresses the question immediately before that lifecycle:

**Should this intent become software in the first place?**

As implementation becomes cheaper, that question becomes more important, not less. Organisations gain the power to explore more ideas—but also to produce more software whose value, risk, or assumptions were never properly tested.

The next step in AI-native work is therefore not only faster development. It is stronger experimentation before committing to development.

**Claude can help teams build faster. An evidence-led workbench can help them decide what is worth building.**

---

*Suggested Substack note:* AI can help us build software faster—but it can also help us build the wrong thing faster. Before an idea becomes an AI-native development project, treat it as a hypothesis and ask what evidence would justify the investment.

*This is an independent interpretation of Anthropic’s AI-Native SDLC Playbook. Anthropic has not reviewed or endorsed KB Sandbox. This article provides general information and does not constitute architecture, security, or compliance advice.*
$md$,
  'draft',
  'docs/Substack/08-Before-the-AI-Native-SDLC.md'
where not exists (select 1 from blog_posts where slug = 'before-the-ai-native-sdlc-test-what-is-worth-building');

-- Post #10: placeholder only -- the Handbook source needs adaptation for a
-- public audience before it becomes a full draft (dev request's editorial
-- note: distinguish execution harnesses from governance harnesses, avoid
-- exposing internal implementation details). Content here is a short
-- editorial brief, not the internal Handbook text.
insert into blog_posts (slug, title, excerpt, content, status, source_reference)
select
  'agent-harnesses-operating-and-governing-enterprise-ai-agents',
  'Agent Harnesses: Operating and Governing Enterprise AI Agents',
  'A model is not an agent, and an agent is not a harness. Placeholder for an article on the identity, access, context, and provenance controls that turn an AI capability into something an enterprise can actually operate and govern.',
  $md$**Editorial placeholder -- not yet a full draft.**

This article will adapt the internal Workbench Handbook article on agent harnesses (`docs/workbench-handbook-agent-harnesses.md`) for a public audience.

Planned scope:

- Distinguish model, agent, workflow, and agent harness as separate concepts.
- Explain the core harness responsibilities: identity and access, prompt/configuration versioning, context and memory selection, model routing, and tool guardrails.
- Emphasise that authorisation must be enforced when data is retrieved or a tool acts, not merely described in a prompt.
- Adapt the framing for an external, vendor-neutral audience and avoid exposing internal implementation details or naming internal system components directly.

An administrator or curator should turn this brief into a full draft before submitting it for review.
$md$,
  'draft',
  'docs/workbench-handbook-agent-harnesses.md'
where not exists (select 1 from blog_posts where slug = 'agent-harnesses-operating-and-governing-enterprise-ai-agents');

-- Post #11: placeholder only -- the source is an internal ADR and must be
-- converted into a vendor-neutral architecture discussion, not published
-- directly (dev request's explicit editorial note).
insert into blog_posts (slug, title, excerpt, content, status, source_reference)
select
  'why-enterprise-ai-may-start-with-dedicated-customer-instances',
  'Why Enterprise AI May Start with Dedicated Customer Instances',
  'Shared multi-tenant SaaS is not always the right first architecture for AI products handling sensitive governance evidence. Placeholder for a vendor-neutral discussion of dedicated-instance-first deployment and the SaaS-ready path underneath it.',
  $md$**Editorial placeholder -- not yet a full draft.**

This article will convert the internal architecture decision record (`docs/architecture-decisions/ADR-0001-dedicated-instance-first-deployment.md`) into a vendor-neutral discussion for a public audience.

Planned scope:

- Why AI products that store governance evidence, assessments, and organisational context carry higher isolation stakes than typical SaaS data.
- The trade-off between shared multi-tenant SaaS (lower cost, faster onboarding, but a single RLS/authorization defect can cross customers) and dedicated-instance deployment.
- Why a dedicated-instance-first approach does not have to mean customer-specific forks -- one versioned product, multiple deployment modes.
- Preserving a credible future path to shared SaaS without adopting its risk profile before the product needs it.

Publish only as a general industry discussion -- this must not read as, or reference, an internal decision record, and should not name specific internal deployment mechanics.
$md$,
  'draft',
  'docs/architecture-decisions/ADR-0001-dedicated-instance-first-deployment.md'
where not exists (select 1 from blog_posts where slug = 'why-enterprise-ai-may-start-with-dedicated-customer-instances');
