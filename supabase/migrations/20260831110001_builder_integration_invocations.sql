-- Agent Gateway, Milestone 1 (Advanced Builder Integrations Phase C):
-- Ember can now actually call a registered, certified, Project-available
-- MCP server's tools -- not just register/certify it (Phase A). This table
-- is both the audit trail ("recorded evaluation" the dev request asks for)
-- and the pending-confirmation state machine for write-risk tool calls,
-- following this repo's existing convention (resource_access_audit_log,
-- project_status_history): one append-only-ish row per attempt, a status
-- column IS the state machine, no separate pending table.
--
-- Read-only tool calls (see src/lib/mcp-gateway/risk.ts) go straight from
-- nothing to a single 'executed' row -- matching how every other read tool
-- in src/lib/mcp/tools.ts already works today (call, get result, done).
-- Gated (reversible_write/consequential_write/administrative) tool calls
-- insert a 'proposed' row first; a human must explicitly confirm via
-- src/app/actions/gateway-invocations.ts before the external call ever
-- happens -- this is the first code-level "propose, then confirm, then
-- execute" gate anywhere in the app (every other tool today only has a
-- prompt-level confirmation instruction, per project-note-tool.ts's own
-- comment).
create table builder_integration_invocations (
  id uuid primary key default gen_random_uuid(),
  builder_integration_id uuid not null references builder_integrations(id) on delete cascade,
  builder_integration_version_id uuid not null references builder_integration_versions(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  actor_id uuid references profiles(id) on delete set null,
  tool_name text not null,
  -- Snapshotted at call time from the version's own risk_classification /
  -- src/lib/mcp-gateway/risk.ts's name-prefix heuristic -- a later version
  -- change must never silently reclassify a historical row.
  risk_classification text not null
    check (risk_classification in ('read_only', 'reversible_write', 'consequential_write', 'administrative')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'executed', 'failed', 'cancelled')),
  error text,
  -- Best-effort numeric amount correlated for spending_limits enforcement
  -- (see src/lib/mcp-gateway/spending.ts) -- populated when this row's own
  -- tool result contains a total/amount-shaped field, or copied forward
  -- from a prior row sharing an id-shaped field (e.g. orderId) when this
  -- row is a gated write proposal being checked against perOrderMax/dailyMax.
  correlated_amount numeric,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references profiles(id) on delete set null,
  executed_at timestamptz
);

create index builder_integration_invocations_project_id_idx on builder_integration_invocations(project_id);
create index builder_integration_invocations_integration_id_idx on builder_integration_invocations(builder_integration_id);
create index builder_integration_invocations_status_idx on builder_integration_invocations(status);

alter table builder_integration_invocations enable row level security;

-- Visible to: project members, curator/admin staff, or the integration's
-- own registering builder -- identical shape to
-- builder_integration_project_availability_select.
create policy "builder_integration_invocations_select" on builder_integration_invocations
  for select using (
    is_project_member(project_id, auth.uid())
    or is_curator_or_admin(auth.uid())
    or exists (select 1 from builder_integrations bi where bi.id = builder_integration_id and bi.created_by = auth.uid())
  );

-- No client insert/update policy at all, deliberately -- same "no client
-- insert path" posture as resource_access_audit_log and ai_operation_logs.
-- Every write (propose, confirm, execute, cancel) goes through the admin
-- client from src/lib/chat/loop.ts / src/app/actions/gateway-invocations.ts,
-- each already gated by an explicit application-level authorization check
-- before the write happens -- RLS on this table exists only to bound reads.
