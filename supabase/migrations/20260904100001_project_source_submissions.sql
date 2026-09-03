-- Member-submitted knowledge sources, with project-curator approval.
-- Adding anything to a knowledge base has always required *platform*
-- curator/admin role (is_curator_or_admin, e.g. documents_insert_staff) --
-- project role was never consulted, so a Project owner whose platform role
-- is merely 'member'/'consultant' could not add anything to their own
-- project's KB, and an ordinary member had no way to propose a source at
-- all. This table is the propose/decide record, modeled on
-- resource_access_requests (20260901130001) but deliberately gated on
-- can_curate_project (owner-or-curator) rather than can_manage_project
-- (owner-only) -- the confirmed model is that a project's curator is the
-- department head who decides what enters their own team's knowledge, the
-- same authority already extended to project-membership management in
-- 20260903100001_curator_manages_project_members.sql.
--
-- Deliberately does NOT touch RLS on documents/knowledge_sources/
-- document_chunks/kb_vectors -- those stay is_curator_or_admin-only,
-- unchanged. Every privilege-crossing write this table's workflow needs
-- (a member with no RLS path into those tables at all; a project curator
-- without platform-curator standing) goes through an explicitly-checked
-- service-role code path instead (src/lib/workbench/source-submissions.ts),
-- same pattern as createAndAddProjectMember.
create table project_source_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  knowledge_base_id text not null references knowledge_bases(id) on delete cascade,
  source_kind text not null check (source_kind in ('file', 'artifact')),
  title text not null,
  -- file-kind: set at submission time (the document/knowledge_source is
  -- created immediately, left unparsed, so a file is only ever uploaded to
  -- storage once -- see submitFileSource). artifact-kind: left null until
  -- approval, since an approved workstream artifact's content is copied
  -- into a new document only when a decision is made.
  document_id uuid references documents(id) on delete set null,
  -- artifact-kind only -- the already-approved workstream artifact this
  -- submission is proposing to copy into the project's KB.
  workstream_artifact_id uuid references workstream_artifacts(id) on delete set null,
  submitted_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_reason text,
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (source_kind = 'file' and workstream_artifact_id is null)
    or (source_kind = 'artifact' and workstream_artifact_id is not null)
  )
);

create index project_source_submissions_project_id_idx on project_source_submissions(project_id);
create index project_source_submissions_status_idx on project_source_submissions(project_id, status);

alter table project_source_submissions enable row level security;

-- Any active project member of any role can submit -- same is_project_member
-- gate as resource_access_requests_insert_member.
create policy "project_source_submissions_insert_member" on project_source_submissions
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and is_project_member(project_id, auth.uid())
  );

-- The submitter sees their own submissions (so the UI can show status); the
-- project's owner/curator/admin (can_curate_project) sees every submission
-- for their project -- deliberately curator-inclusive, unlike
-- resource_access_requests' owner-only can_manage_project.
create policy "project_source_submissions_select_own_or_curator" on project_source_submissions
  for select using (
    submitted_by = auth.uid()
    or can_curate_project(project_id, auth.uid())
  );

-- Only the project's owner/curator/admin can move a submission out of
-- pending.
create policy "project_source_submissions_decide_curator" on project_source_submissions
  for update
  using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));
