-- Repair pass for 20260814120001_project_notes.sql. Live-verification found
-- INSERT into project_notes failing with "new row violates row-level
-- security policy" even for the project owner, for every recipient_type --
-- consistent with the INSERT (and likely SELECT) policies not having been
-- created on the previous run, while the table/trigger/function did commit.
-- Safe to re-run: drops each policy if present, then recreates it, and
-- re-applies the (already idempotent) helper function.

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
      or can_curate_project(n.project_id, uid)
    )
  );
$$;

drop policy if exists "project_notes_select_visible" on project_notes;
drop policy if exists "project_notes_insert_member" on project_notes;
drop policy if exists "project_notes_resolve" on project_notes;
drop policy if exists "project_note_replies_select_visible" on project_note_replies;
drop policy if exists "project_note_replies_insert_member" on project_note_replies;

create policy "project_notes_select_visible" on project_notes
  for select using (can_view_project_note(id, auth.uid()));

create policy "project_notes_insert_member" on project_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and is_project_member(project_id, auth.uid())
    and (recipient_type != 'user' or is_project_member(project_id, recipient_user_id))
  );

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
