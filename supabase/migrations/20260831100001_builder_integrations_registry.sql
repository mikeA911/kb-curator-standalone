-- Advanced Builder Integrations, Phase A (docs/design-notes/concept-paper-
-- advanced-builder-integrations.md). Generalizes the External Agent
-- Registry (20260827150001_external_agent_registry.sql) to also register
-- MCP servers, not just external agents -- the kind of registration Phase C
-- (Ember actually calling one) will need next. Renamed
-- external_agents/external_agent_versions -> builder_integrations/
-- builder_integration_versions, since "external_agents" becomes misleading
-- once MCP-server rows live in the same table.
--
-- Deliberately NOT covered by this pass: knowledge connectors (a batch-sync
-- lifecycle, not "can Ember call this tool") and webhook receivers (Phase
-- D's concern -- nothing exists yet to receive into). REST APIs are never
-- independently registered here -- they're what an MCP server or connector
-- uses underneath, per the concept paper's own "five concepts" section.
--
-- Certification ladder is UNCHANGED (still experimental -> sandbox_tested
-- -> security_reviewed -> outlet_accepted -> production_approved, plus
-- deprecated/suspended) -- it's live, tested, and matches the original
-- Sandz pitch doc's own language ("distinguish experimental, tested and
-- production-approved versions"). The concept paper's proposed 6-stage
-- ladder (Registered -> Connectivity verified -> Functionally evaluated ->
-- Security reviewed -> Customer accepted -> Production approved) maps
-- closely enough (security_reviewed/production_approved are exact matches;
-- outlet_accepted is this app's per-vertical name for Customer accepted;
-- experimental/sandbox_tested cover the earlier self-serve stages) that
-- renaming a proven ladder for cosmetic alignment wasn't worth the churn.
-- Recorded here so this isn't silently re-litigated later.

alter table external_agents rename to builder_integrations;
alter table external_agent_versions rename to builder_integration_versions;
alter table builder_integration_versions rename column external_agent_id to builder_integration_id;

-- Renaming a table does not rename its dependent indexes/trigger/explicitly-
-- named constraints in Postgres -- only auto-generated-name objects (like
-- the FKs from a bare `references` clause) are left as legacy
-- external_agent*-prefixed names, which is harmless and not worth
-- enumerating here. These are the ones worth cleaning up for anyone reading
-- \d builder_integrations later.
alter index external_agents_pkey rename to builder_integrations_pkey;
alter index external_agents_slug_key rename to builder_integrations_slug_key;
alter index external_agents_project_id_idx rename to builder_integrations_project_id_idx;
alter index external_agents_created_by_idx rename to builder_integrations_created_by_idx;
alter table builder_integrations rename constraint external_agents_active_version_id_fkey to builder_integrations_active_version_id_fkey;
alter trigger external_agents_set_updated_at on builder_integrations rename to builder_integrations_set_updated_at;

alter index external_agent_versions_pkey rename to builder_integration_versions_pkey;
alter index external_agent_versions_external_agent_id_version_number_key rename to builder_integration_versions_integration_id_version_key;
alter index external_agent_versions_external_agent_id_idx rename to builder_integration_versions_integration_id_idx;

-- Policy renames are purely cosmetic (a policy's name never has to match
-- its table), but worth doing while every other name is moving -- Postgres
-- auto-updates the policy bodies' internal references to the renamed
-- table/column above, so only the names below need touching, not the SQL.
alter policy "external_agents_select_authenticated" on builder_integrations rename to "builder_integrations_select_authenticated";
alter policy "external_agents_insert_own" on builder_integrations rename to "builder_integrations_insert_own";
alter policy "external_agents_update_own_or_staff" on builder_integrations rename to "builder_integrations_update_own_or_staff";
alter policy "external_agent_versions_select_authenticated" on builder_integration_versions rename to "builder_integration_versions_select_authenticated";
alter policy "external_agent_versions_insert_own_agent" on builder_integration_versions rename to "builder_integration_versions_insert_own";
alter policy "external_agent_versions_update_certification_staff_only" on builder_integration_versions rename to "builder_integration_versions_update_certification_staff_only";

-- kind: what's being registered. Existing rows are genuinely all external
-- agents, so the temporary default backfills them correctly; dropped
-- immediately after so every future insert must specify kind explicitly,
-- matching this table's existing convention for `protocol` (no default,
-- always stated).
alter table builder_integrations
  add column kind text not null default 'external_agent' check (kind in ('external_agent', 'mcp_server'));
alter table builder_integrations alter column kind drop default;

-- risk_classification / auth_method: version-level, not integration-level,
-- since risk can change between versions (a v2 might add a write capability
-- a v1 didn't have). risk_classification operationalizes the concept
-- paper's "treat read and write differently" principle and is what Phase C
-- will gate tool exposure on -- unlike kind/protocol, it keeps a permanent
-- default: 'read_only' is the deliberately safe assumption for a version
-- that never stated otherwise. auth_method is descriptive only for now,
-- same "reference, not enforcement" posture credentials_policy already has.
alter table builder_integration_versions
  add column risk_classification text not null default 'read_only'
    check (risk_classification in ('read_only', 'reversible_write', 'consequential_write', 'administrative')),
  add column auth_method text;

-- Project availability -- replaces permitted_scope.projectIds (inert JSON;
-- nothing has ever read it, per the original migration's own comment) as
-- the REAL mechanism. Phase C's "Ember discovers only tools permitted for
-- the current Project" needs a real join to query, not a JSON blob.
-- permitted_scope itself is untouched (still holds userIds and whatever
-- else isn't modeled as a real table yet).
create table builder_integration_project_availability (
  id uuid primary key default gen_random_uuid(),
  builder_integration_id uuid not null references builder_integrations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (builder_integration_id, project_id)
);

create index builder_integration_project_availability_integration_id_idx
  on builder_integration_project_availability(builder_integration_id);
create index builder_integration_project_availability_project_id_idx
  on builder_integration_project_availability(project_id);

alter table builder_integration_project_availability enable row level security;

-- Visible to: the integration's own registering builder, curator/admin
-- staff, or any active member of the referenced project -- so a Project
-- owner can see what's available to their own Project without needing
-- platform staff role.
create policy "builder_integration_project_availability_select" on builder_integration_project_availability
  for select using (
    is_project_member(project_id, auth.uid())
    or is_curator_or_admin(auth.uid())
    or exists (select 1 from builder_integrations bi where bi.id = builder_integration_id and bi.created_by = auth.uid())
  );

-- Manage (grant/revoke): the registering builder or curator/admin -- same
-- bar createExternalAgentVersion already uses for adding a new version.
create policy "builder_integration_project_availability_manage" on builder_integration_project_availability
  for all using (
    is_curator_or_admin(auth.uid())
    or exists (select 1 from builder_integrations bi where bi.id = builder_integration_id and bi.created_by = auth.uid())
  )
  with check (
    is_curator_or_admin(auth.uid())
    or exists (select 1 from builder_integrations bi where bi.id = builder_integration_id and bi.created_by = auth.uid())
  );
