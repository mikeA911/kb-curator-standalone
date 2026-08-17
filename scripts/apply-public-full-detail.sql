-- Opt-in "full data exposure" for a published project -- a second, stricter
-- gate layered on top of the existing visibility='public' publish flow
-- (20260810130001_public_visibility.sql). That flow exposes only a
-- curated, hand-authored summary (projects.public_profile) and was never
-- extended to workstreams/artifacts/assessments. This migration adds a
-- narrow, additive opt-in so a SPECIFIC project (CareCall) can expose its
-- real workstreams, artifacts, and System Understanding Assessment
-- responses to anonymous visitors, while every other already-published
-- project (e.g. the RAG vs LLM comparison) is completely unaffected --
-- public_full_detail defaults to false, and setting it true is restricted
-- to platform admins at the application layer (see
-- setPublicFullDetailAction), deliberately stricter than the owner-or-admin
-- can_manage_project gate the rest of the publish flow uses.

alter table projects add column if not exists public_full_detail boolean not null default false;

-- One helper, reused by every new policy below, so "is this project's data
-- safe to expose in full to an anonymous visitor" has one source of truth.
create or replace function is_public_full_detail_project(pid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from projects p
    where p.id = pid and p.visibility = 'public' and p.published_at is not null and p.public_full_detail = true
  );
$$;

-- project_workstreams: additive anon read -----------------------------------
-- Workstream `status` (draft/active/...) is an internal editorial field, not
-- a publish gate -- all workstreams of an opted-in project are shown; the
-- opt-in itself is the gate.
create policy "project_workstreams_select_public_full_detail" on project_workstreams
  for select using (is_public_full_detail_project(project_id));

-- workstream_artifacts: one-hop join to the parent workstream's project,
-- same shape as the existing membership policy on this table.
create policy "workstream_artifacts_select_public_full_detail" on workstream_artifacts
  for select using (
    exists (select 1 from project_workstreams w where w.id = workstream_artifacts.workstream_id and is_public_full_detail_project(w.project_id))
  );

-- System Understanding Assessment tables -------------------------------------
create policy "system_assessments_select_public_full_detail" on system_assessments
  for select using (is_public_full_detail_project(project_id));

-- Only active/retired versions -- never a draft, which may contain
-- in-progress question edits not meant for public eyes even on an
-- opted-in project.
create policy "system_assessment_versions_select_public_full_detail" on system_assessment_versions
  for select using (is_public_full_detail_project(project_id) and status in ('active', 'retired'));

create policy "system_assessment_questions_select_public_full_detail" on system_assessment_questions
  for select using (is_public_full_detail_project(project_id));

-- Only completed responses -- an in-progress draft (e.g. a half-answered
-- test response) should never surface publicly even on an opted-in project.
create policy "assessment_responses_select_public_full_detail" on assessment_responses
  for select using (is_public_full_detail_project(project_id) and status = 'completed');

create policy "assessment_answers_select_public_full_detail" on assessment_answers
  for select using (
    is_public_full_detail_project(project_id)
    and exists (select 1 from assessment_responses r where r.id = assessment_answers.response_id and r.status = 'completed')
  );

-- Deliberately no change to project_notes, trending_*, eval_*, or any other
-- table -- this migration only widens the seven tables a "full detail"
-- public workstream page actually needs to render.
