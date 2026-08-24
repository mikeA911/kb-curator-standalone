# Blog Regression Pass

**Date:** 2026-08-24  
**Environment:** Local development (`http://localhost:3000`)  
**Account:** Administrator  
**Result:** **Conditional pass — application workflow is ready; one trust-boundary decision remains**

## Scope

Fresh verification of the current Blog implementation after the Stage 2 and launch-slice corrective work, covering:

- administrator access and Blog listing;
- new-draft entry points;
- published-post integrity;
- editor validation and correction behavior;
- document-import entry point;
- public/draft isolation;
- public rendering and SEO;
- Substack preparation;
- previously reported image, redirect, storage, and HTML-safety defects; and
- the complete automated/build checks.

No Blog post was created, changed, published, unpublished, linked, or deleted during this pass. Validation was exercised in an unsaved new-post form only.

## Automated checks

- Full test suite: **706/706 tests passed** across 88 files.
- Blog action tests: **33 passed**.
- Blog import tests: **17 passed**.
- Blog toolbar tests: **18 passed**.
- Blog validation tests: **16 passed**.
- Blog Substack-export tests: **9 passed**.
- TypeScript check: passed.
- Lint: passed.
- Production build: passed.

The Wiki embedding messages printed during the test run are expected failure-path tests and did not represent test failures.

## Live checks that passed

### Administration and authoring

- The signed-in administrator could open the Blog administration list.
- The list showed draft and published states clearly and exposed the correct edit routes.
- `/admin/blog/new` offered the intentionally small choice between **Start writing** and **Import a document**.
- The administrator new-post route now passes `/admin/blog` as its return destination, correcting the previously observed `/admin/{id}/edit` redirect defect.
- Manual authoring displayed title, slug, excerpt, body, Write/Preview controls, the small formatting toolbar, image insertion, and Save draft.
- Document import clearly advertised `.docx`, `.md`, `.markdown`, and `.txt` with a 10 MB limit; Convert remained disabled until a file was selected.

### Publication integrity

- The published deployment article opened with its complete editor fieldset disabled.
- Title, slug, excerpt, content, cover-image controls, Write/Preview tabs, formatting controls, and save action were disabled.
- The interface explained that the article must be unpublished before editing.
- **Unpublish** remained available.
- The service update is restricted by both post ID and `status = 'draft'`, selects the affected row, and rejects a zero-row result. Automated tests prove a crafted call through this supported update boundary cannot change a published row.
- Unpublish behavior is covered by tests proving publication and review markers are cleared.

### Validation

- Submitting the blank unsaved form produced field-specific messages and the general **Fix the highlighted fields before saving.** message.
- Supplying valid title, slug, excerpt, and content cleared both field errors and the general message immediately, without requiring another save attempt.
- The incomplete structure `[broken link](not a url` produced a specific malformed-link message.
- Correcting it to a valid relative link removed the error and general message immediately.
- Automated coverage includes missing delimiters, empty or unsupported destinations, HTTPS, relative, anchor, and `mailto:` links.

### Public access and SEO

- `/blog` showed only the published deployment article.
- A known draft Blog slug returned `404`.
- `/sitemap.xml` listed the site root, Blog index, and published deployment article only.
- `/robots.txt` exposed a small public allow-list without naming private application routes.
- The published article emitted the expected canonical URL, Open Graph `article` type, `summary_large_image` Twitter card, and `BlogPosting` JSON-LD with an organization publisher and no personal author.

### Substack preparation

- Prepare for Substack completed successfully through Groq using `openai/gpt-oss-120b`.
- The UI identified the provider/model and reminded the editor that generation does not publish or modify the original.
- It produced a shorter edition, suggested tags, social preview text, a suggested Note, the canonical URL, and copy controls.
- `rehype-sanitize` is now present in the HTML pipeline.
- Automated tests prove `javascript:` links and `data:` image sources are removed while supported safe links remain usable.

### Images and storage

- Inline image insertion now adds block-safe separators and is covered at the beginning, middle, end, selection-replacement, and already-separated positions.
- Cover uploads compensate for a failed row update, remove a replaced cover, and remove the known cover object when a draft is deleted.
- Server-side upload validation continues to reject empty, oversized, SVG, and unsupported files.

## Trust-boundary decision

### Direct administrator database updates are not blocked by RLS

The supported Blog service and Server Action are protected: `updatePost` adds `status = 'draft'`, checks that a row was returned, and rejects a crafted call targeting a published post.

The database policy is deliberately broader. `blog_posts_update_admin` allows an authenticated administrator to update any Blog row, including a published row, because the same policy is used for publish and unpublish transitions. Therefore, a direct Supabase Data API/database update made with an administrator session can bypass the editor's publication workflow.

The current automated “crafted update” test verifies the service query predicate with a fake Supabase client; it is not an integration test proving that RLS rejects a direct administrator update.

This needs an explicit decision:

- If Server Actions are the trusted write boundary and administrators are trusted not to call Supabase directly, document that boundary and accept the current design.
- If the requirement is that even a crafted request using an administrator session cannot change published content directly, move publication transitions behind a restricted database function or otherwise redesign the policies so ordinary content updates and status transitions have separate database privileges. Add a real integration test against Supabase.

This is not a defect in the visible Blog workflow, but the literal database/RLS requirement from the corrective request is not yet demonstrated.

## Non-blocking follow-ups

### 1. Substack backlink presentation is still model-dependent

The generated edition included the article title in bold followed by a hyperlink whose visible text was the raw canonical URL. This is valid and safe, but not as polished as making the article title itself the descriptive hyperlink.

The prompt requests descriptive link text, but the model did not consistently follow that presentation rule. Consider a deterministic final transformation or a small output validation/retry rule if polished backlinks are a launch requirement. This does not block Blog publication.

### 2. Inline-image storage still has no ownership lifecycle

Cover-image cleanup is substantially improved. Inline uploads, however, still return a public URL without recording which draft owns the object. If an author uploads an inline image and abandons it, removes its Markdown, or deletes the draft, the application cannot reliably identify that object for removal.

Keep this as a storage-hygiene backlog item: introduce upload ownership/reference metadata or a conservative reconciliation/garbage-collection process before Blog media volume becomes material. It is not a blocker for the small launch slice.

## Additional observation

The development server logged Next.js performance warnings because the application/branding header images use `fill` without a `sizes` property. This is not specific to Blog correctness, but adding an accurate `sizes` value would remove the warning and improve image selection performance.

## Recommendation

The previously reported visible release blockers are resolved. The Blog feature is suitable to proceed to the documentation-focused stage described by Claude, provided the team explicitly accepts Server Actions as the trusted Blog write boundary or schedules the database-policy hardening described above. Keep the two product follow-ups in the backlog rather than expanding the current implementation into a larger CMS or media-management subsystem.
