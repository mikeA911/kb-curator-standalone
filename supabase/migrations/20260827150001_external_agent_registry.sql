-- External Agent Registry -- scaffolding for the Sandz Builders Programme
-- pitch (docs/commercial/KB-Sandbox-Builders-Programme-for-Sandz.docx,
-- docs/dev-request-food-outlet-ai-readiness-showcase.md). Registers agents
-- that run OUTSIDE KB Sandbox (a builder's Lunch Agent on Sandz/customer
-- infrastructure) so KB Sandbox can govern them -- distinct from the
-- existing `agents`/`agent_versions` tables (20260811100003_agent_framework.sql),
-- which are KBS-native, graph-based RAG agents Ember runs itself. Prefixed
-- external_agent_* throughout to keep the two concepts unambiguous.
--
-- Explicitly NOT covered by this migration: no Agent Gateway (nothing here
-- actually invokes a registered agent's endpoint), no real credential vault
-- (credentials_policy is a reference to where a secret lives, never the
-- secret itself), and permitted_scope is descriptive registry metadata only
-- -- not wired into RLS or any invocation path, since no invocation path
-- exists yet.

create table external_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  purpose text not null,
  protocol text not null check (protocol in ('mcp', 'https')),
  endpoint_url text,                                             -- null until actually deployed
  project_id uuid references projects(id) on delete set null,    -- governing project, e.g. Food Outlet AI-Readiness Showcase
  active_version_id uuid,                                        -- FK added below once external_agent_versions exists
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index external_agents_project_id_idx on external_agents(project_id);
create index external_agents_created_by_idx on external_agents(created_by);

create trigger external_agents_set_updated_at before update on external_agents
  for each row execute function set_updated_at();

-- external_agent_versions -----------------------------------------------
-- Immutable once created, same enforcement mechanism as agent_versions /
-- wiki_versions (no UPDATE policy on the version's descriptive fields --
-- only certification_status/approved_by/approved_at ever change, via a
-- dedicated curator/admin-only policy below). "Approval applies to a
-- specific version. A material code, API or permission change requires
-- reassessment" (source doc, verbatim) is why certification lives here and
-- not on the parent row -- a new version always starts back at 'experimental'.
create table external_agent_versions (
  id uuid primary key default gen_random_uuid(),
  external_agent_id uuid not null references external_agents(id) on delete cascade,
  version_number integer not null,
  skills jsonb not null default '[]'::jsonb,              -- [{name, description, provider/outlet}]
  credentials_policy jsonb not null default '{}'::jsonb,  -- references only -- {name, storage_location, notes}; NEVER a secret value
  spending_limits jsonb not null default '{}'::jsonb,     -- {perOrderMax, dailyMax, currency}
  approval_policy jsonb not null default '{}'::jsonb,     -- {requiresHumanConfirmation, confirmationFields: [...]}
  permitted_scope jsonb not null default '{}'::jsonb,     -- {projectIds:[...], userIds:[...]} -- DISPLAY ONLY, see note above
  certification_status text not null default 'experimental'
    check (certification_status in ('experimental', 'sandbox_tested', 'security_reviewed', 'outlet_accepted', 'production_approved', 'deprecated', 'suspended')),
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  unique (external_agent_id, version_number)
);

create index external_agent_versions_external_agent_id_idx on external_agent_versions(external_agent_id);

alter table external_agents add constraint external_agents_active_version_id_fkey
  foreign key (active_version_id) references external_agent_versions(id) on delete set null;

-- RLS -----------------------------------------------------------------------
alter table external_agents enable row level security;
alter table external_agent_versions enable row level security;

-- Read: any authenticated, active, non-anonymous session -- same bar as
-- ai_providers/agent_templates. Needed so any Builder can browse the
-- registry, not just admins.
create policy "external_agents_select_authenticated" on external_agents
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role <> 'anonymous' and p.is_active)
  );

create policy "external_agent_versions_select_authenticated" on external_agent_versions
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role <> 'anonymous' and p.is_active)
  );

-- Insert: any authenticated non-anonymous user may register their OWN agent
-- (created_by = auth.uid()) -- this is what lets a Builder self-register,
-- matching the Programme's "Builder" tier, without requiring curator/admin
-- staff to create every entry on a builder's behalf.
create policy "external_agents_insert_own" on external_agents
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role <> 'anonymous' and p.is_active)
  );

create policy "external_agent_versions_insert_own_agent" on external_agent_versions
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from external_agents ea
      where ea.id = external_agent_id and (ea.created_by = auth.uid() or is_curator_or_admin(auth.uid()))
    )
  );

-- Update: the parent row's own mutable fields (status, endpoint_url,
-- active_version_id) may be updated by the owning builder or curator/admin.
create policy "external_agents_update_own_or_staff" on external_agents
  for update using (created_by = auth.uid() or is_curator_or_admin(auth.uid()));

-- Certification status is staff-only -- a builder self-registers a draft,
-- but cannot self-certify it. One gate covers every tier for this first
-- pass (see plan's "explicitly not built" section for the deferred
-- per-tier permission matrix).
create policy "external_agent_versions_update_certification_staff_only" on external_agent_versions
  for update using (is_curator_or_admin(auth.uid()));
