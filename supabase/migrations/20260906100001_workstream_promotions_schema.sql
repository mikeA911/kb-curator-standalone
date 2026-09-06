-- KB Sandbox Builder: workstream promotion (business-process handoff, not
-- docs/dev-request-builder-capability-promotion-evaluation-templates.md's
-- separate technical certification ladder). A builder submits a completed
-- Workstream for review; on approval, a new customer-facing Project is
-- created rather than the builder's own private Project being exposed.
--
-- The one genuinely new RLS shape here (see can_curate_project everywhere
-- else in this codebase): deciding a promotion must be gated on
-- is_curator_or_admin (platform-level, 20260808190009_functions.sql), never
-- can_curate_project -- a builder IS the owner of their own Project, so
-- can_curate_project would let them approve their own promotion.
create table workstream_promotions (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references project_workstreams(id) on delete cascade,
  submitted_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_reason text,
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create index workstream_promotions_workstream_id_idx on workstream_promotions(workstream_id);
create index workstream_promotions_status_idx on workstream_promotions(status);

alter table workstream_promotions enable row level security;

-- Only the workstream's own Project owner (the builder) may submit --
-- mirrors project_source_submissions_insert_member's "submitted_by = self"
-- shape, but scoped to can_manage_project (owner-only) rather than
-- is_project_member (any role), since only the sole builder-owner should
-- ever be proposing their own graduation.
create policy "workstream_promotions_insert_owner" on workstream_promotions
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from project_workstreams w
      where w.id = workstream_id and can_manage_project(w.project_id, auth.uid())
    )
  );

-- The submitter sees their own submissions; is_curator_or_admin (platform-
-- level, not project-scoped) sees every pending promotion across every
-- builder -- the review queue is necessarily cross-Project.
create policy "workstream_promotions_select_own_or_operator" on workstream_promotions
  for select using (
    submitted_by = auth.uid()
    or is_curator_or_admin(auth.uid())
  );

create policy "workstream_promotions_decide_operator" on workstream_promotions
  for update
  using (is_curator_or_admin(auth.uid()))
  with check (is_curator_or_admin(auth.uid()));
