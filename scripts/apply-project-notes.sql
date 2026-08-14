-- M5E Part B -- Project Notes. Lightweight, resolvable notes between project
-- participants, optionally attached to a real Workbench object (an eval run,
-- a document, a workstream artifact, etc). Explicitly NOT a general inbox or
-- direct-message feature -- see docs/m5E.md sections 13-15, 22.

create table project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  -- Who a note is addressed to. 'project_team' means every member; 'curator'
  -- and 'admin' mean any curator/admin on staff, not a specific person.
  recipient_type text not null check (recipient_type in ('user', 'project_team', 'curator', 'admin')),
  recipient_user_id uuid references profiles(id) on delete set null,
  subject text not null,
  body text not null,
  -- Polymorphic reference to the Workbench object a note is about (an eval
  -- run, a document, a workstream artifact, ...). No FK constraint -- can't
  -- FK against a union of tables; integrity is application-level, resolved
  -- per-type at read time, degrading to a plain label if unresolvable.
  context_type text,
  context_id uuid,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null
);

create index project_notes_project_id_idx on project_notes(project_id);
create index project_notes_status_idx on project_notes(status);

-- Flat replies -- same "no threading" shape as trending_comments.
create table project_note_replies (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references project_notes(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index project_note_replies_note_id_idx on project_note_replies(note_id);

-- One reusable helper encapsulating who can see a note, instead of
-- duplicating the OR-chain across project_notes and project_note_replies
-- policies -- matches the is_project_member/can_curate_project convention.
create or replace function can_view_project_note(nid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from project_notes n
    where n.id = nid
    and is_project_member(n.project_id, uid)
    and (
      n.recipient_type = 'project_team'
      or n.author_id = uid
      or (n.recipient_type = 'user' and n.recipient_user_id = uid)
      or (n.recipient_type = 'curator' and can_curate_project(n.project_id, uid))
      or (n.recipient_type = 'admin' and is_admin(uid))
      or can_curate_project(n.project_id, uid) -- curator/owner oversight, regardless of recipient_type
    )
  );
$$;

-- RLS -------------------------------------------------------------------
alter table project_notes enable row level security;
alter table project_note_replies enable row level security;

create policy "project_notes_select_visible" on project_notes
  for select using (can_view_project_note(id, auth.uid()));

create policy "project_notes_insert_member" on project_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and is_project_member(project_id, auth.uid())
    and (recipient_type != 'user' or is_project_member(project_id, recipient_user_id))
  );

-- Resolving is the only mutation -- author, the addressed recipient, a
-- curator, or an admin (doc section 14, literally: "who can resolve").
create policy "project_notes_resolve" on project_notes
  for update
  using (
    author_id = auth.uid()
    or (recipient_type = 'user' and recipient_user_id = auth.uid())
    or (recipient_type = 'curator' and can_curate_project(project_id, auth.uid()))
    or (recipient_type = 'admin' and is_admin(auth.uid()))
    or can_curate_project(project_id, auth.uid())
  )
  with check (
    author_id = auth.uid()
    or (recipient_type = 'user' and recipient_user_id = auth.uid())
    or (recipient_type = 'curator' and can_curate_project(project_id, auth.uid()))
    or (recipient_type = 'admin' and is_admin(auth.uid()))
    or can_curate_project(project_id, auth.uid())
  );

create policy "project_note_replies_select_visible" on project_note_replies
  for select using (can_view_project_note(note_id, auth.uid()));

create policy "project_note_replies_insert_member" on project_note_replies
  for insert to authenticated
  with check (author_id = auth.uid() and can_view_project_note(note_id, auth.uid()));
