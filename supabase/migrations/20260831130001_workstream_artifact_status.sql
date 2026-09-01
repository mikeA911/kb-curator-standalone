-- OL-010 (docs/test-reports/2026-08-31-orderlunch-builder-journey.md):
-- attach_workstream_artifact's "successfully attached" never implied the
-- content satisfied its requested acceptance criteria. workstream_artifacts
-- was deliberately insert-only (no UPDATE policy existed at all -- "you
-- don't edit history, you attach a new finding if something changes", per
-- 20260811100004_project_workstreams.sql's own comment). This adds a status
-- column following the Builder Registry's certification-ladder precedent
-- (builder_integration_versions.certification_status, immutable descriptive
-- fields + a narrowly-scoped staff-gated status column) rather than the
-- chunk-review precedent (mutates one row's status in place) -- an artifact
-- attempt's own recorded content must stay exactly as submitted even after
-- a later attempt supersedes it.

alter table workstream_artifacts
  add column status text not null default 'draft'
    check (status in ('draft', 'validation_failed', 'ready_for_review', 'approved', 'rejected')),
  add column validation_notes text,
  add column reviewed_by uuid references profiles(id) on delete set null,
  add column reviewed_at timestamptz;

-- Same authorization bar as workstream creation/curation (can_curate_project
-- -- Project owner/curator, or admin). Only the app-layer reviewArtifact()
-- function (src/lib/workbench/workstreams.ts) ever calls this update, and it
-- only ever sends status/validation_notes/reviewed_by/reviewed_at -- same
-- "one trusted call path, no column-level RLS needed" posture already
-- established for builder_integration_versions_update_certification_staff_only.
create policy "workstream_artifacts_update_review_curator" on workstream_artifacts
  for update using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_artifacts.workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  );
