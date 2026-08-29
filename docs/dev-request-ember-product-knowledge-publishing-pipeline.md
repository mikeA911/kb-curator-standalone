# Development Request — Ember Product Knowledge Publishing Pipeline

**Status:** Proposed  
**Priority:** P1 — product reliability before wider pilot use  
**Public roadmap alignment:** M1 Curate, M2 Organize, M3 Evaluate, M5 Apply, M7 Govern, M8 Communicate

## Problem

KB Sandbox is changing quickly. New pages, permissions, workflows, assistant capabilities and blog posts may be deployed without becoming part of Ember's approved retrieval knowledge. Ember can therefore give an incomplete or outdated explanation of the product even when the application itself is working correctly.

Deployment alone must not make development notes, source code or editorial claims authoritative. Ember needs a governed path from an implemented user-visible change to current, approved and testable product knowledge.

## Objective

Create a lightweight **Product Knowledge Publishing Pipeline**:

`implemented change → release knowledge draft → Handbook review → approval → indexing → Ember regression check → current product knowledge`

The pipeline should make Ember reliably aware of current user-visible KB Sandbox capabilities while preserving human approval, source provenance, version history and access boundaries.

## Knowledge hierarchy

When answering questions about KB Sandbox itself, Ember should prefer sources in this order:

1. approved, current Product Handbook/Wiki knowledge;
2. approved release notes for the deployed application version;
3. other approved platform Wiki guidance;
4. published blogs as explanatory or editorial context; and
5. conversation history only for continuity, never as product truth.

Source code, unapproved development requests, implementation chat, test reports and unpublished blog drafts must not silently become Ember knowledge.

If a blog conflicts with current approved product documentation, Ember must use the product documentation and, where useful, explain that the blog is contextual or may describe an earlier/future state.

## Stage 1 — Product knowledge records and manual publishing

Add or reuse a dedicated **Product Handbook** category for concise, user-facing articles covering:

- pages and navigation;
- available capabilities;
- role and permission behavior;
- common workflows;
- known limitations or deliberate deferrals; and
- relevant links within KB Sandbox.

Each product-knowledge version should retain:

- feature or capability identifier;
- title and summary;
- applicable application version or deployment reference;
- status: draft, in review, approved/current, superseded or retired;
- intended audience and applicable roles;
- related routes;
- related development request or release record;
- author, reviewer and approval timestamps;
- last verified date; and
- source/version provenance required by the existing Wiki lifecycle.

Provide a curator/admin workflow to create or update a product article, preview the changes, approve it and trigger indexing. Existing Wiki versioning and approval should be reused wherever practical.

## Stage 2 — Release knowledge assistance

For a deployment containing user-visible changes, allow a developer, curator or admin to prepare a structured release-knowledge draft containing:

- what changed;
- who can use it;
- where the user finds it;
- the normal user workflow;
- permission or project-scope considerations;
- known limitations;
- related Handbook articles; and
- the deployed version or commit reference.

The system may generate a first draft from an approved development request and supplied implementation/test summary. It must not infer authoritative behavior directly from code and publish it without review.

The reviewer should be able to:

- update an existing article rather than create a duplicate;
- mark an older article/version as superseded;
- identify that no documentation change is required; or
- return the draft for correction.

Only approved content is indexed for Ember.

## Stage 3 — Index synchronization and freshness

On approval or supersession:

- chunk and embed the approved current version using the existing Wiki pipeline;
- remove superseded or retired versions from normal retrieval without deleting their audit history;
- record indexing status, timestamp, checksum and failure details;
- support safe retry after an indexing failure; and
- make partial failure visible to curators rather than presenting the change as complete.

Provide a small owner/curator view showing:

- approved product articles awaiting indexing;
- failed or stale indexes;
- deployed features without a verified product-knowledge record, where known; and
- articles whose last verification predates a related deployment.

Do not rebuild the entire corpus when only one approved article changed unless the embedding configuration itself changed.

## Stage 4 — Ember behavior and response details

Update Ember's product-question guidance so that it:

- retrieves approved current Product Handbook knowledge first;
- distinguishes **Current product guidance**, **Release note** and **Blog/editorial context**;
- does not claim a proposed or unpublished capability is live;
- states when it cannot verify the current behavior;
- offers a relevant in-app navigation action where available; and
- exposes source title, source type, version/applicability, approval state and last-updated date in response details.

Blogs may help Ember explain why a capability matters, provide examples or discuss future direction. They must not override the Product Handbook or be presented as operational instructions unless the same information is verified in approved product guidance.

## Stage 5 — Post-deployment knowledge checks

Allow every user-visible release to carry a small set of Ember verification questions, for example:

- What does this feature do?
- Who can use it?
- Where can I find it?
- What information can it access?
- What does it deliberately not do yet?

Run these checks after the approved documentation is indexed. Record:

- expected key facts and prohibited claims;
- retrieved sources and versions;
- answer result;
- provider/model used;
- latency and tool/retrieval failure; and
- pass, fail or human-review-needed status.

A failed knowledge check should warn the owner/curator and must not roll back otherwise healthy application code automatically.

## Suggested delivery boundary

For the first implementation, reuse the existing Wiki, version, approval, source-link and vector infrastructure. Add the minimum metadata and operational views needed to distinguish product truth from general Wiki or blog content.

Do not build:

- a second documentation CMS;
- autonomous documentation publication from source code;
- unrestricted repository access for Ember;
- automatic promotion of developer conversations to approved knowledge; or
- a full release-management platform.

## Guardrails

- Human approval remains required before product knowledge becomes authoritative or retrievable by Ember.
- Only deployed behavior should be marked current; planned behavior must be clearly labeled proposed or future.
- Project-private or customer-specific behavior must remain inside its authorized project boundary and must not enter the platform Product Handbook.
- Release drafts and test evidence may contain sensitive implementation detail and must follow their existing authorization rules.
- Failed indexing, missing documentation and stale verification must be visible and auditable.
- Historical versions remain available for audit but are excluded from ordinary current-product answers.
- Ember may explain uncertainty; it must not fill documentation gaps with confident guesses.

## Acceptance criteria

1. A curator/admin can create or update an approved Product Handbook article for a user-visible change.
2. Approval indexes the current version and makes it retrievable by Ember.
3. Updating an article supersedes the previous version without losing its audit history.
4. Superseded and retired content is excluded from ordinary current-product retrieval.
5. Ember prefers current approved product guidance over blogs and older contextual sources.
6. Ember labels product guidance, release notes and blogs distinctly in response details.
7. A published blog cannot cause Ember to describe an unimplemented capability as live.
8. Product articles retain applicable release/version, routes, audience, roles, provenance and verification dates.
9. Indexing failures are visible and safely retryable.
10. A release can define and run product-knowledge verification questions after indexing.
11. Verification records the answer, retrieved sources, model provenance and result.
12. Authorization tests confirm that private project/customer knowledge cannot leak into the platform Product Handbook or an unrelated user's Ember answer.

## Recommended implementation sequence

1. Audit the existing Wiki categories, version lifecycle, embedding pipeline and Ember retrieval ranking.
2. Add Product Handbook classification and minimal release/applicability metadata.
3. Implement manual create/update/approve/index workflow and supersession behavior.
4. Update Ember's retrieval priority, source labels and uncertainty behavior.
5. Add release-knowledge drafting assistance from approved inputs.
6. Add freshness/index health view and post-deployment verification questions.
7. Live-test one recently shipped UI feature, one permission-sensitive workflow and one published blog whose wording describes future direction.

## Initial content backfill

Before declaring the feature complete, create or verify Product Handbook coverage for the most visible current areas:

- Dashboard and navigation;
- Ember conversations, project binding, artifacts and navigation actions;
- Projects, membership, governance authorities and project knowledge;
- source upload, review, approval, versioning and retrieval;
- Wiki authoring, visibility and publication;
- blog contribution, review, publication, visuals and Substack preparation;
- private journals and their current limitations;
- owner feedback/problem reporting; and
- AI provider/model roles visible to administrators and users.

This backfill should describe the deployed application at the time of verification, not merely restate older development requests.
