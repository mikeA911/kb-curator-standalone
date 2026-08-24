# Development Request: Blog Contributor Workflow and Editorial Placeholders

**Status:** Proposed  
**Created:** 23 August 2026  
**Area:** Public Blog / Administration  
**Priority:** Medium — enables governed editorial contribution without giving publishing authority to every contributor

## Summary

Extend the KB Sandbox Blog so both **curators and administrators can create and edit draft posts**, while **only administrators can publish, unpublish, or delete posts**.

Keep anonymous access limited to published posts. Draft content must remain inaccessible through public routes and public database access.

Also make the planned KB Sandbox/Substack articles visible in the administrative Blog area as an editorial backlog. Several of these articles are already seeded as drafts with complete content; do not create duplicates. Where a planned article does not yet exist in `blog_posts`, create a draft placeholder containing its agreed title, slug, excerpt, source-document reference, and editorial status.

## Current implementation

The Blog currently supports:

- public anonymous listing of published posts at `/blog`;
- public anonymous reading of a published post at `/blog/{slug}`;
- draft and published states;
- administrator authoring UI;
- administrator create, edit, publish, unpublish, and draft-delete actions;
- row-level security allowing public selection only where `status = 'published'`.

However, all write actions currently call `requireRole('admin')`, and the database policy grants Blog authoring only to administrators. Curators cannot create or edit Blog drafts.

## Required permissions

| Capability | Curator | Administrator | Anonymous/public visitor |
| --- | --- | --- | --- |
| View published posts | Yes | Yes | Yes |
| View drafts in editorial UI | Yes | Yes | No |
| Create a draft | Yes | Yes | No |
| Edit own draft | Yes | Yes | No |
| Edit another curator's draft | No by default | Yes | No |
| Submit or mark draft ready for review | Yes | Yes | No |
| Publish | No | Yes | No |
| Unpublish | No | Yes | No |
| Delete a draft | No | Yes | No |
| Delete a published post | No direct deletion | No direct deletion; unpublish first | No |

If the product already has an explicit editorial-assignment model by implementation time, assigned curators may edit assigned drafts. Do not grant every curator unrestricted editing of every other curator's work merely to simplify the query.

## Editorial lifecycle

Use a small, understandable lifecycle:

1. **Draft** — being written by a curator or administrator.
2. **Ready for review** — contributor considers it ready for administrator review.
3. **Published** — approved by an administrator and anonymously accessible.

An administrator may return a ready draft to Draft. Publishing must record the publishing administrator and publication time. Editing a published post should either require unpublishing first or create a new unpublished revision; it must not silently replace live public content without an explicit administrative publication action.

If adding `ready_for_review` would create disproportionate work for this release, retain `draft` and add a nullable `submitted_for_review_at` plus `submitted_by`. The UI must still clearly distinguish work in progress from a draft awaiting administrator attention.

## Deliberately simple editor

Do not turn this work into a general-purpose content-management system. Extend the existing Markdown form rather than introducing a block editor or a large rich-text editing framework.

The Blog editor should provide:

- fields for title, slug, excerpt, and article content;
- **Write** and **Preview** tabs, with Preview using the same Markdown component and styling as the public Blog page;
- a small toolbar for heading, bold, italic, link, bulleted list, numbered list, and quotation formatting;
- **Save draft** as an explicit action, with a visible unsaved-changes indicator;
- **Submit for review** for a curator;
- **Return to draft**, **Approve and publish**, and **Save without publishing** for an administrator;
- a link to preview the complete public-page presentation while the post remains non-public;
- clear validation messages for a missing title, excerpt, content, invalid slug, or malformed link.

Curators may edit their own eligible drafts before and after submission if an administrator returns them to Draft. Administrators may edit any draft during review, but editing must not itself publish the post. The final **Approve and publish** action must show what will become public and require explicit confirmation.

The editor may continue storing Markdown. Authors should not have to see raw Markdown for common formatting operations, but they may edit it directly. Do not add real-time co-authoring, arbitrary page layouts, drag-and-drop blocks, or a second document format for this release.

### Minimal Blog visuals

Allow a curator or administrator to add reviewed visuals while an article is still a draft, without building a general media-management system.

Support only:

- one optional **cover image** for the Blog listing, article header, and social preview;
- an **Add image** action in the article editor for inline images;
- upload to a dedicated public Blog-media bucket or equivalently isolated public storage location;
- automatic insertion of uploaded inline images at the current editor position;
- required alternative text before an image can be inserted or a cover image saved;
- optional visible caption, source/creator, and licence or permission note;
- responsive rendering within the article width;
- display in the same Write/Preview and public-page preview workflow used for the text;
- administrator review of the complete article, including visuals, before publication.

Validate allowed image formats, file size, dimensions, generated storage paths, and content type on the server. Use collision-resistant object names and do not trust the original filename as a storage path. Prevent SVG or other active content unless a separate sanitisation design is approved. Do not proxy arbitrary remote image URLs through privileged infrastructure.

Draft image uploads remain non-editorial assets until referenced by a post. Removing an image from an article must not immediately delete a shared or previously published object. A conservative, separately tested cleanup process may later remove genuinely unreferenced draft uploads after a retention period.

For the first release, importing a Markdown or Word draft imports its text only. Embedded images must be selected and uploaded separately so the author can confirm placement, accessibility text, ownership, and publication permission.

## Ownership and provenance

Add or retain sufficient metadata to show:

- original author;
- last editor;
- created and updated times;
- review-submission time and submitting user;
- publishing administrator;
- publication time;
- source document or editorial source, where applicable.

The existing `author_id` should remain the original author. Do not overwrite it whenever another authorised person edits the post.

For seeded editorial content without a human author, display **KB Sandbox editorial seed** or equivalent until a curator or administrator claims or edits it. Do not falsely attribute migration-generated content to the first administrator who publishes it.

## Server and database enforcement

Permissions must be enforced in both Server Actions/service functions and database row-level security.

- Curator create: allowed, with `author_id` forced to the signed-in user.
- Curator update: allowed only for the curator's own eligible draft, unless explicitly assigned.
- Curator publication-state changes: refused server-side and by database policy.
- Administrator update and publication operations: allowed.
- Public selection: published posts only.
- Draft selection: curator/admin only, with curator ownership or assignment rules applied.
- Client-supplied `author_id`, `published_by`, status, and publication timestamps must not be trusted.

Do not solve this only by showing or hiding buttons.

## Administrative experience

The Administration → Blog view should provide:

- **New draft** for curators and administrators;
- filters for Draft, Ready for review, and Published;
- author and last-updated information;
- a visible **Awaiting review** count for administrators;
- clear permission-aware actions;
- preview of the anonymous public rendering before publication;
- source-material link or reference where one exists;
- an editorial backlog containing the planned posts below.

Curators should not need access to unrelated administration features merely to contribute Blog drafts. Provide an appropriate Blog entry point for the curator role.

## Search visibility and regional launch distribution

Treat the public Blog as the canonical home for KB Sandbox articles and make published posts technically discoverable, shareable, and suitable for responsible distribution to relevant AI-development and enterprise-architecture communities in Southeast Asia.

The launch objective is not bulk promotion or artificial ranking. It is to help practitioners, partners, and professional communities find useful evidence-led AI material and follow a clear path back to the original KB Sandbox article. Sandz Philippines may be one collaboration and distribution channel, subject to mutual agreement. Do not describe Sandz Philippines or any other organisation as a partner, sponsor, customer, or endorser unless that relationship and wording have been explicitly approved.

### Technical SEO

Implement the following for public, published Blog content:

- a dynamically generated `/sitemap.xml` containing the public Blog index and every published post, and excluding drafts, review items, and placeholders;
- a `/robots.txt` that permits indexing of intended public content, references the sitemap, and does not expose or advertise private route names;
- one absolute, self-referencing canonical URL for each published post;
- unique page title and meta description derived from the reviewed title and excerpt;
- Open Graph and X/Twitter sharing metadata, including title, description, canonical URL, content type, and an approved social image;
- valid JSON-LD using `BlogPosting` or `Article`, including headline, canonical URL, publication and modification dates, and only author/publisher information that is genuinely displayed and attributable;
- semantic article markup with one visible page heading, readable heading order, visible publication information, and meaningful image alternative text;
- stable human-readable slugs and permanent redirects when an administrator intentionally changes a published slug;
- `noindex` protection for preview routes if a public-token preview mechanism is introduced;
- an RSS or Atom feed containing published posts so readers and legitimate aggregators can subscribe.

Do not add unsupported structured-data claims, hidden keywords, duplicated location pages, automatically generated keyword variants, or metadata that is not visible or true on the page.

### Internal linking and article discovery

Add editorial support for natural internal links rather than automatically injecting keywords into article text.

- Let an author select related published posts while editing a draft.
- Show a **Related articles** section on the public article page.
- Provide previous/next navigation for an ordered series such as **The Evidence-Led AI Enterprise**.
- Use concise, descriptive anchor text rather than generic labels such as “click here”.
- Ensure every published post is reachable from the Blog index or another crawlable public page.
- Permit links to relevant public Handbook or product-explanation pages where they genuinely help the reader; do not include private Workbench routes.

The editor may suggest possible related posts, but a curator or administrator must approve the links. Existing article prose and citations must not be silently rewritten.

### Cross-publication and backlinks

Backlinks must be earned through relevant publication and collaboration, not purchased, exchanged at scale, or generated through spam.

For content also distributed through Substack, a partner publication, or a professional community:

1. Declare the KB Sandbox Blog URL as the canonical original whenever the external platform supports canonical attribution.
2. Where canonical attribution is unavailable or uncertain, publish a distinct summary, introduction, or commentary externally and link readers to the complete original rather than copying the entire article verbatim.
3. Use descriptive link text that accurately represents the destination.
4. Record the external publication URL against the Blog post for editorial and attribution tracking.
5. Do not imply endorsement by a cited source, community, or distribution collaborator.

Support optional campaign parameters for approved launch links, but store and report a clean canonical URL without tracking parameters. Basic reporting should distinguish direct visits, organic search, Substack, and named approved collaboration channels without collecting unnecessary personal data.

### Prepare for Substack

Add a **Prepare for Substack** action to a saved Blog draft or published post. This is an editorial export, not a Substack publishing integration.

The action should open a reviewable package containing:

- the article title and subtitle or excerpt;
- clean rich text or HTML suitable for pasting into the Substack editor, without visible Markdown heading markers;
- a shorter **Substack edition** that introduces the argument and links to the canonical KB Sandbox article;
- suggested Substack tags;
- suggested social-preview text;
- a short suggested Substack Note for sharing the article;
- the clean canonical KB Sandbox URL;
- separate **Copy** controls for each item;
- an **Open Substack editor** link after the user copies the selected version.

Provide two clearly labelled export choices:

1. **Full article** — for cases where Substack is intentionally the primary or complete publication.
2. **Substack edition** — a distinct shorter adaptation linking to the complete canonical article on `kbsandbox.tech`; recommend this choice when the KB Sandbox Blog is the canonical home.

The generated package may use the configured conversational or structured-output model to propose the adaptation, tags, and sharing text, but it must display the provider/model used, preserve the original draft, and require human review. It must not write the generated adaptation back over the Blog article automatically.

Do not request or store Substack credentials. Do not automate the Substack editor through browser scripting, send subscriber email, choose an audience, schedule a post, or publish on the user's behalf. If Substack later provides a supported draft-creation API, treat that as a separate reviewed integration.

### Delivery slices

Keep implementation manageable by delivering the work in slices:

**Launch slice — required first**

- curator/admin draft permissions and the three-state editorial lifecycle;
- the simple Write/Preview editor and public-page preview;
- one cover image and simple inline image uploads with required alternative text;
- the eight completed article drafts without duplicates;
- anonymous published Blog access;
- essential search metadata, canonical URLs, sitemap, robots policy, and article structured data;
- manual related-article selection;
- Prepare for Substack export and copy workflow;
- permission, privacy, indexing, and publication tests.

**Follow-on slice — after launch**

- RSS/Atom feed;
- ordered series navigation;
- external distribution records and campaign reporting;
- AI-suggested internal links;
- richer social-image management;
- additional editorial analytics.

Do not delay the safe editorial and publication workflow in order to deliver follow-on features.

### Regional editorial relevance

Allow editors to identify a post's intended audience and region without using regional keywords mechanically. Southeast Asian examples should be included only when substantively relevant and supported by reliable sources. Country-specific regulatory or institutional claims require editorial verification immediately before publication.

The public article should remain useful outside the region unless it is deliberately written as a country-specific piece. Avoid creating near-duplicate versions for individual countries merely to target search terms.

### Launch readiness

Before announcing the Blog through Sandz Philippines or other regional channels:

- verify the production site in an anonymous session;
- validate representative posts with a structured-data testing tool;
- submit the sitemap to the relevant search-engine webmaster tools;
- confirm canonical URLs and social preview cards from the deployed site;
- check mobile readability, page performance, and accessibility;
- verify every external citation and remove internal source paths or editorial notes;
- prepare a short, audience-specific introduction for each approved distribution channel rather than sending the same promotional copy everywhere.

## Planned editorial backlog

The following are the agreed Blog/Substack articles. Treat them as editorial placeholders in the development request and as draft records in the product. Existing seeded drafts are authoritative; use slug-based checks and do not insert duplicates.

### Existing general Blog drafts

1. **KB Sandbox Deployment and Server Options**
   - Slug: `deployment-and-server-options`
   - Source: `docs/Deployment/DeploymentServerOptions.md`
   - Current migration: `20260821110001_blog_posts.sql`
   - Editorial note: Review operational estimates and update the recommendation to reflect the accepted dedicated-instance-first architecture decision before publication.

2. **Practical AI Architecture Governance — and Where KB Sandbox Fits**
   - Slug: `practical-ai-architecture-governance-and-kbsandbox`
   - Source: governance Blog material and the externally published governance article
   - Current migration: `20260821120001_blog_post_governance_link.sql`
   - Editorial note: Recheck TOGAF trademark/licensing language before publishing product-specific wording.

### Evidence-Led AI Enterprise series

Series source and publication guidance:

`docs/Substack/SERIES-README.md`

The first seven posts are already represented as draft seed content by `20260821130001_blog_posts_ai_assistant_series.sql` and have Markdown and Word publication sources under `docs/Substack`. The eighth post has a completed Markdown source and must be added to `blog_posts` as a full unpublished draft, not merely as an empty placeholder. Use a duplicate-safe slug check.

3. **Your AI Assistant Should Tell You Which Model Answered**
   - Slug: `your-ai-assistant-should-tell-you-which-model-answered`
   - Source: `docs/Substack/01-Your-AI-Assistant-Should-Tell-You-Which-Model-Answered.md`

4. **Conversation History Is Not the Same as AI Memory**
   - Slug: `conversation-history-is-not-ai-memory`
   - Source: `docs/Substack/02-Conversation-History-Is-Not-AI-Memory.md`

5. **Why AI Responses Need Structure, Not Just Markdown**
   - Slug: `why-ai-responses-need-structure-not-just-markdown`
   - Source: `docs/Substack/03-Why-AI-Responses-Need-Structure.md`

6. **The Document-First Principle for Enterprise AI**
   - Slug: `the-document-first-principle-for-enterprise-ai`
   - Source: `docs/Substack/04-The-Document-First-Principle.md`

7. **A Private AI Journal Should Belong to the Individual**
   - Slug: `a-private-ai-journal-should-belong-to-the-individual`
   - Source: `docs/Substack/05-A-Private-AI-Journal-Should-Belong-to-the-Individual.md`

8. **Private AI Deployment Is an Operating Model, Not a Docker File**
   - Slug: `private-ai-deployment-is-an-operating-model`
   - Source: `docs/Substack/06-Private-AI-Is-An-Operating-Model.md`

9. **One Default AI Model Is Not Enough**
   - Slug: `one-default-ai-model-is-not-enough`
   - Source: `docs/Substack/07-One-Default-AI-Model-Is-Not-Enough.md`

### Additional completed draft and future editorial placeholders

Add these as backlog placeholders only if they are not yet full Blog drafts. Do not publish automatically.

10. **Agent Harnesses: Operating and Governing Enterprise AI Agents**
    - Suggested slug: `agent-harnesses-operating-and-governing-enterprise-ai-agents`
    - Source: `docs/workbench-handbook-agent-harnesses.md`
    - Editorial note: Adapt the Handbook article for a public audience; distinguish execution harnesses from governance harnesses and avoid exposing internal implementation details.

11. **Why Enterprise AI May Start with Dedicated Customer Instances**
    - Suggested slug: `why-enterprise-ai-may-start-with-dedicated-customer-instances`
    - Source: `docs/architecture-decisions/ADR-0001-dedicated-instance-first-deployment.md`
    - Editorial note: Convert the decision into a vendor-neutral architecture discussion rather than publishing the internal ADR directly.

12. **Before the AI-Native SDLC: Test What Is Worth Building**
    - Suggested slug: `before-the-ai-native-sdlc-test-what-is-worth-building`
    - Source: `docs/Substack/08-Before-the-AI-Native-SDLC.md`
    - Required treatment: Import the complete source as a full unpublished Blog draft. Do not reduce it to a title-only placeholder and do not publish it automatically.
    - Editorial note: Publish only after administrator review as an independent response to Anthropic's AI-Native SDLC Playbook. Retain the non-endorsement disclosure and recheck the source link before publication.

## Placeholder behaviour

A placeholder is an unpublished editorial record, not a public teaser.

It should contain:

- working title;
- proposed slug;
- short editorial brief or excerpt;
- source-document reference;
- intended series, if applicable;
- author/owner where assigned;
- status and review notes.

Placeholder content and internal source paths must never appear on anonymous routes. When a full seeded draft already exists, the UI should present that draft rather than a second placeholder.

## Acceptance criteria

1. A curator can access the Blog contributor area without receiving access to unrelated administrator functions.
2. A curator can create a draft whose original author is recorded as that curator.
3. A curator can edit their own eligible draft.
4. A curator cannot edit another curator's unassigned draft by changing a URL or identifier.
5. A curator can mark their draft ready for review.
6. A curator cannot publish, unpublish, or delete a post through the UI, Server Actions, direct database access, or crafted requests.
7. An administrator can review, edit, publish, unpublish, and delete eligible drafts.
8. Publishing records the publishing administrator and publication time.
9. Anonymous users can list and read published posts without signing in.
10. Anonymous users cannot read draft, ready-for-review, placeholder, or unpublished content by guessing a slug.
11. The nine existing seeded posts appear once in the editorial backlog, using their existing drafts rather than duplicate rows.
12. **Before the AI-Native SDLC: Test What Is Worth Building** is created once as a complete unpublished draft from its Markdown source.
13. The Agent Harness and dedicated-instance articles appear as unpublished editorial placeholders unless full drafts already exist.
14. Existing production posts remain available and retain their slugs.
15. Automated tests cover curator ownership, administrator publication, anonymous access, guessed draft slugs, and duplicate-safe draft and placeholder creation.
16. Database migrations are safe for environments where the existing Blog seed migrations have already run.
17. Type checking, linting, production build, and the full automated test suite pass.
18. `/sitemap.xml` lists the Blog index and all published posts, while excluding drafts, review items, and placeholders.
19. `/robots.txt` references the production sitemap and does not make private content discoverable.
20. Every published post emits a unique title, description, absolute canonical URL, social-sharing metadata, and valid article JSON-LD based on truthful stored data.
21. Draft, preview, ready-for-review, and placeholder content cannot be indexed or retrieved anonymously.
22. Published articles can be assigned related posts and an ordered series, with crawlable descriptive links on public pages.
23. An administrator can record approved external publication and distribution URLs without changing the canonical Blog URL.
24. Automated tests cover sitemap filtering, canonical generation, metadata escaping, structured-data output, slug redirects, and exclusion of private editorial records.
25. An RSS or Atom feed exposes published posts only.
26. Production launch verification includes structured-data validation, social-card inspection, mobile/accessibility checks, and sitemap submission.
27. Curators and administrators can edit eligible posts using Write and Preview views, and Preview uses the public Markdown renderer.
28. Editing or saving a post never changes its publication state implicitly.
29. An administrator sees an explicit confirmation before approving and publishing the reviewed content.
30. Prepare for Substack produces reviewable full-article and shorter-edition packages with separate copy controls and a canonical KB Sandbox link.
31. Preparing a Substack package does not modify the source article, store Substack credentials, contact subscribers, or publish externally.
32. A curator or administrator can add one cover image and inline images to an eligible draft, and see them in the same rendering used for public publication.
33. Image uploads enforce server-side format, size, content-type, path, and role checks, and require alternative text.
34. Anonymous users cannot enumerate draft-only media through application APIs, and draft content remains inaccessible even if an uploaded public image object has an unguessable URL.
35. Publishing displays only the images referenced by the reviewed article and emits the approved cover image in applicable social metadata.
36. Removing an image reference does not immediately delete an object that may still be referenced by another or previously published article.

## Out of scope

- allowing curators to publish;
- public comments;
- subscriptions or email delivery;
- collaborative real-time editing;
- a block-based or full WYSIWYG content-management system;
- a general media library, folders, asset search, image editing, or digital-asset-management workflow;
- automatic extraction of embedded images from Word or Markdown import packages;
- automatic AI image generation;
- automatically publishing on a schedule;
- automatically copying posts to Substack;
- direct Substack authentication or browser automation;
- automatically posting to social networks, communities, partner sites, or mailing lists;
- automated backlink exchanges, paid-link acquisition, or bulk outreach;
- automatically generating country or keyword variants of an article;
- publishing internal ADRs, test reports, secrets, or implementation notes without editorial adaptation;
- a full content-management system with arbitrary page types.

## Deployment verification

After deployment, verify in an anonymous browser session:

- `/blog` loads and appears in the public header;
- published posts render at `/blog/{slug}`;
- draft and placeholder slugs return not found;
- no sign-in is required for published content.

Then verify as a curator and administrator that the role boundary above is enforced end to end.
