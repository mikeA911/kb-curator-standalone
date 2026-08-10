-- ==== supabase/migrations/20260810120001_project_members.sql ====
-- Project membership & isolation (M3.6). Two authorization levels now exist
-- side by side: platform role (profiles.role -- admin/curator/consultant)
-- controls what someone can administer across KB Sandbox; project role
-- (project_members.role -- owner/curator/consultant/viewer) controls what
-- they can do inside one specific project. Giving someone 'consultant'
-- access to one project must never grant access to another.
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'curator', 'consultant', 'viewer')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

drop trigger if exists project_members_set_updated_at on project_members;
create trigger project_members_set_updated_at before update on project_members
  for each row execute function set_updated_at();

-- The project's owner_id always has a matching 'owner' membership row --
-- enforced by trigger, not by every call site remembering to insert one.
create or replace function create_owner_membership()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    insert into project_members (project_id, user_id, role, status)
    values (new.id, new.owner_id, 'owner', 'active')
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_create_owner_membership on projects;
create trigger projects_create_owner_membership
  after insert on projects
  for each row execute function create_owner_membership();

-- One-time backfill for any project created before this migration.
insert into project_members (project_id, user_id, role, status)
select id, owner_id, 'owner', 'active' from projects where owner_id is not null
on conflict (project_id, user_id) do nothing;

-- Reusable authorization helpers -----------------------------------------------
-- Every one of these has a platform-admin bypass built in ("Platform Admin ->
-- all projects"), so it never has to be repeated in a policy body. Only
-- 'active' membership rows count -- a deactivated membership grants nothing.
create or replace function is_project_member(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm where pm.project_id = pid and pm.user_id = uid and pm.status = 'active'
  );
$$;

create or replace function can_manage_project(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm
    where pm.project_id = pid and pm.user_id = uid and pm.status = 'active' and pm.role = 'owner'
  );
$$;

create or replace function can_curate_project(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm
    where pm.project_id = pid and pm.user_id = uid and pm.status = 'active' and pm.role in ('owner', 'curator')
  );
$$;

create or replace function can_run_project_evals(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm
    where pm.project_id = pid and pm.user_id = uid and pm.status = 'active' and pm.role in ('owner', 'curator', 'consultant')
  );
$$;

-- Consistency guard: an eval_datasets row that has both a project and a
-- knowledge base must not point at a KB belonging to a *different* project.
-- Enforced here, not just in the attach actions, per the explicit gap this
-- milestone was asked to close.
create or replace function validate_eval_dataset_project_kb_consistency()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  kb_project_id uuid;
begin
  if new.knowledge_base_id is not null and new.project_id is not null then
    select project_id into kb_project_id from knowledge_bases where id = new.knowledge_base_id;
    if kb_project_id is not null and kb_project_id != new.project_id then
      raise exception 'eval_datasets.knowledge_base_id (project %) does not belong to eval_datasets.project_id (%)', kb_project_id, new.project_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists eval_datasets_validate_project_kb_consistency on eval_datasets;
create trigger eval_datasets_validate_project_kb_consistency
  before insert or update on eval_datasets
  for each row execute function validate_eval_dataset_project_kb_consistency();

-- project_members RLS -----------------------------------------------------------
alter table project_members enable row level security;

create policy "project_members_select_member" on project_members
  for select using (is_project_member(project_id, auth.uid()));

create policy "project_members_manage_owner" on project_members
  for all using (can_manage_project(project_id, auth.uid()))
  with check (can_manage_project(project_id, auth.uid()));

-- projects RLS: replace the "every non-anonymous user sees every project"
-- policy from 20260810100003 with real membership scoping.
drop policy "projects_select_staff_or_consultant" on projects;
create policy "projects_select_members" on projects
  for select using (is_project_member(id, auth.uid()));

drop policy "projects_update_owner_or_staff" on projects;
create policy "projects_update_managers" on projects
  for update using (can_manage_project(id, auth.uid()))
  with check (can_manage_project(id, auth.uid()));

-- knowledge_bases RLS: close the actual gap -- today ANY authenticated user
-- sees every KB, including ones scoped to a project they're not a member of.
-- Global KBs (project_id is null, e.g. fhir/vbc/grants/billing) stay visible
-- to everyone, unchanged. kb_admin_manage (platform admin, full access) is
-- untouched -- this only replaces the overly-broad select policy and adds
-- manage rights for a project's own curator/owner.
drop policy "kb_select_authenticated" on knowledge_bases;
create policy "kb_select_global_or_member" on knowledge_bases
  for select using (project_id is null or is_project_member(project_id, auth.uid()));

create policy "kb_manage_project_curator" on knowledge_bases
  for all using (project_id is not null and can_curate_project(project_id, auth.uid()))
  with check (project_id is not null and can_curate_project(project_id, auth.uid()));

-- eval_datasets / eval_cases / eval_runs / eval_results ------------------------
-- The existing platform-wide curator/admin policies from Milestone 3
-- (is_curator_or_admin-based) are intentionally left untouched -- a platform
-- curator/admin can still manage any dataset, which is what keeps the
-- platform-level "AI Engineering Wiki Benchmark" (project_id is null)
-- working exactly as before. What changes is the *consultant* policies added
-- in 20260810100004: they let ANY platform consultant see/run ANY active
-- dataset regardless of project, which is precisely what "users who are not
-- members should not see the project" (this milestone's brief) asks to
-- close. Each is dropped and recreated with a project-membership condition
-- added alongside the existing status='active' + platform-role check.
--
-- SELECT policies use is_project_member (any active role, including
-- 'viewer' -- viewers are explicitly read-only, not excluded from viewing).
-- INSERT policies (running an eval) use can_run_project_evals, which
-- excludes 'viewer' -- a viewer must never be able to trigger a run.
drop policy "eval_datasets_select_active_consultant" on eval_datasets;
create policy "eval_datasets_select_active_consultant" on eval_datasets
  for select using (
    status = 'active'
    and (project_id is null or is_project_member(project_id, auth.uid()))
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_cases_select_active_consultant" on eval_cases;
create policy "eval_cases_select_active_consultant" on eval_cases
  for select using (
    exists (
      select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'active'
      and (d.project_id is null or is_project_member(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_runs_select_active_consultant" on eval_runs;
create policy "eval_runs_select_active_consultant" on eval_runs
  for select using (
    exists (
      select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active'
      and (d.project_id is null or is_project_member(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_runs_insert_active_consultant" on eval_runs;
create policy "eval_runs_insert_active_consultant" on eval_runs
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active'
      and (d.project_id is null or can_run_project_evals(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_results_select_active_consultant" on eval_results;
create policy "eval_results_select_active_consultant" on eval_results
  for select using (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
      and (d.project_id is null or is_project_member(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_results_insert_active_consultant" on eval_results;
create policy "eval_results_insert_active_consultant" on eval_results
  for insert with check (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
      and (d.project_id is null or can_run_project_evals(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

-- New, additive: project curator/owner can fully manage their own project's
-- dataset/cases even when their *platform* role is merely 'consultant' --
-- e.g. the "Senior AI Consultant" project Owner in the brief's Example 1.
create policy "eval_datasets_manage_project_curator" on eval_datasets
  for all using (project_id is not null and can_curate_project(project_id, auth.uid()))
  with check (project_id is not null and can_curate_project(project_id, auth.uid()));

create policy "eval_cases_manage_project_curator" on eval_cases
  for all using (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.project_id is not null and can_curate_project(d.project_id, auth.uid()))
  )
  with check (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.project_id is not null and can_curate_project(d.project_id, auth.uid()))
  );
