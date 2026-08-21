-- Second blog post: a link post pointing at the user's own Substack piece
-- ("Practical AI Architecture Governance in Southeast Asia"), with original
-- KB Sandbox commentary connecting it to the Milestone 7 governance pilot
-- sketch (docs/dev-request-governance-compliance-foundation.md). Seeded as
-- a draft, same as the first post -- published through the admin UI once
-- reviewed, not automatically.
insert into blog_posts (slug, title, excerpt, content, status)
values (
  'practical-ai-architecture-governance-and-kbsandbox',
  'Practical AI Architecture Governance -- and Where KB Sandbox Fits',
  'A new piece on proportionate, evidence-based AI governance -- and a look at how KB Sandbox''s own Milestone 7 governance pilot could put those same ideas into practice.',
  $md$## Governance that scales with risk, not with paperwork

[Practical AI Architecture Governance in Southeast Asia](https://evidenceledai.substack.com/p/practical-ai-architecture-governance?r=3s8sw), a new piece from Evidence-Led AI, makes a case that's easy to agree with in principle and hard to get right in practice: governance should be "enough structure to make decisions visible and accountable, applied in proportion to the risk" -- not a wholesale import of TOGAF, COBIT, or any other framework, but a deliberate combination of the parts that answer real questions:

- What outcome is this change meant to support?
- Who has the authority to approve it?
- What evidence backs the decision?
- Is an exception justified, time-limited, and owned?

The article's six-component model -- scope, decision rights, principles, evidence-based review, transparent exceptions, and documented decisions -- reads less like a framework and more like a checklist for governance any organisation could actually run.

## What that looks like inside KB Sandbox

We've been thinking through the same question from the product side: what would a pilot-sized version of that model look like as real functionality, not a parallel system nobody maintains?

The shape we're circling is deliberately thin:

- A **governed system** is just a pointer to something that already exists in KB Sandbox -- an Agent, a model/provider pairing, a project -- plus the fields governance actually needs: an accountable owner, a stated business purpose, a risk tier.
- A **compliance review** works through a checklist against that governed system and records findings, evidence, and severity -- no automated gate, just a documented pass.
- A **Compliance Snapshot** export reuses the same gather-render-download shape already proven by the Journal feature, so "give management an evidence-backed report" doesn't require inventing new infrastructure -- it pulls current model/provider identity, recent evaluation results, and operation-log activity into the kind of record a review board actually wants to see.
- **Exceptions** are recorded, not hidden: what's non-conformant, why, who owns it, and when it expires.

None of this is built yet -- it's a scoping exercise for a future milestone, sized deliberately small so a first governed system can go through a real review before anything gets locked into a bigger framework. But the fit between the article's argument and what KB Sandbox already has -- audit trails, versioned content, evaluation history -- is close enough that "proportionate governance" looks less like a slogan and more like a to-do list.

Read the full piece: [Practical AI Architecture Governance in Southeast Asia](https://evidenceledai.substack.com/p/practical-ai-architecture-governance?r=3s8sw)
$md$,
  'draft'
);
