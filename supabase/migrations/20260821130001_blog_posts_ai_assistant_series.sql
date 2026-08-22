-- Seven-post series adapting internal Assistant/deployment design notes into
-- original public-facing articles. Deliberately excludes internal roadmap,
-- current architecture, raw test reports, database schema, security
-- configuration, and acceptance criteria -- those informed the writing but
-- are not published directly. Seeded as drafts, reviewed before publishing
-- like every other post.

insert into blog_posts (slug, title, excerpt, content, status)
values (
  'your-ai-assistant-should-tell-you-which-model-answered',
  'Your AI Assistant Should Tell You Which Model Answered',
  'Why model identity, message-level provenance, and transparent switching matter in enterprise AI.',
  $p1$## The problem with "the assistant said..."

Ask a colleague where a number came from and "the spreadsheet told me" is not a satisfying answer. The same is true for AI. As AI assistants move from novelty chat windows into tools people rely on for real decisions, "the assistant said..." stops being sufficient. Which assistant? Running on which model? Configured by whom? Answering with what information?

Most consumer chat products hide this by design -- one brand, one model, no visible seams. Enterprise AI tools don't have that luxury. Organisations already run more than one model for good reasons: cost, latency, capability, vendor risk, and simple experimentation. When several models can plausibly answer the same question, "the assistant" is no longer a single, stable thing a person can develop trust in. The identity behind the answer has to become visible.

## Provider and model identity, not just "AI"

The first fix is unglamorous: say who is answering. Not "AI," not "the assistant" -- the actual provider and model, surfaced in the interface the same way a byline identifies an author. A response from a fast, inexpensive open model and a response from a larger reasoning model may both be useful, but they are not interchangeable, and a reader evaluating the answer benefits from knowing which one they're looking at.

This sounds obvious until you try to build it. Model identity has to be resolved from a live, editable configuration -- providers get added, models get swapped, defaults change -- rather than hard-coded into the interface. The label a user sees has to reflect the model that actually ran, not the one that happens to be configured as default today.

## Recording the model behind every reply

Visible identity for the current response is only half the story. A conversation is a history, and history should stay honest. If an administrator changes the default model next week, every earlier message in every existing conversation should still say, correctly, which model produced it at the time.

That means model identity isn't just something to display -- it's something to record, message by message, as a permanent fact about that specific response. Without that, a conversation becomes retroactively unreliable: scroll back far enough and the interface starts silently misattributing old answers to whatever model happens to be configured now. For anything that gets reviewed later, that's not a cosmetic gap, it's a provenance failure.

## Switching models without rewriting history

Once model identity is recorded per message, a useful property falls out for free: a single conversation can legitimately span multiple models. A user might start with a fast default, switch to a stronger model for a hard follow-up, and switch back -- and each message keeps its own accurate record of what answered it. Nothing about the conversation needs to be rewritten or normalized to make that consistent.

This also protects two things that should stay independent: the model doing the talking and the model doing the retrieval underneath it. Changing which model generates responses shouldn't silently change which embedding model is finding the source material -- those are different jobs, and conflating them under one "the AI" abstraction is exactly the kind of hidden coupling that makes systems hard to trust.

## Showing your work: sources, tools, and activity

Identity is necessary but not sufficient. A trustworthy assistant should also be willing to show a little of its work: which knowledge it searched, which tools it used, what it actually did between "thinking" and answering. Not a raw log of internal reasoning -- that's neither useful nor appropriate to expose -- but a plain description of meaningful actions: it searched the handbook, it checked available assessments, it retrieved project context.

This is a deliberately narrow kind of transparency. The goal isn't to turn every response into a debugging console; it's to give a reviewer enough of a trail to sanity-check an answer without having to take it entirely on faith.

## Why provenance matters for review, audit, and trust

None of this matters much for an assistant answering trivia. It matters a great deal for one that's being used to investigate a legacy system, compare architectural options, or draft something a human will later sign off on. In that setting, "which model said this, using what information, and when" isn't a nice-to-have -- it's the difference between an answer you can defend in a review and one you can't.

Provenance is what turns an AI assistant from a black box you either trust or don't into a tool whose outputs can actually be checked. That's a small feature list -- visible identity, per-message provenance, independent model switching, a light trail of activity -- but it changes what kind of relationship a user can have with the tool. Not "the assistant said," but "the model said, having searched the platform knowledge base, on this date, in this conversation." That's a sentence you can actually stand behind.
$p1$,
  'draft'
);

insert into blog_posts (slug, title, excerpt, content, status)
values (
  'conversation-history-is-not-ai-memory',
  'Conversation History Is Not the Same as AI Memory',
  'Designing short-term context, conversation continuity, and long-term memory without confusing users.',
  $p2$## Working context versus stored history

"Your conversations are saved" and "the AI remembers your conversations" sound like the same promise. They aren't, and conflating them is one of the more common ways AI products quietly overpromise.

Saved history is a record: a transcript sitting in a database, retrievable on request, exactly as it was written. Working context is something narrower and much more temporary: whatever slice of that history actually gets sent to the model on a given turn. A long conversation cannot simply be replayed in full every time -- models have finite context windows, and even where the words would fit, spending most of a request's budget re-reading old messages is not a good use of it. So a real system has to choose what a model sees on any given turn, and that choice is a design decision, not an implementation detail to wave away.

The honest version of "we save your history" is: everything you wrote is retrievable by you, and a bounded, relevant slice of it -- plus a compact summary of what came before -- is what the model actually reads on each turn. That's a more modest claim than "the AI remembers everything," but it's the one that's actually true, and it's the one worth making.

## Summarised conversation memory

Between "the last few messages" and "the entire transcript" sits a useful middle layer: a rolling summary of the conversation so far. Instead of re-reading pages of back-and-forth, a good system periodically compresses what's been established -- the user's actual goal, decisions made and why, open questions, what's been produced -- into something compact enough to carry forward cheaply.

This is memory in a narrow, useful sense: memory of *this conversation*, refreshed as it grows, never substituting for the real transcript underneath it. If summarisation ever fails or falls behind, the conversation should degrade gracefully to recent-message context rather than break -- a compression layer is allowed to be imperfect; it is not allowed to be a single point of failure.

## Long-term retrievable knowledge

The much bigger promise -- and the one products reach for too casually -- is memory that spans conversations: the assistant recalling something from three weeks ago without being told. That's a genuinely different capability from saving a transcript, and it deserves to be treated as a separate, deliberately built feature rather than an implied side effect of "we keep your history."

Done well, cross-conversation memory should behave like evidence, not folklore: retrieved sparingly, within its own bounded budget, always traceable back to where it came from, and never presented with more confidence than it deserves. Not every past statement earns equal trust, either -- something a user explicitly confirmed should outrank something the assistant merely inferred, and newer confirmed information should be able to supersede older information without silently deleting the record underneath it.

## Corrections and deletion

Memory that can't be corrected is a liability, not a feature. If an assistant forms an impression that turns out to be wrong -- or right at the time but later superseded -- there has to be a real path to fixing it, one that a user doesn't need to reverse-engineer. And if a user deletes a conversation, that deletion should actually mean something: whatever was derived from it -- summaries, retrievable memory, anything downstream -- should stop influencing future answers too. A memory system where deleting the source doesn't delete its fingerprints isn't really honoring the delete.

## User disclosure and consent

None of this needs to be a secret, but it does need to be described accurately, in the product, in plain language -- not buried in a settings page or a terms document nobody reads. A user should be able to tell, from the interface itself, what's actually true: that their conversations are saved and can be revisited, whether the assistant is drawing on anything beyond the current conversation, and roughly what that means for how their words might resurface later.

The failure mode worth naming directly: telling a user "this will help future conversations" when the product doesn't yet do anything of the kind. Saved history, conversation continuity, and cross-conversation memory are three different claims. Make only the ones that are actually true, and update the wording the moment the underlying behavior changes -- not before.

## Preventing one user's history from leaking to another

Last, and non-negotiable: whatever gets remembered, summarised, or retrieved has to stay strictly within the boundary of the person who created it. In a shared, multi-user product this isn't a nuance -- it's the whole game. Every layer of memory, from the raw transcript to a compressed summary to a retrievable long-term fact, needs to carry its ownership with it, enforced the same way the underlying data is protected, not assumed because "it's probably fine."

Get that boundary right, and everything above it -- summaries, retrieval, corrections -- is just refinement. Get it wrong, and none of the rest matters.
$p2$,
  'draft'
);

insert into blog_posts (slug, title, excerpt, content, status)
values (
  'why-ai-responses-need-structure-not-just-markdown',
  'Why AI Responses Need Structure, Not Just Markdown',
  'Separating conversation, summaries, next actions, citations, documents, and trusted links.',
  $p3$## Conversational text versus structured response data

We recently fixed something almost embarrassingly small: an AI assistant's replies were showing up full of stray asterisks and pound signs instead of real formatting. Headings looked like raw Markdown syntax. Bullet points looked like dashes and dots instead of a list. The model was writing perfectly good Markdown; the interface just wasn't rendering it. It was a quick fix, and also a useful reminder of something bigger: text formatting is the easy part of the problem. The harder part is that a conversational reply and the useful *thing* the user actually wanted out of it are not the same shape of data, and treating them as one flat string of prose caps how useful an assistant interface can be.

A good response to "which approach should I use here?" isn't just an essay. It's an answer, plus maybe a one-line summary, a couple of sources, a short list of what's still needed, and a next step or two the user can act on. Cramming all of that into paragraph form and hoping the user reads carefully is a UI failure dressed up as writing style.

## Quick summaries and next actions

Long, well-reasoned answers are often exactly what's needed -- and also exactly the kind of thing a busy person skims past looking for the actual outcome. A short, separately rendered summary alongside the full explanation solves both problems at once: the reasoning stays available for whoever wants it, and the headline doesn't get lost inside it.

The same goes for next steps. "Here's what I'd do" is more useful as a small, scannable list than as the last sentence of paragraph four. None of this replaces the conversational reply -- it sits alongside it, pulling out the parts that deserve to be seen at a glance rather than read for.

## Citations and generated documents

Once an assistant is doing real research -- searching internal knowledge, checking prior work, pulling in project context -- its claims should come with receipts. Not links invented after the fact to look credible, but citations traceable to what the assistant actually retrieved and used while forming that specific answer. If a source wasn't part of the evidence behind a claim, it shouldn't be presented as if it were.

The same discipline applies to documents. An assistant that says "I've created a plan for you" needs that plan to actually exist as a real, openable thing -- not a description of a document that never got written. A proposed document and a produced one are different states, and the interface should never blur them into looking the same.

## Trusted application navigation

An assistant that understands an application well enough to talk about it should also be able to point at it -- "here's the relevant page," "here's where that lives." But a language model proposing a URL is not the same as a validated, safe link. The model can identify *intent* -- which project, which article, which setting -- while the application itself resolves that intent into an actual, permission-checked destination. A link a user can click should never be something the model typed out freely; it should be something the surrounding system built and vouched for.

## Artifact collections

Over a longer conversation, useful things accumulate: documents produced, sources cited, decisions made, loose ends still open. Buried across dozens of messages, that accumulation is only as accessible as someone's patience for scrolling back. Collected into one place, it becomes something closer to a working file for the conversation -- the durable outputs, distinct from the back-and-forth that produced them.

That distinction matters more than it sounds: routine "here's a link to that page" navigation isn't an artifact, and treating everything the assistant ever points at as equally durable output just recreates the clutter problem one level up. The collection is only useful if it stays a curated view of what actually matters.

## Graceful fallback when structured generation fails

Structure is a layer added on top of a working conversational reply, not a replacement for one -- and it has to be allowed to fail without taking the reply down with it. Getting a model to reliably return well-formed structured output alongside natural conversation is a genuinely hard problem, and any implementation of it will occasionally produce something malformed, incomplete, or from a provider that doesn't support it well at all.

The right response to that failure is quiet degradation: show the plain conversational answer, drop the structured extras for that one response, and move on. A user should never see raw formatting artifacts or lose the answer entirely because the nicer version of it didn't come together. Structure should make good answers better. It should never be a single point of failure standing between a user and a working reply.
$p3$,
  'draft'
);

insert into blog_posts (slug, title, excerpt, content, status)
values (
  'the-document-first-principle-for-enterprise-ai',
  'The Document-First Principle for Enterprise AI',
  'Why an AI assistant should prepare evidence, plans, and reviews before it changes operational systems.',
  $p4$## Advice is different from execution

There's a meaningful line between an AI system that tells you what to do and one that goes and does it. Much of the current excitement about "agentic AI" is really excitement about erasing that line -- letting a model not just recommend a change but make it, commit it, deploy it. That's a legitimate direction for some tools. It is also, for a lot of enterprise work, exactly the wrong default.

The alternative is what we've come to think of as the document-first principle: an AI assistant's job, for anything consequential, is to understand the situation, investigate the evidence, compare options, and produce a reviewed artifact a human can act on -- not to reach into a live system and act on it directly. Advice, however well-reasoned, is not the same thing as execution, and treating them as interchangeable is where a lot of AI incidents actually come from.

## Plans create a review boundary

A plan sitting in a document is inherently reviewable in a way that an autonomous action already taken is not. Before anything changes, there's a moment where a human can read what's proposed, ask why, push back, or simply say no -- and that moment only exists because the AI stopped at "here's what I'd do" instead of continuing on to "and I did it."

This isn't a defensive design because AI is untrustworthy in some special way. It's the same reason a junior engineer's pull request gets reviewed before it merges, or a proposal goes to a committee before budget moves. The review boundary is what makes an action accountable rather than merely explainable after the fact.

## Humans remain accountable

Somebody has to own the consequences of a change, and "the AI decided" is not an answer anyone actually wants to give when something goes wrong. Keeping a human in the loop for consequential actions isn't a limitation bolted onto the AI to make people feel better -- it's a straightforward statement of where accountability actually lives. The AI can do excellent analysis. It cannot be held responsible for what happens next. Only a person can be, so a person should be the one who decides.

## Documents preserve rationale

A side benefit of document-first design that's easy to undervalue: the artifact itself becomes a record of *why*, not just *what*. Six months later, "why did we do it this way" is a much easier question to answer when there's a document that laid out the evidence, the alternatives considered, and the reasoning behind the choice -- rather than only a diff or a changelog entry that shows the result with none of the thinking behind it.

That rationale is worth almost as much as the decision it supports. It's what lets the next person -- human or AI -- pick the work back up without re-litigating settled questions from scratch.

## Autonomous action should require explicit authority

None of this is an argument that AI should never act directly on a system. It's an argument that it shouldn't do so by default, silently, or by accident. Direct action is a capability that should be explicitly granted, scoped, and visible -- not something that falls out of an assistant simply being capable enough to attempt it. The default posture for anything with real consequences should be "produce something a human reviews," with direct execution reserved for cases where that authority has been deliberately and narrowly extended.

## The boundary can expand gradually as trust is earned

Document-first isn't meant to be a permanent ceiling on what AI is allowed to do -- it's a sensible starting boundary that can move as trust is actually earned, one narrow capability at a time, rather than all at once because a model demo looked impressive. An organisation that's watched an AI system produce consistently sound, well-evidenced plans in one specific area has a real basis for cautiously extending it more direct authority there. An organisation that hasn't watched anything yet does not.

Start with advice. Let plans do the work of building trust. Expand execution deliberately, narrowly, and only where the evidence supports it. That ordering -- not the reverse -- is what makes AI in serious operational settings something people can actually rely on, instead of something they have to constantly double-check.
$p4$,
  'draft'
);

insert into blog_posts (slug, title, excerpt, content, status)
values (
  'a-private-ai-journal-should-belong-to-the-individual',
  'A Private AI Journal Should Belong to the Individual',
  'Using conversation history to support reflection without turning personal memory into employer surveillance.',
  $p5$## Remembering work over one, three, or six months

Ask most people what they actually did at work three months ago and you'll get a shrug, maybe a guess, occasionally an accurate answer pieced together from calendar invites. Knowledge work is full of activity that never gets consolidated anywhere -- conversations had, decisions made, small problems solved and forgotten the moment the next one showed up. None of it disappears exactly; it just scatters across messages, documents, and a memory that wasn't built to hold six months of detail.

An AI assistant that already has a record of what someone worked on is sitting on the raw material for something genuinely useful here: not a productivity dashboard, but something closer to a journal -- a document that helps a person actually remember their own recent work.

## AI-assisted reflection and reminiscence

The interesting design question isn't "can AI summarise activity" -- it obviously can -- it's what kind of summary is worth reading. A flat activity log is data, not reflection. A reflective narrative -- what you were working on, what you decided and why, what you learned, what's still open, what you might want to revisit -- is something closer to what a good journal actually reads like.

That tone matters. The same underlying history rendered as a performance report feels like being evaluated; rendered as a personal narrative, it feels like being helped to remember. Same facts, completely different relationship to the reader. Getting that right also means being honest about the line between the two: a good version clearly distinguishes recorded fact from AI-generated reflection, rather than blending them until the reader can't tell which is which.

## User ownership

The single most important design decision here isn't the writing style -- it's who the document belongs to. A journal generated from someone's own conversations and work is, by default, theirs. Not the organisation's, not their manager's, not something that shows up in an admin dashboard because the underlying activity happened on a work account.

This matters more than it might first seem, because the instinct in a workplace tool is often the opposite: everything generated on the platform belongs to the platform, visible to whoever administers it. A reflective journal built from someone's own conversation history breaks that pattern deliberately, because a document meant to help a person think doesn't work if the person suspects it's also being read by someone else.

## Employer exclusion by default

So the practical rule has to be blunt: an employer, a manager, or an ordinary administrator should not be able to view, list, or generate another person's journal through the product, full stop. Access to the underlying platform, or to the projects a person worked on, is not the same as access to what that person privately generated to reflect on their own time. Those need to stay two separate permission boundaries, and the second one defaults to closed.

## Explicit sharing

None of this means a journal can never be shared -- people share reflections with managers, mentors, and collaborators all the time, and there's real value in that. It means sharing should be something the individual actively chooses, not something implied by the platform they happen to be using. The simplest honest version of this: the person downloads their own document and decides, outside the product, what happens to it next. Anything more automatic than that needs to be its own deliberate, revocable, visible feature -- never a side effect of organisational membership.

## Generating rather than permanently storing journals

There's also a quieter privacy benefit in *how* a journal gets produced, not just who can see it. A journal generated on demand -- assembled from source history, rendered, handed to the user, then discarded -- carries a much smaller footprint than a permanent journal archive sitting on a server indefinitely. If nothing is retained beyond the moment of generation, there's nothing sitting around to leak, get subpoenaed, or quietly become a second copy of a person's private reflections that nobody remembers exists.

## Separating a journal from the assistant's future memory

Last, a boundary worth being explicit about: a generated journal should not quietly become part of what the assistant remembers going forward. It's a one-way export of the user's own history, not a new input back into the system. If a journal's reflective language started shaping how the assistant talks to that person in future conversations, or got indexed and searched alongside everything else, it would stop being a personal document and start being another data source about the user -- exactly the thing a private journal is supposed to be exempt from becoming.

A good journal helps someone remember. It shouldn't also, invisibly, help a system profile them.
$p5$,
  'draft'
);

insert into blog_posts (slug, title, excerpt, content, status)
values (
  'private-ai-deployment-is-an-operating-model',
  'Private AI Deployment Is an Operating Model, Not a Docker File',
  'What organisations take responsibility for when they move AI, data, authentication, and storage into their own cloud.',
  $p6$## Managed cloud versus private cloud

"Can we run this privately?" sounds like a yes-or-no infrastructure question. It isn't. Moving an AI application from a managed cloud service to a private deployment doesn't just relocate where the code runs -- it relocates who is responsible for keeping the whole thing alive. That's a genuinely different question, and it's worth answering honestly before treating "private" as a simple checkbox.

In a managed setup, an enormous amount of unglamorous, safety-critical work is quietly being done on your behalf: database patching, backup verification, certificate rotation, uptime monitoring, incident response. None of that disappears when an application moves to private infrastructure. It just stops being someone else's job.

## Application hosting versus complete data-platform hosting

There's a meaningful difference between "move the application" and "move everything." Relocating just the application layer -- while keeping the database, authentication, and storage on a managed platform -- is a comparatively modest change: different hosting, same operational safety net underneath. Taking the entire data platform private as well is a different order of commitment, because now the safety net has to be built and maintained too, not just relied upon.

Neither is a wrong choice. But they're not the same size of decision, and treating "we're going private" as one uniform thing rather than a spectrum is how organisations end up surprised by what they actually signed up for.

## Self-hosted data platforms

Take a modern application built on a managed backend platform, and self-hosting it doesn't mean receiving the same managed service inside a container -- it means becoming the team responsible for what that managed service was quietly doing all along: the database engine itself, the authentication system, file storage, the API layer connecting them, and every version upgrade across all of it, forever, on your own schedule. The self-hosted software and the managed service can share a name and a feature set while representing two completely different operational commitments.

That's not an argument against self-hosting a data platform -- there are excellent reasons to do it, from data residency to network isolation to plain independence from a vendor. It's an argument for going in with eyes open about which parts of "just works" were actually somebody else's ongoing labor.

## Backups, upgrades, monitoring, and recovery

The unglamorous list is exactly where private deployments quietly succeed or fail: does a backup actually get taken, verified, and *provably restorable*, not just scheduled and assumed to be fine? Is there a real plan for applying security and version updates without breaking production? Does anyone get paged when something goes down, and does that person know what to do?

None of these questions are exotic. They're the same questions any production system has always needed answered. The difference with a private AI deployment is that there's no managed-platform status page quietly answering them for you anymore -- the plan has to actually exist, be written down, and be tested, not assumed.

## External versus local AI models

Privacy in a private deployment usually starts with "our data stays inside our boundary" -- and then runs straight into the fact that most useful AI models are called over a network to an external provider. A fully private, network-isolated environment either needs a locally hosted model capable of doing the job, or a deliberate, reviewed decision about exactly what leaves the boundary and to whom. Bolting "private deployment" onto an architecture that still quietly calls out to a third-party API on every request isn't privacy -- it's an unexamined gap wearing the label.

## Why "private" does not automatically mean secure

Perhaps the most important thing to say plainly: private is not a synonym for secure, and self-hosted is not a synonym for well-operated. A managed platform, for all its dependency, comes with a dedicated team whose entire job is keeping it patched, monitored, and resilient. A private deployment gets exactly as much of that as its operator actually builds and maintains -- no more. An unpatched, unmonitored private server holding sensitive data behind a firewall is not more secure than a well-run managed service; it may well be considerably less so.

"Private" is a legitimate and often necessary destination. It's just not a shortcut. It's an operating model an organisation takes on deliberately, staffs for, and maintains indefinitely -- not a Docker Compose file that, once it runs, means the job is done.
$p6$,
  'draft'
);

insert into blog_posts (slug, title, excerpt, content, status)
values (
  'one-default-ai-model-is-not-enough',
  'One Default AI Model Is Not Enough',
  'Conversational reasoning, structured output, embeddings, and evaluation are different jobs.',
  $p7$## Conversational models

The default mental model for "AI in a product" is usually singular: there's an AI, and it answers things. In practice, even a fairly small application ends up needing several different models doing several different jobs, and treating them as one interchangeable "the AI" is where a lot of avoidable confusion comes from.

Start with the obvious one: the model doing the actual talking, answering questions, reasoning through a problem, holding a conversation. This is usually the model people picture when they think "AI assistant," and it's the one most worth spending on, because conversational quality is what a user directly experiences.

## Structured-output models

A separate job, easy to overlook: generating output that has to conform to a strict, machine-readable shape rather than free-flowing prose. A model can be an excellent conversationalist and a mediocre fit for reliably returning valid, schema-constrained data every time -- these are genuinely different skills, and not every model is strong at both. Systems that need dependable structured output often do better treating it as its own assignment, with its own model choice, rather than assuming whatever answers chat questions well will also format data correctly on demand.

## Embedding models

A third, quieter job: turning text into the numerical representations that power search and retrieval. Embedding models don't converse at all -- they exist purely to make "find the relevant thing" work well. This is arguably the job most likely to be silently miscategorised as part of "the AI," when it's really infrastructure for retrieval, with its own quality and consistency concerns, independent of whichever model happens to be generating conversational replies at the same time.

## Evaluation or judge models

A less obvious role, but an increasingly important one as AI-assisted work becomes serious enough to need checking: a model whose job is assessing another model's output. Using AI to help evaluate AI is a real and useful pattern -- comparing responses, checking for issues, scoring quality against a rubric -- but it only works if the evaluating model is chosen deliberately for that job, not simply whatever happened to be the default already assigned to something else.

## Capability versus assignment

Here's the distinction that tends to get lost: a model being *capable* of a role and a model being *assigned* to it are two different facts, and conflating them causes real operational confusion. A model might support structured output perfectly well without currently being the one anything relies on for it. Enabling a model makes it available. It doesn't make it responsible for anything until something is actually pointed at it. Keeping those two ideas visibly separate -- what a model *can* do versus what it's *currently doing* -- is most of what it takes to make a multi-model setup understandable rather than mysterious.

## Cost, latency, and reliability

Different jobs also have genuinely different tolerances. A conversational reply that takes an extra second is barely noticeable; a structured-output call blocking a workflow is more latency-sensitive. A model that's excellent but expensive might be the right choice for occasional deep analysis and the wrong choice for something called on every single request. None of this argues for always picking the cheapest or fastest option -- it argues for treating each role's requirements as its own decision, rather than inheriting whatever tradeoff was made for a different job entirely.

There's also a more basic lesson underneath all of this, learned the unglamorous way: it is entirely possible to configure the wrong provider because two names looked similar enough at a glance. A multi-model setup only works if it's genuinely easy to see, at a glance, which provider and which model is actually assigned to which job -- because the moment that's unclear, mistakes like that stop being rare.

## Why administrators must see which model serves which role

Put all of this together and the practical requirement is simple to state and easy to get wrong in an interface: someone configuring the system should be able to look at it and immediately answer "which model handles conversation, which handles structured output, which handles retrieval, and which of those assignments would this change actually affect?" -- without having to infer it from ambiguous labels or dig through multiple settings pages to piece together a mental model that should have just been shown to them.

One model can carry an application a surprisingly long way. But the moment a second job shows up -- structured output, retrieval, evaluation -- pretending it's still "the AI, singular" stops being simplicity and starts being a blind spot. Naming the jobs, and making it obvious which model is doing which one, is what keeps a multi-model system legible instead of accidentally risky.
$p7$,
  'draft'
);
