# Development Request: Dashboard Shared Links and Organization Library Foundation

**Status:** Proposed  
**Created:** 21 August 2026  
**Area:** Dashboard / Trending  
**Priority:** Medium product enhancement

## Summary

Add a **Shared links** section to every signed-in user's dashboard. Any active, non-anonymous user can contribute a link they think other KB Sandbox users should read. All signed-in users in the applicable visibility scope can browse and open the links. Administrators can remove inappropriate, unsafe, duplicate, outdated, or irrelevant entries.

Build the first version as a lightweight dashboard entry point into the existing Trending system rather than introducing a competing links table. The current `trending_items` model already supports a source URL, title, publisher, “why it matters” description, tags, submitter, project/platform visibility, comments, review state, and promotion into the Wiki. This provides a natural foundation for an eventual organization library.

## Product intent

The dashboard should help people share useful reading with colleagues as easily as adding a note or tag. It is not initially a formal knowledge-curation workflow. A contributed link becomes a shared recommendation; it does not become approved organizational knowledge merely because someone submitted it.

Over time, useful links may be discussed, categorized, connected to projects, reviewed, promoted into the Wiki, or organized into a broader organization library.

## Dashboard experience

Add a dashboard card titled **Shared links** with:

- an **Add a link** action available to every active signed-in user;
- the five most recent active platform-visible links;
- title, source/publisher, contributor, submission date, and a short “why it matters” description;
- up to a small number of tags;
- a clear external-link indicator;
- **View all shared links**, leading to the existing Trending collection or a future library view;
- an administrator-only **Remove** action.

If there are no links, use an inviting empty state such as:

> Found something useful? Add a link for other Workbench users to read.

Keep the dashboard card compact. Detailed comments, Wiki connections, promotion controls, and full filtering remain on the Trending detail/list pages.

## Add-link interaction

The dashboard form should request:

- **URL** — required;
- **Title** — required;
- **Why should others read this?** — required, short text;
- **Source or publisher** — optional;
- **Tags** — optional;
- **Project** — optional, shown only for projects the user may access.

Default to platform visibility when no project is selected. If a project is selected, retain the existing project-visibility rules and make the visibility clear before submission.

After submission:

- show the new entry in the dashboard card without requiring a full sign-out/reload;
- display a success message;
- link to its Trending detail page;
- preserve the recorded contributor and creation time;
- do not automatically submit it to Wiki review or publish it publicly.

The first version may reuse or adapt `TrendingSubmitForm`, but the dashboard presentation should feel lightweight. Avoid forcing users through the full Trending page merely to contribute a link.

## Permissions and moderation

### Add and read

- Any active authenticated user may add a link.
- Anonymous or inactive users may not add links.
- Platform-visible entries are readable by all active signed-in users.
- Project-visible entries are readable only under existing project access rules.
- Submission must stamp the authenticated user's ID server-side; never trust a client-supplied contributor ID.

### Remove

Only platform administrators should see and use **Remove** on the dashboard.

Implement removal as a recoverable archive/moderation action rather than physical deletion. The entry should immediately disappear from ordinary dashboard and active-list queries while retaining:

- its original contributor and content;
- the administrator who removed it;
- removal time;
- an optional moderation reason;
- any existing comments or Wiki provenance.

If the current Trending archive mechanism is reused, extend it with remover/reason metadata as needed. Preserve existing curator Trending workflows unless a separate product decision intentionally narrows them; the dashboard's removal control itself is administrator-only.

The original contributor cannot edit or delete a submitted shared link in the first version. Corrections should be handled by an administrator or a later explicit contributor-management design. This avoids ambiguous mutation and moderation rules; it can be revisited after real usage.

## Relationship to Trending

Shared links should be backed by `trending_items` and use existing Trending routes, queries, actions, visibility, tags, comments, Wiki links, and promotion lifecycle wherever those behaviors match this request.

Use user-facing language appropriate to context:

- Dashboard: **Shared links**, **Add a link**, **Why should others read this?**
- Existing collection: **Trending** may retain its current name.

Do not create duplicate records when a dashboard contribution appears in Trending. A shared link and its Trending entry are the same record viewed through different interfaces.

The dashboard query should select only the fields required by the card and should exclude archived items.

## URL safety

Accept only valid `https://` and, where deliberately supported for local development, `http://` URLs. Reject:

- `javascript:`, `data:`, `file:`, browser-extension, and other executable/local schemes;
- URLs containing embedded usernames or passwords;
- empty or malformed hosts;
- values that exceed documented length limits.

Open external links in a way that prevents the destination from controlling the originating page and visibly indicate that the user is leaving KB Sandbox.

Do not fetch arbitrary URLs from the server merely to create a preview in the first version. Automatic title, image, or description extraction would introduce server-side request-forgery, redirect, content-size, and privacy risks and should be separately designed.

Normalize URLs for duplicate detection without silently changing their meaning. On likely duplicate submission, warn the user and link to the existing entry; allow an administrator-defined exception if genuinely necessary.

## Content and moderation safety

- Treat titles, publisher names, descriptions, and tags as untrusted user content.
- Render them as text, not raw HTML.
- Apply reasonable length and item-count limits.
- Record moderation activity without exposing private administrator notes to ordinary users.
- Provide a safe empty/error state when an external destination is unavailable; KB Sandbox does not guarantee third-party content.
- Do not imply that links are verified, endorsed, or safe merely because another user submitted them.

Suggested dashboard disclosure:

> Shared by Workbench users. Links are recommendations, not approved KB Sandbox knowledge.

## Eventual organization library

The first version is platform-scoped because the current application does not yet expose a complete organization/tenant model. Keep the implementation ready for a future explicit organization scope without inventing organization IDs now.

Future library capabilities may include:

- organization ownership and membership boundaries;
- collections or shelves;
- saved searches and richer filters;
- bookmarks or “read later” state per user;
- reactions and recommendations;
- reading status;
- curator-selected featured resources;
- duplicate consolidation;
- link-health checking;
- attachment of reading notes;
- promotion from shared link to reviewed Wiki knowledge;
- organization-specific retention and moderation policies.

The initial migration and queries should avoid platform-wide assumptions that would be difficult to replace. Where practical, centralize visibility checks so a future organization predicate can be added in one layer.

## Data changes

Prefer extending `trending_items` only where the existing schema lacks moderation audit data. Potential additions:

- `archived_by` or `removed_by`;
- `archived_at` or `removed_at`;
- `moderation_reason`;
- optional normalized URL/fingerprint for duplicate detection.

Do not add a separate `shared_links` table unless implementation analysis finds a concrete incompatibility with Trending. If a new table becomes necessary, document why the two concepts cannot share lifecycle, visibility, and promotion behavior before migrating.

## Performance and ordering

- Load a small fixed number of dashboard entries, initially five.
- Order by newest active submission by default.
- Add or verify indexes supporting status/visibility/date and future organization/project scope.
- Avoid loading comments, full Wiki relationships, or large descriptions into the dashboard query.
- Revalidate the dashboard, Trending list, and relevant detail routes after add or archive operations.

## Out of scope for the first version

- Building the complete organization library;
- public anonymous visibility;
- automatic web-page scraping or AI summarization;
- voting, reactions, or popularity ranking;
- personal bookmarks/read-later status;
- contributor editing or deletion;
- automatic Wiki publication;
- attachments or copied article content;
- automatic link-health crawling.

## Acceptance criteria

1. Every active signed-in user sees the Shared links card on the dashboard.
2. Any active non-anonymous user can submit a valid link from the dashboard.
3. URL, title, and “why it matters” are required; publisher, tags, and project are optional.
4. The authenticated user is recorded as contributor by trusted server code.
5. A platform-visible submission is visible to other active users on their dashboards and in Trending.
6. A project-visible submission is not exposed outside its project authorization boundary.
7. The dashboard shows at most the configured number of recent active entries and links to the full collection.
8. Dashboard submissions and Trending entries are the same underlying records, not synchronized copies.
9. Only administrators see and can invoke the dashboard Remove action.
10. Removal is recoverable and records the acting administrator, timestamp, and optional reason.
11. Removed entries disappear from normal dashboard and active Trending queries without destroying provenance.
12. Non-administrators cannot remove entries by calling the Server Action or database directly.
13. Only supported HTTP(S) URLs are accepted; executable/local schemes and embedded credentials are rejected.
14. User-authored fields are rendered safely as text.
15. External links are visibly marked and opened with safe browser behavior.
16. Likely duplicate URLs produce a useful warning rather than silently creating repeated entries.
17. Adding or removing an entry refreshes all affected UI surfaces.
18. The dashboard explains that shared links are user recommendations, not approved knowledge.
19. Tests cover each role, inactive/anonymous users, platform/project visibility, URL validation, duplicate detection, removal audit, RLS enforcement, and safe rendering.
20. Existing Trending comments, Wiki linking, curation, and promotion behavior continues to work for dashboard-submitted entries.

## Suggested validation scenario

1. Sign in as a consultant and add a platform-visible link with a title, explanation, publisher, and tags.
2. Confirm that it appears on the consultant's dashboard and in Trending.
3. Sign in as a different active user and confirm that the same entry appears with the correct contributor.
4. Confirm that the second user cannot remove it.
5. Sign in as an administrator, remove it with a moderation reason, and confirm that it disappears from ordinary active views.
6. Confirm in the database/audit view that the original content, contributor, removing administrator, time, and reason remain recorded.
7. Repeat with a project-linked entry and verify that an unrelated user cannot discover it.
8. Attempt `javascript:`, `file:`, credential-bearing, malformed, and duplicate URLs and verify safe rejection or warning.

## Implementation note

This request is primarily a dashboard presentation, permission, validation, and moderation increment over the existing Trending capability. Reusing `trending_items` preserves the useful path from informal recommendation to discussion, project connection, human review, and eventual approved Wiki knowledge while leaving room for a future organization-scoped library.
