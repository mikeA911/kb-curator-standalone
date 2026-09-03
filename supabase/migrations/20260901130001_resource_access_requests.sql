-- Locked sources for restricted project members, with a request/approve/
-- reject flow. Project Evidence Access Controls (20260825100001,
-- 20260825110001) already restricts a source to specific groups/members via
-- has_evidence_access, but a locked-out member has no way to even learn a
-- restricted source exists, let alone ask for it. This table is the
-- request/decision record; the notification itself reuses project_notes
-- (context_type = 'resource_access_request', context_id = this row's id) --
-- no new project_notes RLS policy needed, since the requester is always
-- already a project member (project_notes_insert_member already covers it).
create table resource_access_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  resource_type text not null check (resource_type in ('knowledge_source', 'wiki_article', 'workstream_artifact')),
  resource_id uuid not null,
  requester_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  note_id uuid references project_notes(id) on delete set null,
  outcome_note_id uuid references project_notes(id) on delete set null,
  decided_by uuid references profiles(id) on delete set null,
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index resource_access_requests_project_id_idx on resource_access_requests(project_id);
create index resource_access_requests_resource_idx on resource_access_requests(resource_type, resource_id);
create index resource_access_requests_requester_id_idx on resource_access_requests(requester_id);

alter table resource_access_requests enable row level security;

-- Any active project member of any role can request -- same is_project_member
-- gate as project_notes_insert_member, not can_manage_project.
create policy "resource_access_requests_insert_member" on resource_access_requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and is_project_member(project_id, auth.uid())
  );

-- The requester sees their own requests (so the UI can seed "already
-- requested" state); the decision-maker (owner/admin, can_manage_project --
-- same boundary as resource_access_grants itself) sees every request for
-- their project.
create policy "resource_access_requests_select_own_or_manager" on resource_access_requests
  for select using (
    requester_id = auth.uid()
    or can_manage_project(project_id, auth.uid())
  );

-- Only the decision-maker can move a request out of pending.
create policy "resource_access_requests_update_manager" on resource_access_requests
  for update
  using (can_manage_project(project_id, auth.uid()))
  with check (can_manage_project(project_id, auth.uid()));
