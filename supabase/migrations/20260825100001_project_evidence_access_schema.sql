-- Project Evidence Access Controls, Stage 1
-- (docs/dev-request-project-evidence-access-controls.md). Pilot security
-- requirement: project membership currently means "can see every attached
-- source" -- too broad once a client project mixes vendor documentation
-- (whole-team readable) with customer pricing/margins/contracts (readable
-- only by specific people). This migration adds the access model itself;
-- enforcement (AND-gating it into existing retrieval RLS) is the next
-- migration, 20260825110001_project_evidence_access_enforcement.sql.
--
-- Deliberately keeps project role, business function (project_members'
-- existing column from 20260824140001_project_governance.sql), evidence
-- access (this migration), and approval authority (project_authority_
-- assignments) as four independent concepts, per the dev request's own
-- product principle: none of these should silently grant another. No
-- `lead` project role added here -- that's a separate, related change the
-- dev request explicitly doesn't require for this feature; Stage 1's access
-- model only needs the existing owner role to manage groups/grants.
--
-- Confirmed with the user before implementing: no automatic owner bypass.
-- The project owner does not silently see restricted evidence just by
-- owning the project -- they hold access the same explicit way anyone else
-- does (they can always grant themselves one, since they control grants).
-- has_evidence_access() (next migration) has zero bypass for anyone, same
-- shape as is_project_member_strict().

-- project_access_groups -----------------------------------------------------
-- No DB-seeded default rows per project (most projects will never need
-- this) -- the UI offers the dev request's suggested names
-- (sales_commercial, finance_pricing, technical_delivery,
-- security_compliance, customer_visible, named_users_only) as one-click
-- presets when a project owner creates a group, not forced rows.
create table project_access_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  is_system_group boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (project_id, name)
);

create index if not exists project_access_groups_project_id_idx on project_access_groups(project_id);

create trigger project_access_groups_set_updated_at before update on project_access_groups
  for each row execute function set_updated_at();

-- project_access_group_members -----------------------------------------------
-- Revoking flips status + revoked_by/at/reason on the existing row (never
-- deleted) -- same convention as project_authority_assignments. Re-granting
-- after a revoke inserts a fresh row rather than reactivating the old one,
-- so the full grant/revoke history is always intact without a separate
-- audit table for this part of the model.
create table project_access_group_members (
  id uuid primary key default gen_random_uuid(),
  project_access_group_id uuid not null references project_access_groups(id) on delete cascade,
  project_member_id uuid not null references project_members(id) on delete cascade,
  effective_from timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text
);

create index if not exists project_access_group_members_group_id_idx on project_access_group_members(project_access_group_id);
create index if not exists project_access_group_members_member_id_idx on project_access_group_members(project_member_id);

-- resource_access_policies ---------------------------------------------------
-- A resource with NO row here behaves exactly as it does today -- the key
-- backward-compat property. "No policy row" is the implicit project_general
-- default; a row is only ever created when someone deliberately restricts
-- something, so zero migration/backfill is needed for existing content.
-- resource_id is always the *stable* identity (knowledge_sources.id, never
-- documents.id) per the dev request's own note about inheriting through the
-- stable source/version relationship rather than copying access onto every
-- chunk.
create table resource_access_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  resource_type text not null check (resource_type in ('knowledge_source', 'wiki_article', 'workstream_artifact')),
  resource_id uuid not null,
  classification text not null check (classification in (
    'project_general', 'internal_confidential', 'commercial_confidential',
    'security_restricted', 'customer_confidential', 'customer_visible'
  )),
  access_steward_user_id uuid references profiles(id) on delete set null,
  review_at timestamptz,
  rationale text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (resource_type, resource_id)
);

create index if not exists resource_access_policies_project_id_idx on resource_access_policies(project_id);

create trigger resource_access_policies_set_updated_at before update on resource_access_policies
  for each row execute function set_updated_at();

-- resource_access_grants -----------------------------------------------------
-- Exactly one of project_access_group_id / project_member_id is set --
-- either a whole access group is granted, or one named user is (used
-- sparingly, per the dev request: "groups are easier to review and
-- maintain"). Same revoke-in-place / re-grant-as-new-row convention as
-- project_access_group_members.
create table resource_access_grants (
  id uuid primary key default gen_random_uuid(),
  resource_access_policy_id uuid not null references resource_access_policies(id) on delete cascade,
  project_access_group_id uuid references project_access_groups(id) on delete cascade,
  project_member_id uuid references project_members(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text,

  constraint resource_access_grants_exactly_one_grantee check (
    (project_access_group_id is not null and project_member_id is null)
    or (project_access_group_id is null and project_member_id is not null)
  )
);

create index if not exists resource_access_grants_policy_id_idx on resource_access_grants(resource_access_policy_id);

-- resource_access_audit_log --------------------------------------------------
-- The one thing the append-only-by-convention tables above don't cover:
-- resource_access_policies.classification is a mutable field on a
-- unique-per-resource row, so reclassifying in place would otherwise lose
-- history. Insert-only, no update/delete policy at all, no client insert
-- policy either -- same "no client insert path, written via the admin
-- client from the service layer" shape as ai_operation_logs
-- (src/lib/ai/logging.ts), so RLS can't be bypassed by a forged direct
-- insert. Never stores evidence content, only which resource/who/when/what
-- classification, per the dev request's "audit access must itself be
-- restricted" and "avoid recording sensitive evidence in audit messages."
create table resource_access_audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  event_type text not null check (event_type in (
    'resource_classified', 'resource_reclassified',
    'group_created', 'group_member_granted', 'group_member_revoked',
    'resource_grant_granted', 'resource_grant_revoked'
  )),
  resource_type text,
  resource_id uuid,
  actor_id uuid references profiles(id) on delete set null,
  from_classification text,
  to_classification text,
  target_group_id uuid,
  target_member_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists resource_access_audit_log_project_id_idx on resource_access_audit_log(project_id);

-- RLS -------------------------------------------------------------------------
-- All five tables: visible/manageable only by can_manage_project (project
-- owner, or platform admin via that function's existing bypass). This is
-- governance metadata *about* evidence -- which sources are restricted, to
-- whom -- not the evidence content itself, consistent with admin already
-- being able to see e.g. which knowledge bases/articles are attached to a
-- project. The content gate (has_evidence_access, next migration) has zero
-- admin bypass; this administrative visibility does not affect that.
--
-- Select and manage share the exact same authorization boundary here
-- (unlike the wiki/KB junction tables, which deliberately split a strict
-- member-only select from a bypass-allowed manage policy) -- a single FOR
-- ALL policy per table is sufficient and avoids the "combined policy leaks
-- SELECT via OR" trap from 20260824210001, since there's only one policy to
-- begin with.

alter table project_access_groups enable row level security;
create policy "project_access_groups_manage_owner" on project_access_groups
  for all using (can_manage_project(project_id, auth.uid()))
  with check (can_manage_project(project_id, auth.uid()));

alter table project_access_group_members enable row level security;
create policy "project_access_group_members_manage_owner" on project_access_group_members
  for all using (
    exists (
      select 1 from project_access_groups g
      where g.id = project_access_group_members.project_access_group_id and can_manage_project(g.project_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from project_access_groups g
      where g.id = project_access_group_members.project_access_group_id and can_manage_project(g.project_id, auth.uid())
    )
  );

alter table resource_access_policies enable row level security;
create policy "resource_access_policies_manage_owner" on resource_access_policies
  for all using (can_manage_project(project_id, auth.uid()))
  with check (can_manage_project(project_id, auth.uid()));

alter table resource_access_grants enable row level security;
create policy "resource_access_grants_manage_owner" on resource_access_grants
  for all using (
    exists (
      select 1 from resource_access_policies p
      where p.id = resource_access_grants.resource_access_policy_id and can_manage_project(p.project_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from resource_access_policies p
      where p.id = resource_access_grants.resource_access_policy_id and can_manage_project(p.project_id, auth.uid())
    )
  );

alter table resource_access_audit_log enable row level security;
create policy "resource_access_audit_log_select_owner" on resource_access_audit_log
  for select using (can_manage_project(project_id, auth.uid()));
-- No insert/update/delete policy -- written only via the admin client from
-- the service layer (src/lib/projects/evidence-access.ts).
