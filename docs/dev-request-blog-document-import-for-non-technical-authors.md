# Development Request: Blog Draft Import for Non-Technical Authors

**Status:** Proposed  
**Created:** 23 August 2026  
**Area:** Public Blog / Contributor Experience  
**Priority:** Medium — removes Markdown-file knowledge as a prerequisite for Blog contribution

## Summary

Allow a curator or administrator to create a Blog draft by importing an ordinary Word, Markdown, or plain-text document into the existing simple Blog editor.

This is an import convenience, not a new content-management system. The imported document must become an editable, unpublished Blog draft using the existing editorial lifecycle, permissions, Markdown storage, preview renderer, and administrator publication gate.

Do not begin this request until the current Blog foundation and Stage 2 corrective pass have been completed and regression-tested.

## User problem

The current editor stores and exposes Markdown. Although its toolbar and Preview view make basic editing easier, many subject-matter experts, managers, architects, and external contributors will begin in Microsoft Word and may not recognise or want to maintain Markdown syntax.

The product should not require a non-technical contributor to convert a `.docx` file manually before creating a draft.

## Proposed experience

On the new Blog draft page, offer two clear choices:

1. **Start writing** — open the existing blank Blog editor.
2. **Import a document** — upload a supported file and convert it into the existing editor.

The import flow is:

**Select document → Convert → Review preview and warnings → Edit → Save draft**

Importing must not save, submit, publish, email, or otherwise distribute the article automatically.

## Supported formats

Support initially:

- `.docx` — Microsoft Word documents;
- `.md` and `.markdown` — Markdown source;
- `.txt` — plain UTF-8 text.

Do not support legacy `.doc`, PDF, Google Docs links, RTF, HTML uploads, OpenDocument, or scanned/OCR content in this release.

When a user selects an unsupported format, explain which formats are accepted and leave the current draft unchanged.

## Word conversion

Convert common Word structure into clean Markdown suitable for the existing public renderer:

| Word content | Imported Blog content |
| --- | --- |
| Title or first suitable heading | Suggested Blog title |
| Heading levels | Markdown headings within the supported Blog hierarchy |
| Paragraphs | Paragraphs |
| Bold and italic text | Markdown emphasis |
| Bulleted lists | Markdown bulleted lists |
| Numbered lists | Markdown numbered lists |
| Block quotations | Markdown block quotations where reliably identified |
| Hyperlinks | Markdown links with validated destinations |
| Simple tables | GitHub-flavoured Markdown tables where conversion is reliable |

Use the existing `mammoth` dependency where appropriate. If clean Markdown requires a small HTML-to-Markdown conversion dependency, justify and pin it rather than implementing a fragile regular-expression HTML converter.

Do not preserve page layout, fonts, colours, headers, footers, page numbers, text boxes, shapes, macros, or other presentation-specific Word behaviour.

Track Changes, comments, footnotes, endnotes, citations, complex tables, and unsupported embedded objects must either be converted predictably or produce a visible warning. They must not silently create misleading article content.

## Markdown and text import

- Markdown files should populate the Article body without rewriting valid supported Markdown unnecessarily.
- Plain-text files should preserve paragraphs and line breaks without guessing complex formatting.
- Decode text as UTF-8 and report an understandable error when decoding fails.
- Apply the same Blog field and malformed-link validation used by manually authored drafts.

## Suggested fields

After conversion, suggest but do not silently commit:

- **Title:** from the Word title style, first suitable top-level heading, or filename.
- **Slug:** generated from the suggested title using the existing slug logic.
- **Excerpt:** optionally from a clearly identified subtitle, summary, or first substantive paragraph.
- **Article body:** the converted document content.

The contributor must be able to correct every suggested field before saving. Avoid duplicating the selected title as both the page title and the first article-body heading.

## Conversion review

Show the converted result in the existing Write/Preview editor before it is saved.

Display a concise import summary such as:

- document successfully converted;
- title and excerpt were suggested;
- number of headings, links, lists, and tables recognised;
- unsupported or simplified content;
- embedded images requiring separate review and upload.

Warnings should be specific enough for a contributor to find the affected content. Do not expose internal parser stack traces.

## Images

For the first import release, do not automatically extract or publish images embedded in Word files.

If embedded images are detected:

- report how many were found;
- explain that they were not imported;
- ask the contributor to use the separately planned Blog visual-upload capability to select approved images, provide alternative text, confirm source/permission information, and place them deliberately.

Do not insert broken image placeholders into the article.

## Naming and terminology

Use **Article body** in the contributor interface rather than **Content (Markdown)**.

Markdown may remain visible as the internal authoring syntax in the Write view, but contributors should be able to perform common formatting through the toolbar and verify the result through Preview without understanding Markdown terminology.

Help text may say:

> Use the toolbar for headings, emphasis, links, lists, and quotations. Preview shows how the published article will appear.

## Permissions and editorial lifecycle

- Curators and administrators may import documents when creating an eligible draft.
- The resulting draft follows the same author ownership, editing, review submission, and publication rules as a manually created draft.
- `author_id` must be forced from the authenticated user, never derived from document metadata.
- Word author, company, comments, revision history, and other document properties must not grant permissions or be displayed publicly.
- Only administrators may approve and publish.
- Published posts remain locked until unpublished under the accepted Blog publication-integrity rule.

## Security and privacy

- Validate extension, detected content type, file signature where practical, and maximum size on the server.
- Reject password-protected, corrupted, macro-enabled, or unsupported files with a clear message.
- Apply conservative decompression and processing limits to Word archives.
- Never execute macros, external relationships, scripts, active content, or embedded objects.
- Do not fetch remote resources referenced by the document during conversion.
- Generate safe temporary names; do not use the original filename as a storage path.
- Treat document metadata and imported content as untrusted input.
- Ensure the public renderer continues to escape or reject unsafe HTML and URLs.
- Do not send an imported draft to an AI model merely to perform basic conversion.

Prefer in-memory or short-lived server-side conversion. If temporary storage is required, use a private location and delete the temporary upload after conversion succeeds or fails. Do not retain the original document as a public Blog asset.

## Failure behaviour

- A failed conversion must not create a partial Blog record.
- Existing unsaved editor content must not be overwritten without confirmation.
- If some content can be converted but warnings remain, present the result for review and require the contributor to choose whether to use it.
- Retrying an import must not create duplicate drafts.
- Server and parser errors must be logged safely without recording unnecessary document content.

## Accessibility

- The import control must be keyboard accessible and have an explicit label.
- Conversion progress, success, warnings, and failures must be announced accessibly.
- Do not use colour alone to distinguish warnings from successful conversion.
- Imported heading levels should remain semantically coherent in Preview.

## Acceptance criteria

1. A curator or administrator can choose **Start writing** or **Import a document** when creating a Blog draft.
2. A valid `.docx` file converts common headings, paragraphs, emphasis, lists, quotations, hyperlinks, and simple tables into content supported by the existing Blog renderer.
3. A valid Markdown file imports without unnecessary rewriting of its supported Markdown.
4. A UTF-8 text file imports with paragraphs and line breaks preserved.
5. Conversion populates the existing editor and Preview but does not create or save a Blog record automatically.
6. The contributor can edit the suggested title, slug, excerpt, and Article body before saving.
7. The imported draft follows the existing ownership and editorial lifecycle, and only an administrator can publish it.
8. Embedded Word images are not automatically published; their count and required manual follow-up are clearly reported.
9. Unsupported features and simplifications produce understandable warnings.
10. Invalid, corrupted, password-protected, macro-enabled, oversized, or unsupported files are refused safely.
11. Document metadata cannot change authorship, permissions, attribution, or publication state.
12. Remote document relationships and active content are never executed or fetched.
13. A failed import leaves no partial Blog row and does not destroy existing editor content.
14. Original uploads are not placed in public storage and any temporary copy is removed after conversion.
15. The contributor interface says **Article body**, not **Content (Markdown)**.
16. The existing toolbar and public-renderer Preview work with imported content.
17. Anonymous users cannot access imported content unless the resulting draft is later approved and published.
18. Automated tests include representative `.docx`, Markdown, and text fixtures plus corrupted, unsupported, macro-enabled, oversized, and malicious-link cases.
19. Type checking, linting, production build, focused Blog tests, and the complete automated suite pass.

## Live verification

Using a curator account:

1. Import a representative Word article containing headings, formatting, lists, a link, a simple table, and an embedded image.
2. Confirm the article fields and Preview are useful and the image warning is accurate.
3. Edit the imported content with the normal toolbar and save it as a Draft.
4. Submit it for review and confirm editing locks under the existing rules.

Using an administrator account:

5. Review the imported article, return it to Draft, modify it, and publish only after explicit approval.
6. Confirm the public result matches Preview and exposes no document metadata or private upload path.

Using an anonymous request:

7. Confirm the imported draft and temporary upload are inaccessible before publication.
8. Confirm only the approved article becomes public.

Clean up the temporary test article and any uploaded fixture after receiving the required destructive-action approval.

## Out of scope

- a block editor or full WYSIWYG CMS;
- PDF or scanned-document import;
- legacy `.doc` parsing;
- Google Docs account integration;
- automatic extraction or publication of embedded images;
- automatic AI rewriting, summarisation, or fact-checking during import;
- automatic submission or publication;
- preserving Word page layout, fonts, colours, headers, footers, or text boxes;
- importing comments, Track Changes, macros, or embedded applications;
- long-term storage or version management of the original uploaded document;
- real-time collaborative editing.

## Delivery relationship

This request should follow the Blog foundation and Stage 2 corrective pass. It may be delivered before or alongside minimal Blog visuals, but automatic Word-image extraction remains out of scope even after visual uploads exist.

The existing Blog development request remains authoritative for editorial roles, review state, publication controls, public isolation, SEO, and later distribution features.
