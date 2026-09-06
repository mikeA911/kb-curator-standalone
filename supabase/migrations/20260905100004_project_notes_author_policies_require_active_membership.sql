-- Same owner-fallback gap just found and fixed in Working Knowledge
-- (20260905100003), confirmed present here too: project_notes_select_own and
-- project_notes_resolve's author_id branch check only author_id = auth.uid(),
-- never whether that author is STILL a currently active Project member.
-- Since Postgres OR-combines permissive RLS policies, an author removed from
-- the Project could keep reading and resolving their own note via these
-- fallback branches, even though project_notes_select_visible's
-- can_view_project_note helper already requires is_project_member on every
-- other branch. docs/dev-request-role-aware-project-views-and-ember-first-
-- workspace.md is explicit and general, not Working-Knowledge-specific:
-- "Revoking or suspending membership must remove the Project from the
-- user's view and prevent further project-bound retrieval immediately"
-- (line 74) and acceptance criterion 9, "Revoking membership immediately
-- removes listing, page and Ember access."
--
-- Deliberately NOT touching can_view_project_note itself or the other
-- project_notes_resolve branches (recipient_type = 'curator'/'admin' via
-- can_curate_project/is_admin) -- those already encode intentional
-- curator/admin oversight regardless of membership ("curator/owner oversight,
-- regardless of recipient_type", the function's own comment), a different,
-- deliberate design from the author-only fallback this migration closes.
-- Uses is_project_member_strict (never plain is_project_member, which has
-- its own admin bypass) so this holds even for an author who happens to also
-- be a platform admin -- matching the Working Knowledge fix's precedent.

drop policy "project_notes_select_own" on project_notes;
create policy "project_notes_select_own" on project_notes
  for select using (author_id = auth.uid() and is_project_member_strict(project_id, auth.uid()));

drop policy "project_notes_resolve" on project_notes;
create policy "project_notes_resolve" on project_notes
  for update
  using (
    (author_id = auth.uid() and is_project_member_strict(project_id, auth.uid()))
    or (recipient_type = 'user' and recipient_user_id = auth.uid())
    or (recipient_type = 'curator' and can_curate_project(project_id, auth.uid()))
    or (recipient_type = 'admin' and is_admin(auth.uid()))
    or can_curate_project(project_id, auth.uid())
  )
  with check (
    (author_id = auth.uid() and is_project_member_strict(project_id, auth.uid()))
    or (recipient_type = 'user' and recipient_user_id = auth.uid())
    or (recipient_type = 'curator' and can_curate_project(project_id, auth.uid()))
    or (recipient_type = 'admin' and is_admin(auth.uid()))
    or can_curate_project(project_id, auth.uid())
  );
