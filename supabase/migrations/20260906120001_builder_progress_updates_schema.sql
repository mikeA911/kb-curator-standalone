-- Builder Operations and Progress Updates (docs/dev-request-builder-
-- operations-and-progress-updates.md): a Builder explicitly drafts,
-- reviews and submits a progress update on one of their Workstreams; the
-- operator's Builder Operations view (platform curator/admin) reads these
-- alongside basic account/activity metadata. Never automatic -- nothing
-- here reads a private Working Knowledge notebook or Ember conversation.
--
-- One row per Workstream (not a history table) -- "replace" updates this
-- same row in place (matches "a Builder may replace or withdraw their
-- update until it becomes milestone evidence"); "withdraw" flips status
-- rather than deleting, so a withdrawn update stays auditable.
create table builder_progress_updates (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references project_workstreams(id) on delete cascade,
  submitted_by uuid not null references profiles(id) on delete cascade,
  current_stage text not null,
  opportunity_label text,
  progress text not null,
  next_step text not null,
  help_requested text,
  confidence text not null check (confidence in ('on_track', 'at_risk', 'blocked')),
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workstream_id)
);

create trigger builder_progress_updates_set_updated_at before update on builder_progress_updates
  for each row execute function set_updated_at();

alter table builder_progress_updates enable row level security;

-- Insert/update restricted to the workstream's own Project owner (the
-- Builder -- in Builder mode there is only ever one member anyway, so
-- owner-only and any-active-member are equivalent in practice here; this
-- feature is deliberately not generalized to Enterprise team Projects the
-- way Workstream Promotion was, see that migration's own comment for why).
create policy "builder_progress_updates_insert_owner" on builder_progress_updates
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and exists (select 1 from project_workstreams w where w.id = workstream_id and can_manage_project(w.project_id, auth.uid()))
  );

create policy "builder_progress_updates_update_owner" on builder_progress_updates
  for update
  using (
    exists (select 1 from project_workstreams w where w.id = workstream_id and can_manage_project(w.project_id, auth.uid()))
  )
  with check (
    exists (select 1 from project_workstreams w where w.id = workstream_id and can_manage_project(w.project_id, auth.uid()))
  );

-- An update is an explicitly shared, consent-based artifact (the whole
-- point of Share Builder Update) -- select for the submitter's own rows or
-- is_curator_or_admin (platform-level operator), not a leak.
create policy "builder_progress_updates_select_own_or_operator" on builder_progress_updates
  for select using (
    submitted_by = auth.uid()
    or is_curator_or_admin(auth.uid())
  );
