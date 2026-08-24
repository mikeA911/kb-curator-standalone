# Development Request — Versioned Knowledge Source Documents

## Summary

Add an explicit version lifecycle for uploaded knowledge-base source documents. A revised source must become a new immutable version of the same logical document, not silently overwrite the prior file and not coexist as an unrelated active source.

The system must preserve old versions for provenance while ensuring normal retrieval uses only the current approved version.

## Current gap

The `documents` table currently treats every upload as a separate source record. It has no stable logical-document identity, version number, supersession state, or current-version pointer.

Uploads with the same `doc_type + source_url` are rejected as duplicates. Uploads without that matching URL can be added separately, but both the former and revised content may remain available to retrieval. Deleting the old document would remove useful provenance and may invalidate historical evidence links.

Wiki articles already demonstrate the desired pattern: immutable versions, an approved current version, and retained history. Source documents need an equivalent lifecycle suited to file ingestion and chunk retrieval.

## Product rules

1. A knowledge source has one stable identity and one or more immutable versions.
2. Uploading a revision creates version `N+1`; it never mutates version `N`.
3. A new version begins as a draft and passes through parsing, chunk review, submission, and approval.
4. The existing approved version remains authoritative while the revision is being reviewed.
5. Approving the revision atomically makes it current and marks the prior current version superseded.
6. Normal RAG and Assistant retrieval use only current, approved document versions.
7. Historical versions remain available to authorized reviewers and retain their original files, chunks, citations, approvals, model provenance, and timestamps.
8. Historical conversations, artifacts, and audit records continue to cite the exact version used at the time.
9. A curator may explicitly retire a source without replacing it. Retired content is excluded from normal retrieval.
10. No uploaded revision is automatically trusted merely because its predecessor was approved.

## User experience

### New source

The existing upload flow continues to support **Add new source**.

### Revised source

Add **Upload new version** on a document's detail/review page. Show:

- logical document title;
- knowledge base;
- current version and status;
- source URL, publisher, and effective/publication date where known;
- file being replaced;
- change note supplied by the uploader;
- warning that the current version remains active until approval.

The user should not have to manipulate filenames or source URLs to bypass duplicate detection.

### Version history

Show a chronological history containing version number, filename, status, uploader, upload date, approver, approval date, effective date, change note, and superseded/retired date. Clearly label **Current approved version**.

Provide authorized access to an older version and its reviewed chunks without presenting it as current guidance.

### Duplicate handling

When a new-source upload matches an existing source URL—or a defensible file fingerprint/title match—offer:

- **Upload as a new version** of the matching source; or
- cancel and inspect the existing source.

Do not automatically merge uncertain matches.

## Suggested data model

Use stable identity plus immutable versions. Exact names may follow repository conventions.

### `knowledge_sources`

- `id`
- `knowledge_base_id`
- `title`
- `source_url`
- `publisher`
- `current_version_id` nullable FK
- lifecycle status such as `active` or `retired`
- `created_by`, `created_at`, `updated_at`

The uniqueness rule for source URLs belongs at this logical-source level, not on each uploaded version.

### `knowledge_source_versions`

- `id`
- `knowledge_source_id`
- `version_number`
- immutable storage/file metadata
- optional source version label, publication/effective dates, checksum and change note
- processing and review state
- `uploaded_by`, `created_at`
- `approved_by`, `approved_at`
- `superseded_at`, `retired_at`

Require a unique `(knowledge_source_id, version_number)` pair. Consider a content checksum to identify exact duplicate files without assuming that similar files are equivalent.

`document_chunks`, vector records, Wiki sources, evaluation evidence, and citations must reference the immutable version, directly or through a documented compatibility mapping.

## Retrieval behavior

- Production retrieval must join through `knowledge_sources.current_version_id` and require an approved/current state.
- Draft, submitted, rejected, superseded, and retired versions must not appear in normal retrieval.
- A separate curator/audit mode may deliberately search historical versions and must label their status.
- When approval changes the current pointer, vector availability must be safe and deterministic. Do not create a period in which neither version is retrievable.
- Evaluation datasets that intentionally reference an older version must remain reproducible and visibly identify that version.

## Approval and concurrency

- Only the existing authorized curator/admin path may approve a version in this release.
- Approval should be transactional: validate the candidate, activate it, and supersede the former current version together.
- Prevent two simultaneous revisions from both becoming current.
- If a new revision is uploaded while another revision is pending, display the conflict and require an explicit choice; do not silently create competing candidates.
- Deleting a logical source or approved version should not be the ordinary replacement mechanism.

## Migration and compatibility

Backfill each existing `documents` row as version 1 of its own logical source. Preserve IDs or introduce a reliable compatibility mapping so existing chunks, Wiki sources, vectors, logs, and citations remain valid.

Do not infer that similarly named existing documents are versions of one another during migration. That reconciliation should be a deliberate curator action.

Update generated database types and any combined migration artifact used by this repository.

## Scope boundaries

This request does not include:

- automatic semantic comparison of revisions;
- automatic approval based on publisher or filename;
- deleting historical evidence;
- public access to private source files;
- versioning Wiki articles, which already exists;
- a general records-management or legal-retention system.

A text/chunk change summary may be proposed later, but it must not block the foundational lifecycle.

## Implementation stages

### Stage 1 — Model and safe retrieval

- Add stable sources and immutable version records.
- Backfill existing documents.
- Update chunks/vectors and retrieval to honor only the current approved version.
- Preserve current upload, curation, approval, and citation behavior.

### Stage 2 — Revision workflow

- Add **Upload new version** and change notes.
- Add duplicate-to-version guidance.
- Add approval-time supersession and conflict handling.
- Add version history and status labels.

### Stage 3 — Governance refinements

- Retire/reactivate logical sources with an audit trail.
- Add stale-source indicators and optional effective dates.
- Add an explicit curator reconciliation tool for existing records that are confirmed to be versions of the same source.

## Acceptance criteria

1. An approved source at version 1 remains retrievable while version 2 is pending.
2. Uploading version 2 preserves the version 1 file, chunks, citations, and approval record.
3. Approving version 2 makes it the only version returned by normal retrieval and marks version 1 superseded.
4. Rejecting or abandoning version 2 leaves version 1 current.
5. A historical citation to version 1 still resolves and visibly says it is superseded.
6. A new-source upload matching an existing source URL guides the curator to the version workflow instead of returning only a duplicate error.
7. Exact duplicate file uploads are detected without silently merging or replacing records.
8. Retired sources do not appear in normal retrieval.
9. Unauthorized users cannot upload, approve, activate, retire, or inspect protected historical versions.
10. Existing source documents remain usable after migration with no loss of chunks, vectors, Wiki provenance, or audit history.

## Required verification

- Unit tests for version allocation, state transitions, duplicate detection, and current-version selection.
- Database/RLS tests for immutable versions, permissions, uniqueness, and one-current-version behavior.
- Retrieval regression tests proving pending/superseded/retired versions are excluded.
- Citation tests proving historical references retain exact-version provenance.
- Migration test using representative existing documents, chunks, vectors, and Wiki sources.
- Live pass: upload and approve version 1; upload version 2; verify version 1 remains active; approve version 2; verify retrieval switches; inspect the version 1 historical citation; retire the source and verify normal retrieval excludes it.

## Design decision to record

Before implementation, decide whether the existing `documents` table becomes the stable logical-source table or the immutable version table. Prefer the option that minimizes migration risk, but document the choice explicitly and keep the public terminology simple: **Source** and **Version**.
