-- Renames the 'user' role to 'consultant' (matching the UI/Roles brief's own
-- language -- "user may function as CONSULTANT" becomes literal) and adds a
-- new 'anonymous' role for unauthenticated visitors (real Supabase anonymous
-- auth sessions, wired up separately). Only two places in the schema ever
-- referenced the literal 'user' string -- the check constraint below and the
-- self-insert RLS policy in 20260808190010_rls_policies.sql -- both updated
-- together here.

-- Drop the constraint entirely before the backfill: the old constraint
-- rejects 'consultant', and adding the new constraint before the backfill
-- would immediately reject the still-present 'user' rows (Postgres validates
-- existing rows against a new CHECK constraint at ADD time). So: drop, then
-- backfill data, then add the new constraint once every row already
-- satisfies it.
alter table profiles drop constraint profiles_role_check;

update profiles set role = 'consultant' where role = 'user';

alter table profiles add constraint profiles_role_check
  check (role in ('anonymous', 'consultant', 'curator', 'admin'));
alter table profiles alter column role set default 'consultant';

-- Anonymous auth.users rows have no email; nullable so ensureProfile() can
-- insert an anonymous profile without a placeholder value.
alter table profiles alter column email drop not null;

-- Replace the single self-insert policy with two, split on whether the
-- session is a real Supabase anonymous session (auth.users.is_anonymous) --
-- this is what actually prevents an anonymous session from self-inserting as
-- 'consultant' (privilege escalation blocked at the RLS layer, not just in
-- application code).
drop policy "profiles_insert_self" on profiles;

create policy "profiles_insert_self_consultant" on profiles
  for insert with check (
    auth.uid() = id and role = 'consultant' and is_active = true
    and not exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous)
  );

create policy "profiles_insert_self_anonymous" on profiles
  for insert with check (
    auth.uid() = id and role = 'anonymous' and is_active = true
    and exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous)
  );
