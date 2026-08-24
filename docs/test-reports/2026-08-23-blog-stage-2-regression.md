# Blog Stage 2 Regression Test

**Date:** 23 August 2026  
**Scope:** Blog contributor foundation and Stage 2 editor/preview  
**Result:** Conditional pass — one publication-integrity defect should be fixed before proceeding

## Automated verification

- Full Vitest suite: 629/629 tests passed across 84 files.
- TypeScript check: passed.
- ESLint: passed.
- Production build: passed.

The expected error logging in Wiki embedding failure-path tests appeared during the suite and did not represent test failures.

## Live verification completed

- Administrator Blog navigation and contributor entry point rendered correctly.
- Empty title, excerpt, and content produced inline validation.
- Invalid slug produced an inline validation error.
- Bold formatting wrapped a selected value correctly.
- Write and Preview tabs operated correctly.
- Preview rendered headings, emphasis, links, lists, and block quotations through the public Markdown presentation.
- Creating a post produced a Draft owned by the signed-in administrator.
- Saving an edited draft retained Draft status and used the **Save without publishing** label.
- Publication recorded and displayed the publishing administrator.
- The published article rendered with the same body structure observed in Preview.
- Published title and description metadata matched the reviewed fields.
- Anonymous requests returned:
  - `200` for `/blog`;
  - `200` for the published regression article;
  - `404` for a known draft placeholder slug;
  - `307` to `/login` for `/contribute/blog`.
- The anonymous Blog index contained the published regression article and did not contain the tested draft placeholder.
- The administrative Blog list showed the expected 12 seeded/existing records plus the temporary regression record. Seeded attribution remained **KB Sandbox editorial seed**.

## Finding 1 — Published posts remain directly editable

**Severity:** High for editorial integrity; fix before continuing dependent Blog stages.

The editor remains enabled when `post.status === 'published'` and displays **Save without publishing**. `updateBlogPostAction` calls `updatePost`, which updates the same `blog_posts` row regardless of publication status and revalidates the public Blog routes. Consequently, saving changes to a published post silently replaces live public content without unpublishing or performing another approval action.

This conflicts with the development request:

> Editing a published post should either require unpublishing first or create a new unpublished revision; it must not silently replace live public content without an explicit administrative publication action.

### Required correction

Use the smaller first-release solution: lock title, slug, excerpt, and content editing while a post is published. Display an explanation and require the administrator to **Unpublish** before editing. Enforce this in the Server Action/service layer and database policy or update predicate, not only by disabling fields.

Do not build a revision subsystem merely to resolve this defect.

Add tests proving that a crafted update against a published post is rejected and that unpublishing returns it to an editable Draft with review-submission markers cleared.

## Finding 2 — Structurally incomplete Markdown links are not detected

**Severity:** Low.

The malformed-link check only examines complete strings matching `[...] (...)`. An incomplete value such as:

```text
[broken link](not a url
```

is ignored because it does not match the regular expression at all. The editor therefore showed no link validation error for this structurally incomplete link.

Either extend validation to detect common unmatched Markdown link delimiters or narrow the UI wording and acceptance claim from “malformed links” to “invalid destinations in complete Markdown links.” The first option is preferable if it remains small and well tested.

## Finding 3 — General validation banner remains after fields are corrected

**Severity:** Low.

After an initial failed save, individual field errors cleared as their fields were corrected, but **Fix the highlighted fields before saving** remained visible until the next save attempt. Once no field errors remain, clear the general banner as well.

## Publication confirmation observation

The source contains the agreed `window.confirm` message with the post title and destination. During browser automation, activating **Approve and publish** proceeded to publication without exposing an inspectable JavaScript dialog to the test controller. The resulting publication state and public page were verified. This is not recorded as an application defect because the confirmation implementation and message are present in source, but a manual human click-through should remain part of release verification.

## Temporary test artifact

The regression created and published:

- Title: **Regression Test — Blog Editor**
- Slug: `regression-test-blog-editor-20260823`

The user explicitly approved cleanup. It was unpublished and permanently deleted, and its public slug was verified to return `404` afterward.

## Recommended gate

Ask Claude to correct Finding 1 and the two small validation issues, rerun the complete checks, and repeat the focused live tests. After that, Stage 2 can pass and later Blog stages can proceed.
