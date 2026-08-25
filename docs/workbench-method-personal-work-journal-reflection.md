# Workbench Method Draft: Personal Work Journal & Reflection

**Status:** Draft for implementation in the Workbench Handbook and method catalogue  
**Proposed method ID:** Assign during implementation; do not renumber existing methods silently  
**Related development request:** [`docs/dev-request-private-work-journal.md`](dev-request-private-work-journal.md)

## Quick help

Use this method to privately revisit your own authorized work history over a chosen period, create a source-grounded reflective journal, remember progress and decisions, and identify things you may want to revisit.

## Goal

Turn a bounded period of the user's own authorized activity into a private, readable and source-traceable reflection without turning personal reflection into employer surveillance, shared organizational knowledge, or automatic Assistant memory.

## Why it matters

Knowledge work is fragmented across conversations, projects, decisions, notes, documents and unfinished threads. People often remember the latest task but lose sight of what they explored, learned, completed, reconsidered, or left open over the previous month or six months.

A private journal helps the individual recover that context. Its value comes from being reflective and personally owned. If managers, employers, administrators or colleagues can silently inspect it, users will reasonably self-censor and the journal becomes another performance-reporting surface.

## When to use

Use this method when the user wants to:

- remember what they worked on during the last month, quarter, six months or year;
- prepare for a personal review, mentoring conversation or career reflection;
- revisit decisions, lessons, assumptions and unfinished work;
- understand how attention moved between projects or themes;
- create a personal record before a project ends or access changes;
- recover context after time away;
- identify conversations or artifacts worth revisiting; or
- download a private narrative for their own use.

## When not to use

Do not use this method to:

- assess employee productivity or performance;
- create manager or employer dashboards;
- infer emotions, motivations, achievements or failures unsupported by sources;
- monitor working hours, inactivity, or personal behavior;
- rank people, create streak pressure, or compare colleagues;
- convert personal reflection into organizational knowledge automatically;
- preserve a generated journal as Assistant memory;
- bypass project, customer or evidence-access restrictions; or
- attribute collaborative work to one person without reliable provenance.

## Requirements

### Required

- Authenticated user
- Selected date range
- At least one user-owned or reliably user-attributable source record, or an honest empty-history outcome
- User confirmation of the source categories to include
- Current authorization to every included source

### Strongly recommended

- Conversations with durable timestamps and ownership
- Project/workstream activity with actor provenance
- Versioned artifacts or notes attributable to the user
- Decisions, milestones and open items recorded explicitly
- Provider/model disclosure
- Private generation and download controls

### Optional

- Project filter
- Theme or tag filter
- Source exclusions
- Brief, Standard or Detailed output
- Reflective or factual-summary style
- Calendar or timeline selection
- User-authored prompt such as “focus on lessons” or “help me remember unfinished work”

### Requirement states

For each desired source category, record:

- **Available** — reliable ownership/activity provenance and current access exist.
- **Needed** — the history is desired but provenance or access is missing.
- **Optional** — the journal remains useful without it.
- **Can be produced elsewhere** — the user can supply a separate private record if they choose.

**Git required:** No.

## Core principles

### Personal ownership

The journal belongs to the individual. Other users, managers, employers, organization owners, project owners and ordinary administrators cannot generate, list, preview or download it unless the user deliberately shares an exported document through a separate action.

### Source-grounded reflection

Recorded facts and AI-generated reflection must remain distinguishable. The journal may identify patterns or possible themes, but it must not fabricate accomplishments, intentions, emotions or conclusions.

The method distinguishes **My activity** from **Related project activity**. Related activity is an authorized event involving the user or occurring in a project where the user is an active member. It is shown as one concise line per event with the real actor, such as “Maria returned the proposal for changes.”

### Current authorization

The generator may use only sources the user is currently authorized to access. Journal ownership does not preserve access to customer or project evidence after authorization is revoked.

### One-way generation

Generating a journal reads authorized history and produces a private output. The generated prose does not flow back into Assistant memory, embeddings, the Wiki, projects, evaluations or organizational analytics.

### Minimal retention

Prefer transient generation and short-lived, user-bound downloads. Do not create a permanent journal archive merely to support the method.

## Method

### Step 1 — Choose the purpose

Ask what the user wants from the reflection:

- remember recent activity;
- recognize progress;
- prepare for a conversation;
- revisit decisions or lessons;
- identify unfinished threads;
- review one project; or
- create a personal record for a period.

The purpose influences emphasis, not access scope.

### Step 2 — Select the period

Choose a bounded range such as:

- last 30 days;
- previous calendar month;
- last three or six months;
- this year;
- one project phase; or
- a custom date range.

If the range is too large for reliable coverage, reduce detail, split by period, or generate multiple journals rather than silently omitting early activity.

### Step 3 — Review available source categories

Show the user what can be included and why it is attributable to them:

- their Assistant conversations;
- project conversations bound to projects they can currently access;
- artifacts they created or materially updated where actor provenance exists;
- their notes and explicit decisions;
- workstreams or projects they created or led, described accurately;
- milestones and open items with reliable authorship; and
- other privacy-reviewed activity sources.

The method may also include authorized activity by managers, leads, colleagues, reviewers, customers, or other project members when the event directly involves the user or belongs to a project where the user is an active member. Examples include assignments, comments, replies, reviews, approvals, returns, project decisions, artifact changes, authority/access changes, and milestones.

Merely being able to view a project does not make all project activity the user's activity.

Do not include activity from projects where the user is not an active member or any record the user cannot currently access.

### Step 4 — Apply privacy and access boundaries

Before content reaches the journal model:

- re-check current authorization for every source;
- honor project and evidence-level restrictions;
- remove inaccessible records and their metadata;
- avoid exposing restricted source existence through counts or labels;
- keep one project's restricted evidence from being blended into another project section; and
- identify sources that will be omitted without revealing protected details.

### Step 5 — Select and exclude

Allow the user to include or exclude:

- source categories;
- projects;
- conversations;
- workstreams;
- artifacts;
- themes or tags; and
- individual activity items.

Provide separate controls for **My activity** and **Related project activity**.

Exclusions apply only to this generation request and should not alter the underlying records.

### Step 6 — Build a provenance-bearing timeline

Arrange selected activity by a stable boundary such as month, week, project or theme. Preserve source IDs, timestamps, actor relationship and access scope with each entry.

Represent related project activity as one concise line per event. Preserve the real actor and context; never rewrite another person's action as the user's accomplishment.

Do not send the full raw history to one model prompt. For longer periods, create bounded temporary summaries per month or project, then synthesize the journal from those summaries.

### Step 7 — Generate the reflection

Produce a journal containing:

1. title and covered period;
2. chronological narrative;
3. projects and themes;
4. decisions, milestones and accomplishments supported by evidence;
5. lessons and changed assumptions, clearly marked as reflection where inferred;
6. open questions and unfinished threads;
7. items worth revisiting; and
8. source appendix.

Where related activity is selected, add a compact **Activity around me and my projects** section with one attributable line per event.

Use short source excerpts only when they materially support the reflection. Summarize by default.

### Step 8 — Verify the draft

Check that:

- dates and project associations are accurate;
- collaborative work is not misattributed;
- major factual claims trace to selected sources;
- inferred themes are labeled appropriately;
- inaccessible evidence is absent;
- early parts of a long range are represented; and
- little or no history produces an honest result rather than invented content.

### Step 9 — Private preview and download

Show the user a private preview and processing disclosure, including provider/model and the fact that the output does not become Assistant memory.

Allow download as a readable DOCX. The initial method ends with a user-owned export, not automatic storage or sharing.

### Step 10 — Choose personal next actions

Offer optional next actions that do not mutate records automatically:

- revisit a source conversation;
- open a project or artifact;
- start a new personal conversation about an open question;
- generate a different period or focus;
- download the journal; or
- independently share the downloaded file.

Do not automatically turn “items to revisit” into employer-visible tasks or project commitments.

## Standard deliverables

1. **Private Work Journal** — reflective, date-bounded DOCX.
2. **Period Narrative** — week-by-week or month-by-month account.
3. **Projects and Themes Map** — source-grounded areas of attention.
4. **Decisions and Milestones** — attributable, evidence-backed events.
5. **Activity Around Me and My Projects** — one concise, attributable line for each selected related event.
6. **Lessons and Changed Assumptions** — facts separated from AI reflection.
7. **Open Questions and Unfinished Threads** — items the user may revisit.
8. **Source Appendix** — authorized links and provenance.
9. **Generation Disclosure** — date range, source categories, exclusions, provider/model and privacy boundary.

## Suggested journal structure

### My Work Journal

- Covered period:
- Generated on:
- Included source categories:
- Excluded projects/sources:
- Provider/model:
- Privacy note: private user-requested export; not retained as Assistant memory.

### Looking back

A readable chronological narrative of the period.

### Projects and themes

What occupied attention, with careful attribution.

### Decisions and milestones

Recorded decisions, completed work and meaningful progress.

### Activity around me and my projects

A chronological list of related events, one concise line each, showing date, actor, action, and project/context.

### Lessons and changed assumptions

What the sources show and what the AI tentatively infers.

### Open questions

Unresolved issues and incomplete evidence.

### Items to revisit

Optional personal prompts, not automatically created tasks.

### Source appendix

Links, dates, source types and relevant project context.

## Phase 2 experience — Calendar and Memory Map

Phase 2 adds a private visual surface for exploring the activity from which journals are generated.

### Views

- Month calendar with quiet activity markers
- Six-month/year heat map
- Week or month timeline
- Project and theme lanes
- Selected-range preview

### Filters

- Date range
- Project
- Workstream
- Conversation
- Artifact/note/decision/milestone source type
- Theme or tag where supported
- Completed, open or revisit status where genuinely recorded
- Include or exclude collaborative activity
- Activity lens: My activity or Related project activity

### Interaction

The user can select calendar days, weeks or months; inspect source-linked activity; exclude items; and choose **Generate journal for this period**.

The calendar maps currently authorized source activity. It does not require permanent storage of generated journal prose. Revoked project or evidence access removes the corresponding activity from the map.

### Emotional design

The memory map should encourage curiosity and reminiscence, not performance anxiety. Avoid:

- productivity scores;
- “inactive day” warnings;
- streaks or gamification pressure;
- working-hours surveillance;
- colleague comparisons;
- manager dashboards; and
- language implying that an empty period is a failure.

Empty periods are simply periods with no included source activity.

## Optional Phase 3 experience — Ember Weekly Continuity

Phase 3 creates one private, source-linked summary for each completed week so Ember can resume work without repeatedly asking for context the user has already supplied.

This is not the same as placing the reflective journal into the system prompt. Weekly continuity entries are short, factual memory summaries containing:

- confirmed facts and explicit user corrections;
- projects and themes discussed;
- decisions and commitments;
- progress and changes;
- open questions and items to revisit;
- related project activity as one attributable line per event; and
- source links, project scope, and access classification.

Ember receives only a bounded continuity context: the most recent eligible weeks plus older entries retrieved for relevance. Weekly summaries are not approved evidence and must not override current project knowledge or later user corrections.

The user can inspect, correct, exclude, delete, or disable weekly summaries. An item becomes shared company knowledge only when the user deliberately promotes it into a separately governed project note, artifact, or knowledge-review proposal.

### Benefit to the user

- fewer repeated explanations;
- easier resumption after switching projects or taking time away;
- visible decisions and unfinished threads;
- a private weekly/monthly memory map; and
- control over what Ember remembers.

### Benefit to the organization

- faster resumption of project work;
- fewer lost decisions and constraints;
- better continuity across project phases;
- improved adoption and trust in Ember;
- fewer repeated discovery questions; and
- a deliberate path from private insight to governed organizational knowledge.

The organization receives these benefits through improved continuity, not by reading employees' private summaries.

### Pilot evaluation

Treat the feature as optional and non-gating. If included in the pilot, evaluate:

- whether users repeat established context less often;
- time to resume a prior thread;
- frequency of already-answered questions from Ember;
- user corrections after returning to a conversation;
- voluntary continuation and navigation usage;
- voluntary promotion to governed project knowledge; and
- user-reported usefulness, transparency, and trust.

Evaluators must not inspect private weekly summary prose, rank users, treat empty weeks as poor performance, or infer productivity from activity volume.

## Failure modes

- Making journals visible to employers, managers, project owners or ordinary administrators.
- Treating all accessible project activity as the user's personal work.
- Misattributing another person's assignment, review, approval, reply, decision, or artifact change to the user.
- Including activity from a project where the user is not an active member.
- Including evidence after project or evidence-level access is revoked.
- Storing generated reflection as long-term memory or organizational knowledge.
- Inserting all weekly summaries into every Ember prompt without relevance or token limits.
- Treating a continuity summary as approved project evidence.
- Allowing managers or pilot evaluators to browse private weekly summaries.
- Retaining protected project details in Ember context after access is revoked.
- Fabricating feelings, achievements, motivations or lessons.
- Sending an unbounded raw six-month history to one prompt.
- Allowing project/customer information to leak through calendar counts or filters.
- Turning a reflective calendar into employee productivity monitoring.
- Saving personal “items to revisit” as shared tasks without confirmation.
- Treating a downloaded journal as permission to share or re-ingest it.

## Evaluation

Evaluate the method using:

- source-attribution accuracy;
- factual-claim traceability;
- unauthorized-source inclusion rate: target zero;
- misattributed collaborative activity rate: target zero;
- related-event one-line attribution accuracy;
- unrelated-project activity inclusion rate: target zero;
- coverage across the selected period;
- unsupported reflection rate;
- user-reported usefulness for remembering and revisiting work;
- time required to generate and inspect a journal;
- privacy-isolation tests across users, projects and evidence groups;
- calendar/filter metadata leakage rate: target zero; and
- confirmation that generated prose is absent from later Assistant memory.
- reduction in repeated-context questions when weekly continuity is enabled;
- user-reported continuity usefulness and trust; and
- weekly-summary privacy/isolation and correction accuracy.

Avoid evaluating users by the contents or frequency of their journals.

## Governance considerations

- The individual owns the generated reflective journal.
- Generation does not imply consent to employer or organization access.
- Current source authorization is enforced at generation and calendar-view time.
- Project and evidence restrictions survive into source selection and derived output.
- Generated content is transient unless the user explicitly downloads it.
- Optional future saved reflections require a separate privacy and retention design.
- Sharing is explicit, visible and revocable if implemented in-product later.
- Journal content is not used for model training, employee evaluation or product analytics without separate informed consent.
- Optional weekly continuity is transparent, user-controlled, bounded, and separate from approved organizational knowledge.
- Pilot evaluation measures continuity without exposing personal summary content or ranking users.

## Practical experiment

1. Create several user-owned Assistant conversations across a 30-day period.
2. Include one project-bound conversation and one general conversation.
3. Add a collaborative project event that the user can view but did not perform.
4. Add a restricted source the user cannot access.
5. Generate a standard 30-day journal.
6. Confirm the collaborative event is described accurately or omitted and the restricted source leaves no trace.
7. Inspect the DOCX for narrative quality, dates, sections and source appendix.
8. Generate a six-month journal and verify balanced period coverage using bounded summaries.
9. Open the Phase 2 memory map, filter by project and source type, and generate from a selected month.
10. Revoke project access and confirm the relevant calendar items and future journal sources disappear.
11. Attempt preview/download as another user, manager, project owner and ordinary Admin; confirm denial.
12. Start a new Assistant conversation and confirm it does not know reflection that exists only in the generated journal.

## Boundary

KB Sandbox can collect currently authorized, user-attributable sources; generate a private reflection; present a personal calendar/memory map; and provide a transient download.

The method does not determine employee performance, grant access to restricted evidence, transfer journal ownership to an employer, or make generated reflection part of organizational knowledge or Assistant memory.
