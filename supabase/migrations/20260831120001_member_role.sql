-- OL-007 (docs/test-reports/2026-08-31-orderlunch-builder-journey.md): a new
-- least-privileged platform role, 'member', below 'consultant'. An ordinary
-- employee should be able to sign in, see their own Projects, use Ember
-- within them, read approved Wiki/knowledge, and participate in permitted
-- Project interactions (notes) -- without being able to create Projects,
-- self-register Builder integrations, or do anything else a plain
-- consultant today can already do that a member shouldn't.
--
-- Audit (this session, three parallel investigations) found the real
-- security-relevant surface for this change is much smaller than "every
-- role != 'anonymous' check": everything that creates/curates content
-- (Workstreams, KBs, Wiki drafts, eval datasets, agent/graph management,
-- KB/Wiki-to-project attach) is already gated by is_curator_or_admin/
-- can_curate_project/can_manage_project, none of which a member (like a
-- plain consultant today) would ever satisfy -- no RLS change needed there.
-- Eval/graph run creation uses a *literal* role = 'consultant' allowlist,
-- which already excludes a member correctly. project_notes insert has no
-- profiles.role check at all -- already matches the intended member
-- capability with zero changes. Only two write policies checked merely
-- "any non-anonymous role", which a member would incorrectly satisfy:
-- projects_insert_self and builder_integrations_insert_own. Tightened below.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('anonymous', 'member', 'consultant', 'curator', 'admin'));

-- Mirrors is_curator_or_admin's exact shape (20260808190009_functions.sql).
create or replace function is_consultant_or_above(uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = uid and role in ('consultant', 'curator', 'admin') and is_active = true
  );
$$;

alter policy "projects_insert_self" on projects
  with check (owner_id = auth.uid() and is_consultant_or_above(auth.uid()));

alter policy "builder_integrations_insert_own" on builder_integrations
  with check (created_by = auth.uid() and is_consultant_or_above(auth.uid()));
