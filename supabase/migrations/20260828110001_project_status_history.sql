-- Tracks every status transition on a project (when created, when moved to
-- Working on it / For Approval / Approved, and back), for later analysis --
-- per Mike, 2026-08-28: "do we keep track of when something is created, set
-- to working... so later we can analyze/optimize." Mirrors
-- resource_access_audit_log's exact shape and RLS choice
-- (supabase/migrations/20260825100001_project_evidence_access_schema.sql):
-- no insert/update/delete policy at all -- written only via the admin
-- client from the service layer (src/lib/workbench/projects.ts), so
-- actor_id reflects the real acting user (ctx.user.id) rather than
-- auth.uid(), which would be null for service-role writes and is why this
-- isn't a database trigger.
create table project_status_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  from_status text,   -- null for the initial creation event
  to_status text not null,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index project_status_history_project_id_idx on project_status_history(project_id);

alter table project_status_history enable row level security;

-- can_curate_project (20260810120001_project_members.sql) = platform admin,
-- or an active owner/curator member -- the same people who can trigger a
-- status change can see its history. Not open to every project member.
create policy "project_status_history_select_curator" on project_status_history
  for select using (can_curate_project(project_id, auth.uid()));
