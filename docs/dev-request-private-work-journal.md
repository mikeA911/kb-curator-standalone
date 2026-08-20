# Development Request: Private Personal Work Journal

**Status:** Proposed  
**Created:** 20 August 2026  
**Area:** Workbench Assistant / Personal history  
**Priority:** Product enhancement requiring privacy review

## Summary

Add a **Journal** action that lets a user turn their own KB Sandbox activity and Assistant conversation history from a selected date range into a private, downloadable document. The journal should help the user remember, review, and reflect on what they have been doing over periods such as the last month or last six months.

The journal is a user-requested export, not an additional form of Assistant memory. Its generated content must not be inserted into conversation context, indexed for retrieval, used to personalize later Assistant responses, or retained as a platform artifact unless the user explicitly chooses a separate save or sharing action in a future enhancement.

## Product intent

The journal should help a user answer questions such as:

- What have I worked on recently?
- Which projects and workstreams occupied my attention?
- What decisions did I make?
- What did I learn or change my mind about?
- Which artifacts or outcomes did I produce?
- What remained unfinished?
- What patterns or recurring interests appeared?
- What might I want to revisit next?

The tone should feel reflective and human rather than like an employee-performance report. It may help the user reminisce, notice progress, and recover context they have forgotten.

## Primary experience

Add a **Journal** button in an appropriate personal area and optionally in the Assistant history panel. Selecting it opens a simple form with:

- **Date range:** Last 30 days, Last 6 months, This year, or Custom range;
- **Include:** Assistant conversations, projects/workstreams touched, artifacts created or updated, and optionally other user-owned activity supported by reliable provenance;
- **Detail:** Brief, Standard, or Detailed;
- **Style:** Reflective journal by default, with a factual activity summary as an alternative;
- **Generate journal** action.

After generation, show a private preview and allow the user to download a `.docx` document. A plain-text or Markdown download can be considered later, but DOCX is the initial required format.

Suggested document structure:

1. Title and covered date range;
2. A month-by-month or week-by-week narrative;
3. Projects and themes explored;
4. Decisions, milestones, and accomplishments;
5. Lessons, changed assumptions, and memorable moments;
6. Open questions and unfinished threads;
7. Items the user may want to revisit;
8. Source appendix linking back to the user's original conversations and records where appropriate.

The narrative must distinguish recorded facts from AI-generated reflection. It should not fabricate achievements, emotions, motivations, or conclusions that are not supported by the selected history.

## Source scope

The generator may read only records the requesting user is currently authorized to access and only records within the selected date range. Candidate sources include:

- the user's Assistant conversations and messages;
- projects and workstreams created or modified by the user where authorship/activity provenance exists;
- artifacts, notes, and other records attributable to the user;
- explicit decisions and confirmed facts from conversation summaries;
- navigation/activity events only if they carry meaningful, privacy-reviewed provenance.

Do not infer that the user personally performed an action merely because they can view a shared project. Include shared or collaborative records only when the journal can accurately describe the user's relationship to them.

The source-selection service should return provenance-bearing entries rather than a single untraceable text dump. The journal should be able to link important statements to their underlying conversation, project, workstream, or artifact.

## Privacy and ownership

The journal is private to the individual user by default.

- Other users, organization owners, employers, managers, and ordinary administrators must not be able to view, generate, list, or download another user's journal through the product.
- A user's access to organizational work records does not give the organization ownership of the user's generated reflective journal.
- The generated document must not be saved to a shared project, workstream, Wiki, artifact library, or organization file area automatically.
- Initial sharing should occur outside the product: the user downloads the document and chooses what to do with it.
- If in-product sharing is added later, it must be an explicit, revocable user action with a visible recipient and scope. It must never be implied by organization membership.
- Privileged service access, backups, legal obligations, and operational access must be accurately documented; the UI must not make an absolute confidentiality claim that the technical and legal design cannot support.

Employer access is therefore **not permitted unless the user deliberately shares the exported document or a future explicit sharing feature grants access**.

## Separation from Assistant context and memory

Journal generation is a one-way, on-demand read of authorized source history.

The generated journal must not:

- be appended to `chat_messages`;
- update conversation summaries or long-term-memory records;
- be embedded or added to semantic retrieval indexes;
- be used as context for a later Assistant turn;
- change user-profile assumptions;
- appear in administrator content-review interfaces;
- train or evaluate models unless the user gives separate, informed consent.

The act of requesting a journal may create minimal operational metadata such as request time, selected date range, completion status, model/provider, token usage, and error details. That metadata must not contain the generated prose or source-message content.

If the user later uploads their downloaded journal as evidence, treat that as a new, explicit ingestion action governed by the normal evidence workflow—not as automatic memory.

## Generation and retention

Prefer transient generation:

1. Build an authorized, bounded source set.
2. Generate the journal in a private server-side job.
3. Render the result to DOCX.
4. Stream or provide a short-lived, user-bound download.
5. Delete temporary source bundles and generated files after download or a short documented expiry.

Do not place journal files at guessable public URLs. Any temporary download token must be short-lived, single-user, and resistant to reuse by another account.

If generation is interrupted, report failure without leaving a partially accessible document. Temporary storage and job logs must follow the same privacy boundary.

## Context and model strategy

A six-month range may exceed a model's context window even when the stored data is relatively small. Do not send the entire raw history in one prompt.

Use a hierarchical process:

1. Select relevant user-attributable source records within the date range.
2. Divide them by month, project, or another stable boundary.
3. Create provenance-bearing intermediate summaries within fixed token budgets.
4. Synthesize the final journal from those summaries.
5. Verify major factual claims against the selected sources.

Intermediate summaries are temporary generation state, not conversation memory. Delete them with the job unless the user explicitly saves the output under a future feature.

Apply defensive limits to source count, source size, date-range duration, concurrent jobs, model tokens, and output length. If a range is too large, offer to reduce detail or create separate documents by period rather than silently omitting most activity.

## User controls and transparency

Before generation, explain:

- which categories of personal history will be read;
- the selected date range;
- that AI will summarize and reflect on those records;
- which provider/model will process the content;
- that the journal will not become Assistant memory;
- that the resulting file is private unless the user chooses to share it.

Allow the user to exclude individual conversations, projects, or source categories before final generation. The preview should make AI-generated reflection visibly distinct from direct quotations or recorded facts.

Avoid long verbatim reproduction of conversations. Summarize by default and use short excerpts only when they materially support a memorable point.

## Functional requirements

### 1. User-scoped source collection

Implement a server-side journal-source service that applies the requesting user's authorization and the selected date range to every source type. Do not rely only on client-supplied user IDs or record identifiers.

### 2. Journal generation job

Use a bounded job suitable for ranges larger than a single request. The job must expose progress without leaking source content and support safe retry without producing duplicate retained files.

### 3. Private preview and download

Render a preview accessible only to the requesting user, then produce a well-formatted DOCX with headings, dates, readable spacing, page numbers, and a source appendix. Visually verify the DOCX generation path during implementation.

### 4. No implicit persistence

Do not create a permanent journal-content table for the first version. Store only minimal non-content operational metadata if required for reliability and auditing. Temporary content must have an enforced expiry.

### 5. Optional future sharing

Treat in-product sharing as a separate design increment requiring explicit grants, revocation, recipient visibility, access logs, and a decision about whether the shared copy remains available after the source journal expires.

## Out of scope for the initial version

- Automatic weekly or monthly journal generation;
- employer, manager, or organization dashboards of personal journals;
- using journal prose as cross-conversation memory;
- silently saving journals as project artifacts;
- performance scoring, productivity rankings, or employee surveillance;
- in-product sharing or collaborative editing;
- permanent hosting of downloaded journals.

## Acceptance criteria

1. A user can choose a supported date range and generate a journal from their own authorized history.
2. The default output is a reflective, readable DOCX rather than a raw transcript export.
3. The journal identifies its covered date range and the major source categories used.
4. Important factual claims can be traced to source conversations or application records.
5. The generator does not attribute shared organizational activity to the user without supporting authorship/activity provenance.
6. The user can exclude source categories and individual records before generation.
7. The UI discloses the processing provider/model and explains that the output does not become Assistant memory.
8. Journal content is not inserted into messages, summaries, embeddings, long-term memory, Wiki content, projects, workstreams, or artifacts.
9. Other users, employers, managers, organization owners, and ordinary administrators cannot access the preview or download unless the user independently shares the exported file.
10. Temporary source data, intermediate summaries, previews, and files expire according to a documented short retention period.
11. Download access is bound to the requesting user and cannot be reused successfully by another user.
12. Large date ranges are summarized hierarchically within explicit limits rather than silently truncated.
13. Failure or cancellation does not leave an accessible partial journal.
14. Minimal operational logs contain no generated journal prose or raw conversation content.
15. Deleting an underlying conversation before generation prevents it from being included.
16. Tests cover user isolation, organization-boundary access, custom date ranges, excluded sources, large histories, expiry, failed jobs, and download authorization.

## Suggested validation scenarios

### Last month

1. Generate a standard journal for the last 30 days.
2. Verify that it summarizes relevant conversations and user-attributable work in a reflective narrative.
3. Confirm that links in the source appendix resolve only while the user remains authorized to access those records.
4. Download and visually inspect the DOCX.

### Six months

1. Generate a detailed six-month journal for a heavy user.
2. Confirm that the job uses bounded intermediate summaries and reports progress.
3. Verify that early months remain represented and that the output was not dominated only by the most recent context.

### Privacy boundary

1. Generate a journal as one organization member.
2. Attempt to list, preview, or download it as another member, the user's manager, an organization owner, and an ordinary application administrator.
3. Confirm that all attempts fail without disclosing journal metadata or content.
4. Download the journal as its owner and confirm that sharing the local file remains the owner's independent choice.

### Memory separation

1. Generate and download a journal.
2. Start a new Assistant conversation and ask about a reflection that exists only in the journal's generated prose.
3. Confirm that the Assistant does not know or retrieve that prose unless the user explicitly supplies the document again.

## Implementation note

The existing user-owned `conversations` and `chat_messages` tables provide a primary history source. Other activity sources should be included only where the platform has reliable authorship or actor provenance. The initial version should favor privacy, source traceability, and transient generation over a permanent journal subsystem.
