-- Provider/model registry, replacing the old single settings.ai_provider
-- key. Providers and models are now admin-managed rows rather than a
-- hard-coded TS union -- this is what lets a cheap/free provider (Groq) or a
-- future local/enterprise OpenAI-compatible gateway be added without
-- touching application code.
create table ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  provider_type text not null check (provider_type in ('openai', 'gemini', 'groq', 'openai_compatible')),
  display_name text not null,
  base_url text,
  -- The env var NAME, never the secret value itself -- see the RLS/action
  -- layer, which only ever reports Configured/Missing by checking
  -- process.env[api_key_env_var] server-side.
  api_key_env_var text not null,
  enabled boolean not null default true,
  supports_model_discovery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ai_providers_set_updated_at on ai_providers;
create trigger ai_providers_set_updated_at before update on ai_providers
  for each row execute function set_updated_at();

create table ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references ai_providers(id) on delete cascade,
  model_id text not null,
  display_name text not null,
  model_type text not null check (model_type in ('generation', 'embedding', 'speech', 'multimodal')),
  enabled boolean not null default true,
  is_default boolean not null default false,
  context_window integer,
  max_output_tokens integer,
  input_cost_per_million numeric,
  output_cost_per_million numeric,
  embedding_dimensions integer,
  supports_structured_output boolean not null default false,
  supports_tools boolean not null default false,
  supports_reasoning boolean not null default false,
  supports_vision boolean not null default false,
  supports_embeddings boolean not null default false,
  status text not null default 'active' check (status in ('active', 'deprecated', 'disabled', 'unavailable')),
  deprecation_date date,
  replacement_model_id uuid references ai_models(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, model_id)
);

drop trigger if exists ai_models_set_updated_at on ai_models;
create trigger ai_models_set_updated_at before update on ai_models
  for each row execute function set_updated_at();

-- At most one default per model_type across the whole registry (a partial
-- unique index, not a boolean pair) -- "the default generation model" and
-- "the default embedding model" fall out naturally from model_type without
-- a separate is_default_generation/is_default_embedding column pair.
create unique index ai_models_one_default_per_type on ai_models(model_type) where is_default;

-- RLS -------------------------------------------------------------------------
-- Any authenticated, active, non-anonymous session can read enabled
-- providers/models (curators and consultants both need to *choose* a model
-- in the Eval UI); only admin can register or change providers/models --
-- "Model/provider configuration is admin-only" per the brief.
alter table ai_providers enable row level security;

create policy "ai_providers_select_staff_or_consultant" on ai_providers
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "ai_providers_admin_manage" on ai_providers
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

alter table ai_models enable row level security;

create policy "ai_models_select_staff_or_consultant" on ai_models
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "ai_models_admin_manage" on ai_models
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
