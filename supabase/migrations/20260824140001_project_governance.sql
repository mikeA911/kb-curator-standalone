-- Project Approval Authorities and Governance
-- (docs/dev-request-project-approval-authorities.md), Stage 1: authority
-- planning foundation only. No approval requests/decisions tables yet --
-- those are Stage 2. Deliberately separate from platform role
-- (profiles.role) and project role (project_members.role): a policy says
-- WHAT approval a project needs; an authority assignment says WHO may make
-- that specific decision. Neither is inferred from platform admin status --
-- can_manage_project's existing is_admin bypass lets a platform admin
-- administer this shell the same way they can already manage members, but
-- that is setup, not a fabricated approval authority (there is nothing to
-- approve yet in Stage 1).

-- Business function describes why a member participates -- it routes
-- approval work but does not by itself grant authority. Bounded catalogue
-- per the dev request; 'other' pairs with function_notes for a short
-- free-text description.
alter table project_members
  add column if not exists business_function text
    check (business_function in (
      'business_development_sales', 'finance_pricing', 'legal_commercial', 'customer_support',
      'delivery_consulting', 'architecture_engineering', 'security_compliance',
      'customer_representative', 'project_governance', 'other'
    )),
  add column if not exists function_notes text;

create table if not exists project_approval_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  approval_type text not null check (approval_type in (
    'technical', 'pricing', 'commercial', 'security_compliance', 'support_commitment',
    'proposal_release', 'customer_acceptance', 'knowledge_publication', 'production_change'
  )),
  requirement_status text not null default 'required'
    check (requirement_status in ('required', 'optional', 'not_applicable')),
  sequence integer,
  minimum_approvals integer not null default 1,
  approval_mode text not null default 'any_authorized' check (approval_mode in ('any_authorized', 'all_assigned')),
  allow_self_approval boolean not null default false,
  monetary_trigger numeric,
  discount_trigger_percent numeric,
  visibility_scope text not null default 'internal' check (visibility_scope in ('internal', 'customer_visible')),
  required_before_release boolean not null default false,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (project_id, approval_type)
);

create index if not exists project_approval_policies_project_id_idx on project_approval_policies(project_id);

drop trigger if exists project_approval_policies_set_updated_at on project_approval_policies;
create trigger project_approval_policies_set_updated_at before update on project_approval_policies
  for each row execute function set_updated_at();

create table if not exists project_authority_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  business_function text
    check (business_function in (
      'business_development_sales', 'finance_pricing', 'legal_commercial', 'customer_support',
      'delivery_consulting', 'architecture_engineering', 'security_compliance',
      'customer_representative', 'project_governance', 'other'
    )),
  approval_type text not null check (approval_type in (
    'technical', 'pricing', 'commercial', 'security_compliance', 'support_commitment',
    'proposal_release', 'customer_acceptance', 'knowledge_publication', 'production_change'
  )),
  monetary_limit numeric,
  discount_limit_percent numeric,
  conditions text,
  effective_from timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'revoked')),
  allow_self_approval boolean not null default false,
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_authority_assignments_project_id_idx on project_authority_assignments(project_id);
create index if not exists project_authority_assignments_user_id_idx on project_authority_assignments(user_id);

drop trigger if exists project_authority_assignments_set_updated_at on project_authority_assignments;
create trigger project_authority_assignments_set_updated_at before update on project_authority_assignments
  for each row execute function set_updated_at();

-- RLS: same shape as project_workstreams (20260811100004_project_workstreams.sql)
-- -- any active project member (including 'viewer') can see the governance
-- setup; only the project owner (or platform admin, via can_manage_project's
-- existing bypass) can change it. Stage 1 has no "governance manager" role
-- distinct from owner -- the dev request explicitly forbids inventing a new
-- global platform role, and no separate concept exists yet to delegate to.
alter table project_approval_policies enable row level security;

create policy "project_approval_policies_select_member" on project_approval_policies
  for select using (is_project_member(project_id, auth.uid()));

create policy "project_approval_policies_manage_owner" on project_approval_policies
  for all using (can_manage_project(project_id, auth.uid()))
  with check (can_manage_project(project_id, auth.uid()));

alter table project_authority_assignments enable row level security;

create policy "project_authority_assignments_select_member" on project_authority_assignments
  for select using (is_project_member(project_id, auth.uid()));

create policy "project_authority_assignments_manage_owner" on project_authority_assignments
  for all using (can_manage_project(project_id, auth.uid()))
  with check (can_manage_project(project_id, auth.uid()));
