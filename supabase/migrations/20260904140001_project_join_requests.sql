-- Organization Home Project, Project directory, and join requests (OR-036).
-- Mike couldn't find "Sandz General" (it's a knowledge base, not a project)
-- and a colleague independently filed a dev request for the same real gap
-- at scale (docs/dev-request-organization-home-project-directory-and-join-
-- requests.md). This migration adds the two new project-level columns, the
-- join-request table, and seeds the real Sandz Organization Home project.
--
-- Deliberately reuses 'platform' (not a new 'organization' value) for
-- discoverability -- wiki_articles.visibility_scope briefly had an
-- 'organization' value and it was removed (20260824160001) because this
-- schema has no organizations/tenant table; a single-tenant deployment's
-- "everyone in this instance" is already what 'platform' means elsewhere
-- (knowledge_bases.visibility_scope, wiki_articles.visibility_scope).
--
-- No change to projects_select_members RLS (is_project_member -- active
-- member of any role, or platform admin). A genuinely new user still can't
-- SELECT a discoverable project's row through the normal RLS-scoped client;
-- that's served the same way /projects/portfolio already serves org-wide
-- safe metadata to non-members -- an explicit-check-then-admin-client-query
-- service function (listDiscoverableProjects), never a broadened policy.
alter table projects add column discoverability text not null default 'members_only'
  check (discoverability in ('platform', 'members_only'));
alter table projects add column is_organization_home boolean not null default false;

-- Mirrors resource_access_requests (20260901130001) almost exactly -- same
-- status/decision-audit shape, same service-function split (request/decide),
-- same notify-via-project_notes side channel. The one deliberate difference
-- is the insert policy below: resource_access_requests_insert_member
-- requires the requester already be a project member (that feature is for
-- members locked out of a restricted resource); this feature is for people
-- who are NOT project members yet, so insert is gated on the project being
-- either already visible to them or explicitly discoverable instead.
create table project_join_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  note_id uuid references project_notes(id) on delete set null,
  outcome_note_id uuid references project_notes(id) on delete set null,
  decided_by uuid references profiles(id) on delete set null,
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index project_join_requests_project_id_idx on project_join_requests(project_id);
create index project_join_requests_requester_id_idx on project_join_requests(requester_id);

alter table project_join_requests enable row level security;

-- A real DB-level guarantee (not just an app-layer check) that a join
-- request can only ever be filed for a project the requester can already
-- see, or one that's explicitly discoverable -- directly satisfies the dev
-- request's "A user cannot request access to a non-discoverable Project
-- they cannot already see."
create policy "project_join_requests_insert_self" on project_join_requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and (
      is_project_member(project_id, auth.uid())
      or exists (select 1 from projects p where p.id = project_id and p.discoverability = 'platform')
    )
  );

-- Requester sees their own (so the UI can seed "request pending" state);
-- the decision-maker sees every request for their Project. can_curate_project
-- (owner or curator), not can_manage_project (owner-only) -- the dev request
-- explicitly says "Project owner or a Project curator may approve or
-- decline."
create policy "project_join_requests_select_own_or_manager" on project_join_requests
  for select using (
    requester_id = auth.uid()
    or can_curate_project(project_id, auth.uid())
  );

create policy "project_join_requests_update_manager" on project_join_requests
  for update
  using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

-- Seed the real Sandz Organization Home project so the feature is live for
-- the actual pilot, not just a code path nobody has used yet. Content per
-- the dev request's own "Suggested organization-home content" section.
-- projects has no unique constraint on name (duplicate-named seed/example
-- rows already exist elsewhere), so idempotency here is a where-not-exists
-- guard, not on conflict.
insert into projects (name, project_type, objective, status, owner_id, discoverability, is_organization_home, starter_prompt, details)
select
  'Sandz — Organization Home',
  'transformation',
  'The main governed entry point for Sandz users: explains what Sandz does, how Sandz uses KB Sandbox, how Projects and Knowledge Bases relate, who owns or curates each discoverable Project, and how to request access or ask for a missing Project/FAQ.',
  'active',
  p.id,
  'platform',
  true,
  'Ask about Sandz, find the right Project, or request access to a team workspace.',
  '{}'::jsonb
from profiles p
where p.email = 'mikecolligodata@gmail.com'
  and not exists (select 1 from projects existing where existing.is_organization_home = true);

-- Attach the Sandz General knowledge base to it -- the KB stays a KB, the
-- Project is the real entry point, per the dev request's explicit "the
-- Project -- not the KB -- provides the directory and membership request
-- experience."
insert into project_knowledge_bases (project_id, knowledge_base_id, attached_by)
select proj.id, 'sandz-general', proj.owner_id
from projects proj
where proj.is_organization_home = true and proj.name = 'Sandz — Organization Home'
on conflict do nothing;

-- The pilot-facing Projects the dev request names as safe to discover --
-- everything else keeps the safe 'members_only' default.
update projects set discoverability = 'platform' where name in (
  'Sandz Pilot Feedback and Q&A',
  'Sandz HR Knowledge Base',
  'Sandz–Zadara Pilot — Sales Proposals',
  'Sandz–Zadara Pilot — Governance and Evaluation',
  'Sandz–Zadara Pilot — Call Center Support'
);
