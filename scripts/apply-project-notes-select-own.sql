-- Fixes a real bug found via live verification: can_view_project_note
-- re-queries project_notes internally, and that subquery's snapshot cannot
-- see the row an INSERT ... RETURNING (i.e. .insert().select() as used by
-- createProjectNoteAction) is still in the middle of creating -- so sending
-- a note failed RLS on its own return value. This adds a second, direct
-- SELECT policy for "it's my own note" that needs no subquery, alongside
-- the existing can_view_project_note-based policy (multiple SELECT
-- policies OR together, so nothing else changes).
create policy "project_notes_select_own" on project_notes
  for select using (author_id = auth.uid());
