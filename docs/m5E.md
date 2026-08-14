M5E — Collaboration & Knowledge Exchange
1. Purpose

KB Sandbox is an AI Engineering Workbench, not a social-media or messaging application.

M5E introduces lightweight collaboration around two specific kinds of professional activity:

Trending Knowledge — users discover external AI papers, articles, technical reports, engineering analyses, releases, or other relevant material and bring them into the Workbench for discussion and possible incorporation into canonical knowledge.
Project Notes — project participants communicate about specific work, evidence, experiments, findings, or decisions through lightweight contextual notes.

The design principle is:

Collaboration should happen through the work, not around the work.

M5E must not evolve into general chat, social networking, email, or project-management functionality.

2. Conceptual model

M5E creates two related but distinct collaboration loops.

Knowledge loop
External discovery
       ↓
Trending Item
       ↓
Discussion
       ↓
Related Wiki articles
       ↓
Curator assessment
       ↓
 ┌───────────────┐
 ↓               ↓
Archive       Promote
                 ↓
          Wiki draft/version
                 ↓
           Existing review
                 ↓
          Canonical knowledge
Project collaboration loop
Project activity
      ↓
Project Note
      ↓
Context / evidence
      ↓
Reply / discussion
      ↓
Action or decision
      ↓
Resolve
      ↓
Retained project history

These mechanisms should reuse existing users, Projects, Wikis, Evals, Agents, Workstreams and permissions wherever possible.

3. Part A — Trending Knowledge
3.1 What Trending means

Trending is not another Wiki category.

It represents provisional external knowledge that users believe is worth examining.

The distinction should remain explicit:

TRENDING
"What are we watching?"

WIKI
"What do we currently know?"

EXAMPLES
"What have we tested/applied?"

A Trending item does not become trusted knowledge merely because someone submitted it.

4. Trending item

Minimum data model:

trending_items

id
title
source_url
source_name
description / why_it_matters
submitted_by
project_id nullable
visibility
status
published_at nullable
created_at
updated_at

Suggested status:

active
under_review
promoted
archived

Avoid a generic draft/review/approved lifecycle because Trending is intentionally different from canonical Wiki publishing.

Visibility

Initially support:

platform
project

platform means visible to authenticated Workbench users and potentially publicly visible if explicitly published.

project means restricted through existing project membership/RLS rules.

Do not conflate visibility with status.

5. Trending submission

Authenticated users should be able to select:

Submit to Trending

Minimum form:

URL *
Title *
Why does this matter? *

Optional:
Source / publisher
Project
Tags
Related Wiki articles

Do not require AI analysis.

Do not automatically convert the external article into a Wiki.

If metadata extraction is easy and safe, title/source metadata can later be suggested automatically, but manual submission must work independently.

6. Trending page

Add:

/trending

The page should use the visual language of the existing Wiki card UI.

Suggested card:

┌──────────────────────────────────────┐
│ New approach to RAG evaluation       │
│                                      │
│ ACL · submitted 2 days ago           │
│                                      │
│ Why it matters                       │
│ Challenges conventional retrieval    │
│ metrics by measuring whether context │
│ actually helps the generator.        │
│                                      │
│ RAG · Evaluation · Retrieval         │
│                                      │
│ Related Wiki                         │
│ RAG Evaluation · LLM-as-Judge        │
│                                      │
│ 4 comments                           │
└──────────────────────────────────────┘

Useful filters:

All
AI Agents
RAG
Models
Local AI
Evaluation
Governance
Engineering
Other

Prefer existing Wiki taxonomy/tags where practical rather than inventing another independent taxonomy.

Default ordering can simply be:

Most recent active items first.

Do not build a trending/ranking algorithm.

7. Trending discussion

Users can comment on a Trending item.

Minimum:

trending_comments

id
trending_item_id
author_id
body
created_at
updated_at nullable

For M5E, comments should be flat.

Do not implement:

deep threaded discussions;
reactions;
likes;
voting;
popularity scores;
follower systems;
@mention notifications;
presence indicators.

A discussion exists to evaluate the significance of the source.

8. Wiki relationships

This is more important than the commenting feature.

Users should be able to link a Trending item to one or more existing Wiki articles.

For example:

Trending:
"New Retrieval Evaluation Metric"

Related Knowledge:

→ Retrieval-Augmented Generation
→ RAG Evaluation
→ LLM-as-Judge

Use an explicit relationship table rather than embedding IDs in JSON if practical:

trending_wiki_links

trending_item_id
wiki_article_id
linked_by
created_at

This relationship means:

"This external development may be relevant to this existing knowledge."

It does not mean the Wiki endorses the external material.

9. Promotion into Wiki

Curator/Admin should have:

Propose Wiki Update

or:

Promote to Wiki

Do not bypass the existing Wiki lifecycle.

Promotion should produce either:

New Wiki
Trending item
      ↓
Create Wiki draft
      ↓
Existing Wiki review
      ↓
Admin/Curator approval

or:

Existing Wiki update
Trending item
      ↓
Create new Wiki version/draft
      ↓
Existing review
      ↓
Approval

The existing approved Wiki must remain unchanged until the normal approval process completes.

Where possible, retain provenance linking the resulting Wiki version to the Trending item/source.

10. Part B — Project Notes
Purpose

Project Notes provide lightweight, contextual collaboration about actual Workbench activity.

They are not direct messages.

A note should normally belong to a Project and optionally reference the object being discussed.

Example:

Retrieval benchmark

The Wiki configuration is outperforming chunks on Recall@5. Could you review whether my benchmark is biased toward Wiki terminology?

Related: Eval Run #27

From Andrew → Project Curator

11. Project Note model

Suggested model:

project_notes

id
project_id
author_id

recipient_type
recipient_user_id nullable

subject
body

context_type nullable
context_id nullable

status
created_at
resolved_at nullable
resolved_by nullable

Recipient types might initially be:

user
project_team
curator
admin

Avoid arbitrary global distribution lists.

Status:

open
resolved

That's enough.

Do not add priority/severity/workflow status unless actual usage demonstrates a need.

12. Note context

A Project Note may optionally reference existing Workbench objects.

Suggested supported types:

wiki
trending
eval_run
eval_result
document
agent
graph_run
workstream

Example:

Project Note

"Please review grounding failure"

Project:
Local LLM Experiment

Related:
Eval Run #43

From:
Consultant

To:
Curator

Use normal links to existing pages.

Do not duplicate the referenced object's content into the note.

13. Replies

Provide lightweight replies:

project_note_replies

id
note_id
author_id
body
created_at

Flat chronological conversation is sufficient.

Example:

Andrew
Can you check why cases 4 and 7 failed grounding?

Curator
Both appear to be retrieving the same irrelevant source.
Try excluding Wiki article X.

Andrew
Confirmed. New run improved grounding to 0.94.

[ Resolve Note ]

No nested replies.

14. Resolution

Either the author, appropriate recipient, project owner/curator or admin should be able to resolve the note according to existing project permissions.

Resolved notes:

disappear from the default dashboard;
remain accessible in project history;
retain replies;
retain context links;
retain author/resolution metadata.

Do not delete resolved collaboration history automatically.

15. Dashboard integration

Do not create a general-purpose Inbox.

Add a compact dashboard component:

Notes for You

Example:

NOTES FOR YOU                         3 open

┌──────────────────────────────────────────┐
│ Retrieval benchmark                     │
│                                          │
│ Jane → You                              │
│ Can you review Eval Run #27?            │
│                                          │
│ RAG Experiment · 2 hours ago            │
│                                          │
│ Reply                         Resolve    │
└──────────────────────────────────────────┘

Show perhaps the most recent 3–5 open notes.

Provide:

View Project Notes →

if a larger list is required.

16. Project integration

A Project page can gain a small collaboration area:

OVERVIEW
KNOWLEDGE
EVALUATIONS
WORKSTREAMS
NOTES

If the existing Project UI doesn't use tabs, follow its established navigation convention rather than redesigning it solely for M5E.

The Notes page should show:

Open
Resolved

and allow filtering by contextual object if straightforward.

17. Roles and permissions

Preserve existing project membership and RLS concepts.

Anonymous

Trending:

may read explicitly public Trending items.

Project Notes:

no access.
Authenticated Consultant

Trending:

submit;
comment;
link Wiki articles;
edit own submission where appropriate.

Project Notes:

create within projects they belong to;
send to project participants/project team/curator/admin as allowed;
reply to notes visible to them;
resolve appropriate notes.
Curator

All Consultant capabilities plus:

review Trending;
archive;
initiate Wiki promotion/update;
project-level knowledge oversight.
Admin

Full platform-level moderation and management.

Do not create a second independent authorization system for M5E.

Reuse existing project membership/role helpers and RLS wherever possible.

18. Public experience

Eventually the anonymous navigation could become:

About
Wiki
Trending
Examples
Sign In

This creates a very understandable public knowledge experience:

Wiki
What we know.

Trending
What we're watching.

Examples
What we've tested.

Only explicitly public Trending items should appear anonymously.

For the first implementation, public Trending publication can remain Curator/Admin-controlled.

19. Dashboard role emphasis

M5E should integrate with the role-aware dashboard refinement already planned.

Consultant

Emphasize:

My Projects
Notes for You
Recent Evals
Trending
Curator

Emphasize:

Curation Queue
Wiki Reviews
Trending Under Review
Project Notes
Admin

Emphasize:

Platform Overview
Needs Attention
Trending Review
Knowledge
Projects

Do not create three unrelated dashboard implementations.

Reuse shared components and vary authorized queries/emphasis.

20. Important distinction: Trending vs Sources

Do not automatically treat a Trending URL as an approved project source.

They have different meanings.

TRENDING ITEM
"This may be interesting."

SOURCE
"We have intentionally brought this material
into a project's knowledge pipeline."

APPROVED CHUNK
"A human has reviewed this evidence."

WIKI
"We have synthesized and approved reusable
knowledge from evidence."

A user/curator can deliberately move material from Trending into the existing source/curation pipeline later.

That boundary protects the current provenance model.

21. Auditability

M5E collaboration should retain basic authorship/history.

At minimum preserve:

who submitted a Trending item;
who commented;
who linked a Wiki;
who promoted/archived it;
who created a Project Note;
replies;
who resolved it;
timestamps.

Do not silently rewrite another user's contribution.

If comment editing is supported, either record updated_at or simply defer editing for M5E.

22. Explicit non-goals

M5E must not implement:

Direct messaging
Chat rooms
Slack-style channels
Social feeds
Likes
Emoji reactions
Followers
Reputation points
User popularity
Typing indicators
Presence / online status
Complex notifications
Email notifications
Push notifications
Recommendation algorithms
Trending-score algorithms
Automatic web crawling
Autonomous research
Automatic Wiki publication
General project management
Task boards
Assignments / due dates

If a requested implementation begins requiring these capabilities, stop and report the scope expansion.

23. Suggested schema

Exact naming can adapt to existing conventions, but conceptually:

trending_items
trending_comments
trending_wiki_links

project_notes
project_note_replies

Prefer proper relational FKs for known Workbench entities.

For the polymorphic Project Note context (eval_run, wiki, etc.), Claude should first inspect existing conventions before choosing JSON vs typed columns vs a generalized reference pattern.

Do not redesign unrelated schema.

24. Testing expectations

Add tests covering at least:

Consultant can create a Trending item.
Anonymous cannot create one.
Public Trending item is anonymously readable.
Project-only Trending respects project membership.
User can comment on an accessible item.
User can link an accessible Wiki.
Consultant cannot directly promote content into an approved Wiki.
Curator/Admin promotion creates a draft/new version through existing Wiki lifecycle.
Existing approved Wiki remains unchanged until approval.
Consultant can create a note within their project.
Non-member cannot read project note.
Appropriate recipient can reply.
Appropriate user can resolve note.
Resolved note remains retrievable in history.
Dashboard only returns authorized/open notes.
Context link points to the correct existing Workbench object.

Run the same static + live verification discipline used for previous milestones.

25. Definition of Done

M5E is complete when a realistic workflow works end-to-end:

Consultant discovers new AI paper
        ↓
Submits to Trending
        ↓
Another consultant comments
        ↓
Links existing RAG Evaluation Wiki
        ↓
Curator reviews it
        ↓
Creates proposed Wiki update
        ↓
Existing Wiki approval lifecycle applies

And separately:

Consultant runs evaluation
        ↓
Notices unexpected result
        ↓
Creates Project Note
        ↓
Links Eval Run
        ↓
Curator replies
        ↓
Consultant reruns experiment
        ↓
Records result
        ↓
Resolves note
        ↓
Discussion remains in project history

If those two workflows work cleanly, stop.

Do not expand M5E into a broader collaboration platform.