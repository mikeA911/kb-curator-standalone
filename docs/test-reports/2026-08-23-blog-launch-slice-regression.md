# Blog Launch Slice Regression Test

**Date:** 2026-08-23  
**Environment:** Local development (`http://localhost:3000`)  
**Account:** Administrator  
**Result:** **Conditional fail — release blockers found**

## Scope

Independent regression coverage of the Blog launch slice:

- administrator draft creation and editing
- cover and inline images
- related-article selection
- public/published access boundaries
- SEO output
- Prepare for Substack
- published-post edit locking
- automated regression suite

## Automated result

- `npm test`: **667/667 tests passed** across 87 files.
- Expected Wiki embedding failure-path messages appeared on stderr; they did not fail the suite.

## Live checks that passed

- A new administrator draft could be created and subsequently edited at the correct edit URL when opened manually.
- Cover image upload accepted PNG, required alternative text at the server boundary, and displayed the saved thumbnail with its alternative text.
- Inline image upload accepted PNG and rendered the uploaded image in Preview.
- Related-article search returned the published **KB Sandbox Deployment and Server Options** article and allowed it to be selected. The relation was not committed, to avoid changing editorial data during a regression test.
- Prepare for Substack completed through Groq using `openai/gpt-oss-120b`, produced readable HTML, descriptive canonical backlink text, suggested tags, social preview text, and a Substack Note.
- The published-post editor was locked: its fieldset was disabled, it explained that the post must be unpublished before editing, and an Unpublish action was available.
- `/sitemap.xml` contained only published Blog URLs and excluded the temporary draft and other drafts.
- `/robots.txt` exposed a clean public allow-list without naming private application routes.
- The published article emitted a canonical URL, `article` Open Graph metadata, `summary_large_image` Twitter metadata, and `BlogPosting` JSON-LD without a personal `Person` author.
- Server-side media validation accepts PNG/JPEG/WebP up to 5 MB and rejects empty, oversized, SVG, and unsupported uploads. Automated tests cover these rules.

## Findings

### 1. Blocker — new administrator post redirects to a 404

After saving a new post from `/admin/blog/new`, the application redirected to:

`/admin/{post-id}/edit`

The valid route is:

`/admin/blog/{post-id}/edit`

The draft was created successfully, but the author lands on a 404. `BlogPostForm` constructs the redirect as `${returnTo}/${id}/edit`, while the administrator form's default `returnTo` is `/admin` rather than `/admin/blog`.

**Required fix:** make the administrator new-post destination `/admin/blog/{id}/edit` and add a regression test for both administrator and curator creation routes.

### 2. Blocker — unsafe URL protocols survive the Substack HTML export

The Substack converter serializes Markdown through `remark-rehype` and `rehype-stringify` without sanitizing link or image URL protocols. A local conversion check demonstrated that input such as:

- `[bad](javascript:alert(1))`
- `![bad](data:text/html;base64,...)`

is emitted as an HTML `href="javascript:..."` or `src="data:..."`. Raw `<script>` text is dropped, but that does not protect URL-bearing attributes.

This affects both stored article content and model-generated Substack adaptation content. The output is copied for use outside KB Sandbox, so it should not rely on a destination editor to sanitize it.

**Required fix:** add an explicit allow-list/sanitization step to the HTML pipeline. Permit only the intentionally supported protocols and relative URLs; reject or neutralize `javascript:`, unsafe `data:`, `vbscript:`, and equivalent obfuscations. Add focused tests for unsafe protocols, safe `https/http`, intentional `mailto` behavior, relative URLs, images, and raw HTML.

### 3. Major usability defect — inline image insertion can break the surrounding Markdown

The image toolbar inserts the image Markdown exactly at the cursor without normalizing surrounding whitespace. With the default cursor at the beginning of content, the result was equivalent to:

```markdown
![KB Sandbox assistant icon](image-url)## Launch regression
```

Preview consequently rendered the heading marker as literal paragraph text beside the image instead of as a heading.

**Required fix:** make inline image insertion a block-safe operation. Add required preceding/following newlines when adjacent content would otherwise merge, while avoiding unnecessary blank lines when the cursor is already on an empty line. Extend `editor-toolbar.test.ts` with start, middle, end, selection replacement, and already-separated cases.

### 4. Major storage lifecycle defect — deleting a draft does not remove Blog media

`deleteDraftPost` deletes the `blog_posts` row, and relations cascade, but neither it nor `deleteBlogPostAction` removes the cover image or inline image objects from the public `blog-media` bucket. Inline images are stored as public absolute URLs inside Markdown and have no separate ownership/reference record, making reliable cleanup difficult.

The cover upload also writes the storage object before updating the post row; an update failure can therefore leave an orphan immediately.

**Required fix:** define and implement a Blog media lifecycle. At minimum, remove the known cover object on draft deletion/replacement and compensate for failed row updates. For inline media, store upload ownership/reference metadata or implement a safe reconciliation/garbage-collection strategy so abandoned uploads and deleted drafts do not accumulate indefinitely. Add tests proving one post cannot cause another post's referenced media to be removed.

### 5. Minor UX issue — image action buttons appear enabled before required alt text is supplied

The server-side validation correctly rejects missing alternative text, and the UI displays a clear error. However, Save cover image and Insert image appear actionable before the required field is complete.

**Suggested improvement:** disable each action until both a file and non-blank alternative text are present, while retaining the server-side validation.

## Test data awaiting cleanup

The following temporary draft and uploads remain so cleanup can be explicitly approved and so the storage-lifecycle defect is not concealed:

- Title: **Launch Slice Regression 20260823**
- Post ID: `009efcc4-1b82-43b4-8d78-8506c127d746`
- Slug: `launch-slice-regression-20260823`
- One cover image object: `posts/1787473614536-graphs.png`
- One inline image object: `posts/1787473652985-assistant-icon.png`

Deleting the draft through the current UI will **not** delete those storage objects. Cleanup should remove the exact draft row and both exact test objects after confirmation.

## Recommendation

Pause the next Blog stage until findings 1 and 2 are fixed and covered by tests. Finding 3 should also be fixed before non-technical authors use image insertion. Resolve or explicitly schedule finding 4 before production content creates a growing pool of unowned public media.
