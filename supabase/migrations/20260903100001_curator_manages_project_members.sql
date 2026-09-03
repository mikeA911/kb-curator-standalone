-- Curator = department head (or their assistant) running their own team's
-- project, confirmed by Mike 2026-09-03: they know their staff and what
-- those staff are working on, and need to invite them into the project
-- directly rather than bouncing every invite through the project owner or
-- a platform admin. project_members_manage_owner (20260810120001) only let
-- 'owner' (or platform admin) touch project_members at all -- too narrow
-- for that.
--
-- Additive policy (OR'd with project_members_manage_owner): a curator can
-- manage any member row EXCEPT the owner's own row, and can never set a
-- row's role to 'owner' -- both directions of ownership stay exclusively
-- an owner/admin action (see transferOwnershipAction in
-- src/lib/workbench/projects.ts), never something a curator can grant to
-- themselves or anyone else.
create policy "project_members_curate" on project_members
  for all using (can_curate_project(project_id, auth.uid()) and role <> 'owner')
  with check (can_curate_project(project_id, auth.uid()) and role <> 'owner');
