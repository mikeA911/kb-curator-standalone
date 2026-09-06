-- Builder Capability Promotion (docs/dev-request-builder-capability-
-- promotion-evaluation-templates.md): before a builder-produced capability
-- (MCP server/connector/agent) reaches a customer, it must pass
-- proportionate evidence-based evaluation. Distinct from Workstream
-- Promotion (business-process handoff) -- this certifies the *artifact*,
-- reusing the existing Builder Registry (builder_integration_versions,
-- 20260827150001_external_agent_registry.sql) and its live certification
-- ladder. The ladder itself is unchanged -- see that migration's own
-- rename comment for why 'outlet_accepted' stays the DB value for what
-- this doc calls "Customer Accepted."
--
-- One evidence row per template per version (confirmed with Mike --
-- combined evidence note, not itemized per-check tracking): the builder
-- writes one evidence_notes writeup covering the doc's own listed checks
-- for that template; a reviewer records one pass/conditional_pass/fail/
-- not_applicable decision + rationale for the whole template. Mirrors
-- workstream_artifacts.status's own draft -> ready_for_review ->
-- approved/rejected shape almost exactly (20260831130001).
create table capability_evaluations (
  id uuid primary key default gen_random_uuid(),
  builder_integration_version_id uuid not null references builder_integration_versions(id) on delete cascade,
  template_id text not null check (template_id in (
    'scope_evidence', 'functional_contract', 'identity_permissions',
    'human_decision', 'customer_acceptance', 'production_readiness'
  )),
  status text not null default 'draft'
    check (status in ('draft', 'ready_for_review', 'pass', 'conditional_pass', 'fail', 'not_applicable')),
  evidence_notes text,
  rationale text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (builder_integration_version_id, template_id)
);

create index capability_evaluations_version_id_idx on capability_evaluations(builder_integration_version_id);

create trigger capability_evaluations_set_updated_at before update on capability_evaluations
  for each row execute function set_updated_at();

alter table capability_evaluations enable row level security;

-- Same "any Builder can browse the registry" bar as builder_integration_versions_select_authenticated.
create policy "capability_evaluations_select_authenticated" on capability_evaluations
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role <> 'anonymous' and p.is_active)
  );

-- Insert is the registering builder (of the parent integration) or staff --
-- same authorization shape as requireIntegrationManager in registry.ts.
create policy "capability_evaluations_insert_owner_or_staff" on capability_evaluations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      is_curator_or_admin(auth.uid())
      or exists (
        select 1 from builder_integration_versions v
        join builder_integrations bi on bi.id = v.builder_integration_id
        where v.id = builder_integration_version_id and bi.created_by = auth.uid()
      )
    )
  );

-- The registering builder may edit their own evidence -- but the WITH CHECK
-- restricts status to the two non-terminal values, so even a raw API call
-- (not just the UI) cannot self-decide a gate. This is genuine RLS
-- enforcement, not just an app-layer convention -- Postgres has no
-- column-level RLS, so the terminal states must be excluded at the row
-- level for this policy specifically, leaving them reachable only via the
-- separate staff-only policy below.
create policy "capability_evaluations_update_owner_evidence" on capability_evaluations
  for update
  using (
    exists (
      select 1 from builder_integration_versions v
      join builder_integrations bi on bi.id = v.builder_integration_id
      where v.id = builder_integration_version_id and bi.created_by = auth.uid()
    )
  )
  with check (
    status in ('draft', 'ready_for_review')
    and exists (
      select 1 from builder_integration_versions v
      join builder_integrations bi on bi.id = v.builder_integration_id
      where v.id = builder_integration_version_id and bi.created_by = auth.uid()
    )
  );

-- Terminal decisions (pass/conditional_pass/fail/not_applicable) plus
-- rationale/reviewed_by/reviewed_at are staff-only -- matches
-- updateCertificationStatus's own "curator/admin only" bar exactly. A
-- Builder's platform role is always 'consultant', so this already excludes
-- them from ever deciding their own evaluation, by construction.
create policy "capability_evaluations_decide_staff" on capability_evaluations
  for update
  using (is_curator_or_admin(auth.uid()))
  with check (is_curator_or_admin(auth.uid()));
