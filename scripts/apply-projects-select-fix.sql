-- ==== supabase/migrations/20260810120002_fix_projects_select_returning.sql ====
-- Fixes a real bug hit live: createProjectAction does
-- `.insert(...).select().single()`, and Postgres re-checks a table's SELECT
-- RLS policy against INSERT ... RETURNING output. Row-level AFTER INSERT
-- triggers (here, projects_create_owner_membership, which creates the
-- owner's project_members row) fire at the end of the statement -- AFTER the
-- RETURNING row has already been checked against the SELECT policy. So
-- is_project_member(id, auth.uid()) saw no membership row yet and rejected
-- the RETURNING of the project the caller had just created themselves.
-- owner_id = auth.uid() is checked directly against the row being inserted,
-- not through project_members, so it has no such timing dependency.
drop policy "projects_select_members" on projects;
create policy "projects_select_members" on projects
  for select using (owner_id = auth.uid() or is_project_member(id, auth.uid()));
