# Project-Scoped Working Knowledge and Research Notebooks

## Status

Proposed follow-on development request.

## Delivery sequence

Implement this request **after Stages 1 and 2** of `docs/dev-request-ember-role-directed-product-experience.md` have been completed and regression-tested. Implement it before, or as the first dependency of, that request's broader Stage 3 **My work**, **Explore** and consultant-workflow experience.

Do not merge this work into the current Ember shell implementation. It introduces a new knowledge lifecycle, retrieval scope and privacy boundary and should retain its own tests and acceptance decision.

## Summary

Add **Working Knowledge**: a persistent, Project-scoped research and note space that Ember may use for conversational continuity before its contents have been approved as organizational knowledge.

Working Knowledge fills the gap between:

- transient conversation context, which is useful now but is not an organized durable record; and
- approved Wiki and knowledge-base content, which is curated, governed and reusable as organizational guidance or evidence.

The first user-facing form is a **Research notebook**. A member, consultant or other authorized Project participant can ask Ember to research a prospective customer, RFP, competitor, regulation or technical option; retain the findings, citations, open questions and working conclusions; and continue using that material in later Project-bound conversations.

The content remains visibly **working and unverified** until someone deliberately submits suitable material through the existing curation process and an authorized human approves it.

## Product objective

Preserve the freedom and continuity people expect from personal AI tools without weakening KB Sandbox's distinction between exploratory work and knowledge the organization is prepared to stand behind.

The intended experience is:

> **Explore freely. Continue where you left off. Govern what becomes organizational knowledge.**

This is important to Ember's product proposition. If Ember can use only approved sources, she is trustworthy but may feel constrained for live presales, research and problem-solving. If every search result immediately enters the shared knowledge base, governance becomes meaningless. Working Knowledge provides a controlled middle layer.

## Knowledge model

KB Sandbox should present three distinct layers:

| Layer | Purpose | Default persistence | Trust meaning |
| --- | --- | --- | --- |
| Approved knowledge | Organization/Project Wiki and approved source evidence | Durable | Human-governed organizational guidance or evidence |
| Working Knowledge | User/Project research, notes, drafts and intermediate findings | Durable under retention policy | Useful but unverified working material |
| Conversation context | Messages and current-turn tool results | Conversation history | Conversational continuity, not a knowledge endorsement |

Working Knowledge must not be called an approved Wiki or knowledge base in the user interface. Preferred labels are:

- **Working Knowledge** for the capability;
- **Research notebook** for an organized research record; and
- **Working note** for a small user-authored entry.

## Representative journey

Within the **Sales Proposals** Workspace, a presales user asks:

> Research Acme Healthcare, its privacy requirements, current systems and likely storage needs for this RFP.

After explicit authorization for web research, Ember uses the configured provider and creates a notebook containing:

- research objective and scope;
- current synthesis;
- individual findings;
- cited web sources and retrieval dates;
- uncertainties and conflicting information;
- customer facts that still require confirmation;
- working assumptions;
- next questions or actions; and
- provenance identifying the user, Project, conversation, research provider and synthesis model.

In a later conversation bound to the same Project, the user may say:

> Continue the Acme proposal using my research from yesterday.

Ember may combine the user's authorized Working Knowledge with approved Sandz/Zadara evidence, but the response must distinguish them and must not describe an unverified web finding as approved company knowledge.

## Ownership, visibility and trust

Ownership/visibility and trust status are independent.

### Visibility states

1. **Private to creator within the Project** — default.
2. **Shared with selected active Project members**.
3. **Shared with all active Project members**.

There is no public or platform-wide Working Knowledge visibility in the first release.

### Trust states

1. `working` — unverified material in active use.
2. `submitted` — selected content has been submitted for curation.
3. `returned` — a curator requested clarification or changes.
4. `promoted` — a governed record has been created or updated and linked back.
5. `superseded` — no longer current but retained where policy permits.
6. `archived` — excluded from default retrieval.

Trust status applies to the notebook/entry. Individual claims and sources may additionally carry `unconfirmed`, `corroborated`, `conflicting`, `customer_confirmed`, or equivalent evidence-quality indicators. These indicators are metadata, not approval authority.

### Default rule

Every new notebook or working note is:

> private to its creator, bound to the current Project, and visibly marked **Working — not company-approved**.

A curator or administrator must not automatically read a private notebook solely because of platform role. Sharing, curation submission, retention administration and any future exceptional access are separate capabilities.

## Required user experience

### Creation

Users may create Working Knowledge through:

- **Save to Working Knowledge** on an Ember response or research result;
- **Create research notebook** from Ember or My work;
- a small working note editor; and
- an approved Ember-generated artifact already available to that user, referenced rather than silently duplicated.

Ember should suggest saving when durable continuity would be useful, but must not save every conversation automatically as Working Knowledge.

Before saving, show:

- notebook/note title;
- Project binding;
- default visibility;
- unverified status; and
- whether external web sources or private Project material are included.

### Continuing work

Within a Project-bound conversation, Ember may locate the current user's relevant Working Knowledge. The response should say when a notebook influenced the answer and provide a trusted link to open it.

Provide explicit controls such as:

- **Use this notebook**;
- **Stop using this notebook** for the current conversation;
- **Refresh web research**;
- **Share**;
- **Submit for curation**; and
- **Archive**.

Do not inject every notebook into every prompt. Retrieve only bounded, relevant entries or let the user attach/select a notebook explicitly.

### Trust presentation

When a response uses multiple knowledge layers, render a compact disclosure such as:

```text
Knowledge used

Approved      3 company-approved sources
Working       1 private research notebook, 6 findings
Web           4 current external sources

Unconfirmed: the customer's retention requirement still needs validation.
```

Use accessible text and icons; never communicate trust through color alone.

Working Knowledge citations must use labels such as **Working research**, **Private working note**, or **Project-shared research**. They must never inherit the approved-evidence badge.

## Retrieval architecture

Keep approved knowledge and Working Knowledge logically distinct even if they use similar embedding infrastructure.

Prefer narrow server-side tools such as:

- `search_approved_project_knowledge` — existing approved evidence path;
- `search_my_working_knowledge` — current user's working material in the bound Project;
- `search_shared_working_knowledge` — working material explicitly shared with the caller in the bound Project; and
- `research_web` — current external research implemented through the governed provider adapter.

Requirements:

- the conversation's Project is resolved server-side;
- tools accept no model-supplied Project or owner identifier;
- RLS or an equivalently narrow server-enforced query filters visibility;
- general/unbound Ember does not receive Working Knowledge tools;
- archived and superseded material is excluded by default;
- submitted material remains unverified unless/until a governed destination is approved;
- retrieval returns trust, visibility, freshness and provenance metadata with the content;
- the model is instructed to disclose conflicts rather than silently choose the preferred layer; and
- Working Knowledge never becomes an alternate authorization path to restricted approved evidence.

The final answer should be able to cite approved evidence and Working Knowledge in the same response while rendering their different authority accurately.

## Data model direction

Use normalized durable records rather than storing the notebook only inside a chat message payload. Exact names may vary after schema inspection.

Suggested conceptual records:

### `working_knowledge_items`

- stable identifier;
- `project_id`;
- creator/owner user ID;
- type such as `research_notebook` or `working_note`;
- title and objective;
- current synthesis/content;
- visibility mode;
- trust status;
- source conversation/message and optional Workstream/artifact reference;
- created, updated, last-used, refreshed and archived timestamps;
- freshness/expiry policy where applicable;
- synthesis model/provider provenance; and
- optional current version identifier if versioning is separated.

### `working_knowledge_sources`

- parent item;
- canonical URL and normalized domain/publisher;
- source title;
- publication date where available;
- retrieval/access timestamp;
- query/research execution reference;
- bounded excerpt or retained snapshot reference;
- content fingerprint;
- provider result metadata;
- source-quality/claim status; and
- retrieval success or limitation state.

### `working_knowledge_shares`

- parent item;
- recipient user or Project-wide share marker;
- granting user;
- granted/revoked timestamps; and
- optional permission such as view or collaborate if editing is later supported.

### `working_knowledge_promotions`

- parent item or selected item version;
- submission/review record;
- governed destination type and identifier;
- submitting and deciding users;
- status and timestamps; and
- decision note.

Do not copy a restricted source body into a Working Knowledge item to broaden its access. References must be re-authorized when retrieved or displayed.

## Versioning and edit behavior

At minimum, preserve updated timestamps and promotion provenance. Prefer immutable versions when a notebook:

- is submitted for curation;
- is shared beyond its creator;
- supports a consequential artifact or decision; or
- has already been promoted into governed knowledge.

Submitting for curation should freeze or snapshot the submitted version while allowing later working changes to continue in a new version. A curator must review the submitted snapshot, not a moving target.

Concurrent multi-user editing is out of scope for the first release. Project-shared notebooks may initially be owner-editable and read-only to recipients.

## Tavily and provider-neutral web research

Build on `docs/dev-request-governed-external-research.md`. Tavily may be the initial provider, but Working Knowledge must depend on an internal provider-neutral research contract rather than Tavily's raw response schema.

Record at least:

- configured research provider;
- exact outbound query after any redaction/generalization;
- search mode/depth;
- request/credit usage where returned;
- selected and retrieved URLs;
- access times and failures;
- synthesis model/provider; and
- durable trace/reference needed for audit.

Use cost controls:

- per-turn result/page limits;
- per-user and Project budgets;
- basic search by default;
- explicit user action for deeper research;
- duplicate-query/cache strategy where privacy permits; and
- honest partial results when limits are reached.

Do not retain complete copyrighted web pages by default. Store normalized citation metadata, bounded supporting excerpts, fingerprints and the user's synthesis unless a configured policy and publisher terms permit more.

## Promotion to governed knowledge

Provide **Submit for curation**, not **Approve** or **Publish**, to ordinary users.

Submission may propose one or more existing governed record types:

- candidate source URL/document;
- proposed Wiki article or FAQ;
- reusable customer/competitor brief;
- Project/Workstream research artifact; or
- update to existing guidance.

Reuse existing candidate-source, Wiki/article, artifact and curator decision paths wherever possible. Do not build a second approval system for notebooks.

The promotion process must:

1. let the user select the material being submitted;
2. snapshot that version;
3. preserve provenance to its notebook, conversations and external sources;
4. apply an intended governed visibility without broadening restricted inputs;
5. require the existing authorized human decision;
6. create/link the approved destination only at the correct existing lifecycle point; and
7. show the notebook's relationship to the resulting governed record.

Promotion does not necessarily approve every underlying web source. The curated record should state what was verified, by whom and against which approved/supporting evidence.

## Privacy and authorization invariants

1. A user must be an active authorized member of the bound Project to create or retrieve Working Knowledge there.
2. Project membership alone does not expose another user's private Working Knowledge.
3. Platform administrator or curator status alone does not expose private notebook content.
4. Removing Project membership immediately prevents retrieval and direct access, subject only to separately governed retention administration that does not expose content through Ember.
5. Sharing is explicit, revocable and restricted to active members of the same Project.
6. Project-wide sharing never means platform-wide sharing.
7. General Ember cannot enumerate notebook titles, counts or excerpts from private Projects.
8. Search suggestions, recent work, notifications and generated links must follow the same policy.
9. Private or restricted source material must not be transmitted to Tavily or another external research provider.
10. Search queries containing customer identity, personal data or confidential Project facts must follow the privacy confirmation/redaction rules in the governed research request.
11. Conversations and notebooks are separate records; access to one does not automatically grant access to the other.
12. Journal generation and manager reporting do not ingest another user's private Working Knowledge unless a later, explicit policy authorizes it.

## Information sensitivity and AI processing

Before sending Working Knowledge to an LLM, enforce both:

- the user's content authorization; and
- the item's information-sensitivity eligibility for the selected provider/environment.

An item being private or shared is not itself a sensitivity classification. Do not assume that creator ownership authorizes transmission to a public-cloud model.

If eligible processing is unavailable, Ember should explain that the material cannot be used with the current AI environment and offer a safe next step. It must not silently omit the material and imply a complete answer.

## Freshness and conflicts

Web-derived Working Knowledge should carry freshness metadata. The first release should support:

- retrieved date;
- optional “refresh after” date or policy;
- visible stale warning;
- explicit refresh action; and
- superseding rather than silently overwriting consequential prior findings.

When Working Knowledge conflicts with approved knowledge:

- show the conflict;
- give approved organizational knowledge the appropriate authority for organizational procedure;
- do not discard newer external evidence merely because it is unapproved;
- advise validation or curation when the difference matters; and
- never automatically update approved knowledge.

## Relationship to OKF

Working Knowledge is conceptually compatible with an LLM Wiki and the Open Knowledge Format (OKF), but OKF is not required for the first release.

Treat OKF as a future portability boundary:

- export selected notebooks as human- and agent-readable Markdown plus metadata;
- import an explicitly selected OKF bundle as Working Knowledge, not approved knowledge;
- validate provenance and links before import; and
- preserve KB Sandbox's database, RLS, approval and audit records as the operational source of truth.

Do not implement live Working Knowledge as a shared filesystem or Git repository merely to claim OKF compatibility. OKF is an interchange format, not an authorization or workflow engine.

## Administration and retention

Provide bounded organization defaults:

- enable/disable Working Knowledge;
- eligible roles and Projects;
- default and maximum retention periods;
- per-user/Project storage and research budgets;
- external research provider status;
- allowed sensitivity/provider combinations;
- permitted sharing modes; and
- whether promotion destinations are available.

Users should be able to archive their own entries. Deletion, legal hold, retention expiry and administrative metadata access must follow a separately explicit policy. Do not introduce an administrator “read all notebooks” view.

## Audit and provenance

Record events without unnecessarily duplicating content:

- create, update, version and archive;
- use in an Ember turn;
- share and revoke;
- web research query authorization and provider execution;
- refresh and source changes;
- submission, review and promotion; and
- denied or policy-blocked access.

Audit viewers must still be authorized to see content. A platform-level event may state that an item was used or denied without disclosing its title, query or body.

## Suggested implementation stages

### Stage 1 — private Working Knowledge foundation

- Add the durable schema and strict RLS.
- Create private Project-bound research notebooks and working notes.
- Save selected Ember/research results with provenance.
- Add a compact **Working — not company-approved** view.
- Retrieve the current user's relevant entries only in a bound Project.
- Add archive and freshness metadata.

### Stage 2 — sharing and Ember integration

- Share with selected active Project members or the whole Project.
- Add separate shared-working retrieval.
- Integrate Working Knowledge into Ember response provenance, My work and recent work.
- Support explicit notebook attachment/use and safe context switching.
- Add trust-layer counts/badges to structured responses and Artifacts where appropriate.

### Stage 3 — curation promotion

- Submit selected notebook versions through existing curation paths.
- Link submissions and approved destinations back to the originating notebook.
- Preserve immutable submitted snapshots and decision provenance.
- Add return-for-revision and superseded behavior.

### Stage 4 — portability and refinement

- Consider OKF import/export.
- Add improved source refresh, change comparison and claim-level support.
- Evaluate storage, retrieval quality, cost and user comprehension.
- Consider collaborative editing only if real usage justifies it.

## Non-goals for the first release

- Automatically saving every conversation as Working Knowledge.
- Automatically approving or publishing internet research.
- Treating Working Knowledge as company policy.
- Public notebooks or cross-Project sharing.
- A replacement for approved Wiki or source evidence.
- An administrator content-surveillance dashboard.
- Manager access to employee private research.
- Real-time collaborative document editing.
- Full web-page mirroring or unrestricted crawling.
- Background autonomous research without a separate authorization design.
- OKF import/export in Stage 1.
- Replacing existing Workstreams or artifacts with notebooks.

## Acceptance criteria

1. An authorized Project member can create a private research notebook from a Project-bound Ember conversation.
2. The notebook is durably available in a later conversation bound to the same Project.
3. A general/unbound conversation cannot find or enumerate the notebook.
4. The creator cannot use the notebook from a different Project merely by knowing its identifier.
5. Another Project member cannot see a private notebook's title, count, excerpt, citation or direct route.
6. A platform curator or administrator who is not explicitly authorized cannot read private notebook content.
7. Removing the creator's Project membership prevents Ember retrieval and direct access immediately.
8. Every new item is marked **Working — not company-approved** and receives no approved-evidence badge.
9. Ember may use approved and working sources together but accurately distinguishes their trust and provenance in the response.
10. Working content that conflicts with approved guidance is disclosed rather than silently replacing it.
11. External research records provider, query authorization, URLs, retrieval times, bounded excerpts and synthesis provenance.
12. External pages remain untrusted content and cannot change instructions, reveal private context or invoke unrelated tools.
13. Private/restricted Project content is not sent to Tavily or another external research provider without the required safe policy outcome and user confirmation.
14. A user can explicitly select, attach and stop using a notebook in a conversation.
15. Ember does not inject every accessible notebook into every turn.
16. A creator can share a notebook only with active members of the same Project and can revoke that share.
17. Project-wide sharing remains bounded to active Project members and does not expose the item through general Ember.
18. A submitted notebook version is immutable for review even if the working notebook later changes.
19. Submission creates no approved Wiki/source embedding until the existing authorized approval lifecycle reaches that point.
20. Promotion preserves links to the originating notebook version, user, Project, conversations and cited sources.
21. Restricted source content cannot be copied into a less-restricted notebook to broaden access.
22. Archived items are excluded from default retrieval and recent-work suggestions.
23. Stale web research is visibly warned and can be explicitly refreshed.
24. Usage limits return an honest partial/blocked result without losing already saved work.
25. Structured responses, citations and Artifacts preserve trust labels after reload.
26. Direct routes, search, recent work and notifications all re-authorize the item for the current user.
27. Tests prove that platform role, Project membership, sharing and resource access cannot be confused with one another.
28. Existing approved Project retrieval and curation tests remain green.

## Required live regression personas

Test at least:

- a member creating private Project research;
- another member of the same Project without a share;
- a selected shared recipient;
- a Project curator without a share;
- a platform administrator who is not a Project member;
- a consultant with access to the Project but not to one restricted approved source;
- a removed former member; and
- a user belonging only to a different Project.

For each relevant persona, test notebook listings, direct URL, Ember retrieval, recent work, citations, Project switching, sharing, revocation and membership removal.

## Required end-to-end validation

1. From a sales Project, ask Ember to research a newly identified RFP issuer through the configured web provider.
2. Save the synthesis as a private Research notebook.
3. End the conversation and start a new Project-bound conversation.
4. Ask Ember to continue the proposal using yesterday's notebook and approved product evidence.
5. Confirm that the answer distinguishes approved, working and external evidence.
6. Confirm that an unconfirmed customer requirement is shown as an open question.
7. Share the notebook with one Project colleague and confirm access for that colleague only.
8. Revoke sharing and confirm immediate loss of access.
9. Submit a selected notebook version for curation and continue editing the working copy.
10. Confirm the curator reviews the frozen submitted version.
11. Promote appropriate content into an existing governed destination and verify provenance.
12. Repeat direct and Ember access checks using an unauthorized member, non-member curator and platform administrator.

## Success measures

Measure whether Working Knowledge increases usefulness without confusing trust:

- percentage of research conversations saved intentionally;
- later conversations successfully resumed from a notebook;
- time saved in repeated customer/RFP research;
- percentage of users who correctly distinguish working from approved material in usability testing;
- notebooks submitted and promoted into governed knowledge;
- stale/conflicting findings caught before reuse;
- cross-Project or unauthorized-access failures;
- Tavily/research and LLM cost per useful notebook; and
- retrieval precision when users have many notebooks.

Do not treat notebook volume as success. Durable reuse, accurate trust understanding and safe promotion are the meaningful outcomes.

## Documentation updates on completion

- Add Working Knowledge, Research notebook, working/unverified and promotion terminology to the canonical vocabulary.
- Update `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` in the same production commit.
- Update the Ember role-directed request's Stage 3 integration notes if implementation changes its My work or Explore design.
- Document Tavily/provider usage, privacy notice, limits and failure behavior.
- Add the capability and its later OKF/refinement phases to the owner roadmap/change register.
- Provide a short curator guide explaining that notebook submission is not approval.

