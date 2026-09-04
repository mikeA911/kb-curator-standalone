-- Fix for a real bug caught live 2026-09-04: project_join_requests_insert_self
-- (20260904140001) checked discoverability with a raw
-- `exists (select 1 from projects p where p.id = project_id and
-- p.discoverability = 'platform')` subquery -- but that subquery runs under
-- the CALLER's own RLS on `projects` (projects_select_members: active member
-- of any role, or platform admin), not bypassing it. A genuinely new,
-- non-member user -- exactly who this feature is for -- can never see that
-- project's row through their own RLS, so the subquery always came back
-- empty and every join-request insert failed with a raw Postgres 42501
-- (insufficient_privilege), caught live attempting to request to join
-- "Sandz Pilot Feedback and Q&A" as a fresh test account.
--
-- Same fix shape as is_project_member/can_manage_project/can_curate_project
-- themselves (20260810120001_project_members.sql): a `security definer`
-- helper function bypasses RLS for this one narrow, already-safe check
-- (discoverability is meant to be checkable by definition -- that's the
-- entire point of the column) rather than widening any RLS policy.
create or replace function is_project_discoverable(pid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects p where p.id = pid and p.discoverability = 'platform');
$$;

drop policy "project_join_requests_insert_self" on project_join_requests;
create policy "project_join_requests_insert_self" on project_join_requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and (
      is_project_member(project_id, auth.uid())
      or is_project_discoverable(project_id)
    )
  );
