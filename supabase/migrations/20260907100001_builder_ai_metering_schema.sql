-- Builder AI Usage Metering + Bring-Your-Own-LLM (BYOLLM). Closes the
-- "credits used and remaining" gap listBuilderOperationsRows
-- (src/lib/workbench/builder-progress-updates.ts) deliberately left blank --
-- "no metering infrastructure exists yet". Implements the "Credits and
-- metering" section of docs/dev-request-kb-sandbox-builder-product.md:
-- per-call cost, monthly allowance, manually-granted credit top-ups, and a
-- configurable stop threshold. Deliberately NOT the 5-milestone-triggered
-- automatic credit awards from that same doc -- the milestones themselves
-- don't exist yet, same deferral already on record for this whole
-- initiative.
--
-- BYOLLM lets a builder opt out of being metered entirely by supplying their
-- own provider credentials (or a local, keyless OpenAI-compatible server
-- like Ollama/LM Studio) -- this is the first table in this codebase to
-- store a real secret value (encrypted application-side; see
-- src/lib/ai/credential-crypto.ts). Every other "external credential"
-- pattern here (ai_providers.api_key_env_var, builder_integration_versions.
-- credentials_policy/auth_method) is deliberately reference-only.

alter table ai_operation_logs
  add column project_id uuid references projects(id) on delete set null,
  add column estimated_cost_usd numeric,
  add column is_byo_llm boolean not null default false;

create index ai_operation_logs_project_id_idx on ai_operation_logs(project_id);

-- One row per builder -- current allowance config. A missing row means "use
-- the platform-wide default" (a constant in application code, not a seeded
-- row per builder) -- same "don't fabricate a value" posture
-- listBuilderOperationsRows already uses for the fields it omits today.
create table builder_ai_allowances (
  builder_id uuid primary key references profiles(id) on delete cascade,
  monthly_allowance_usd numeric not null default 20,
  warning_threshold_pct numeric not null default 80 check (warning_threshold_pct between 0 and 100),
  stop_at_allowance boolean not null default true,
  current_period_start date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger builder_ai_allowances_set_updated_at before update on builder_ai_allowances
  for each row execute function set_updated_at();

alter table builder_ai_allowances enable row level security;

-- A builder sees only their own allowance; platform curator/admin sees any --
-- same shape as builder_progress_updates_select_own_or_operator.
create policy "builder_ai_allowances_select_own_or_operator" on builder_ai_allowances
  for select using (builder_id = auth.uid() or is_curator_or_admin(auth.uid()));

-- Only staff ever sets/adjusts an allowance -- a builder cannot raise their
-- own cap.
create policy "builder_ai_allowances_manage_staff" on builder_ai_allowances
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- Append-only ledger of manually-granted top-ups -- balance is always
-- computed as sum(amount_usd), never a stored mutable balance, same
-- audit-trail posture as builder_progress_updates' status-flip-not-delete
-- (nothing here is ever updated or deleted, only inserted).
create table builder_credit_grants (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid not null references profiles(id) on delete cascade,
  amount_usd numeric not null check (amount_usd > 0),
  reason text not null,
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index builder_credit_grants_builder_id_idx on builder_credit_grants(builder_id);

alter table builder_credit_grants enable row level security;

create policy "builder_credit_grants_select_own_or_operator" on builder_credit_grants
  for select using (builder_id = auth.uid() or is_curator_or_admin(auth.uid()));

create policy "builder_credit_grants_insert_staff" on builder_credit_grants
  for insert to authenticated
  with check (granted_by = auth.uid() and is_curator_or_admin(auth.uid()));

-- One active BYOLLM configuration per builder (one row, not a history table
-- -- matches the existing "builder gets exactly one Project" simplicity
-- precedent). base_url is required for provider_type='openai_compatible'
-- (this is also how a local server like Ollama/LM Studio/vLLM is
-- configured -- OpenAICompatibleProvider already exists and already names
-- these as a future case). encrypted_api_key is nullable -- a local server
-- may need no key at all.
create table builder_llm_credentials (
  builder_id uuid primary key references profiles(id) on delete cascade,
  provider_type text not null check (provider_type in ('openai', 'gemini', 'groq', 'openai_compatible')),
  base_url text,
  model_id text not null,
  encrypted_api_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builder_llm_credentials_base_url_required_for_compatible
    check (provider_type != 'openai_compatible' or base_url is not null)
);

create trigger builder_llm_credentials_set_updated_at before update on builder_llm_credentials
  for each row execute function set_updated_at();

alter table builder_llm_credentials enable row level security;

-- A builder managing only their own row reading back their own ciphertext is
-- not a leak: it's their own key, encrypted with a server-only key
-- (BUILDER_CREDENTIAL_ENCRYPTION_KEY) they never have access to, so the
-- stored ciphertext is useless to them even if read back -- the real trust
-- boundary is the encryption key, not this row. This keeps the policy as
-- simple as builder_progress_updates' own shape instead of splitting into a
-- second service-role-only secrets table for no real security gain.
create policy "builder_llm_credentials_select_own_or_operator" on builder_llm_credentials
  for select using (builder_id = auth.uid() or is_curator_or_admin(auth.uid()));

create policy "builder_llm_credentials_manage_own_or_staff" on builder_llm_credentials
  for all
  using (builder_id = auth.uid() or is_curator_or_admin(auth.uid()))
  with check (builder_id = auth.uid() or is_curator_or_admin(auth.uid()));
