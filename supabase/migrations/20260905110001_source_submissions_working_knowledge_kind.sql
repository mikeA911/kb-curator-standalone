-- KB Sandbox Builder MVP (docs/dev-request-kb-sandbox-builder-product.md):
-- lets a builder submit a Working Knowledge notebook for curator review
-- into a Knowledge Base -- most concretely, the operator's Organization Home
-- Project KB (docs/dev-request-organization-home-project-directory-and-
-- join-requests.md), the shared destination every builder auto-enrolls
-- into as a viewer. Mirrors the existing 'artifact' source_kind exactly
-- (20260904100001_project_source_submissions.sql): content is snapshotted
-- only at approval time, not at submission time, same as an artifact.

alter table project_source_submissions
  add column working_knowledge_item_id uuid references working_knowledge_items(id) on delete set null;

alter table project_source_submissions drop constraint project_source_submissions_source_kind_check;
alter table project_source_submissions add constraint project_source_submissions_source_kind_check
  check (source_kind = any (array['file', 'artifact', 'working_knowledge']));

alter table project_source_submissions drop constraint project_source_submissions_check;
alter table project_source_submissions add constraint project_source_submissions_check
  check (
    (source_kind = 'file' and workstream_artifact_id is null and working_knowledge_item_id is null)
    or (source_kind = 'artifact' and workstream_artifact_id is not null and working_knowledge_item_id is null)
    or (source_kind = 'working_knowledge' and workstream_artifact_id is null and working_knowledge_item_id is not null)
  );
