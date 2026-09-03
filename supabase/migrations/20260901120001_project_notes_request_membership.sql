-- "Request membership" on the Organization Portfolio (/projects/portfolio).
-- A curator viewing that page can see a project's safe metadata but, unlike
-- an admin, has no RLS bypass into its actual content -- they need an
-- explicit project_members row first. project_notes_insert_member
-- (20260814120001_project_notes.sql) requires the author to already be a
-- project member, which is exactly what a membership *request* can't
-- satisfy. Rather than weakening that policy, add a second, narrowly-scoped
-- insert policy: any curator/admin may author a note on a project they are
-- not yet a member of, same as they already have oversight visibility into
-- via can_curate_project elsewhere. Postgres OR's multiple permissive
-- policies for the same command, so project_notes_insert_member is
-- untouched -- ordinary members still can't note projects they're not on.
create policy "project_notes_insert_curator_or_admin" on project_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and is_curator_or_admin(auth.uid())
    and (recipient_type != 'user' or is_project_member(project_id, recipient_user_id))
  );
