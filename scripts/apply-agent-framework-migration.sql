-- ==== supabase/migrations/20260811100003_agent_framework.sql ====
-- Milestone 5A (foundation slice) + 5B: Agent Templates + RAG Answer Agent.
-- Adds the semantic layer M4 deliberately left out -- an Agent is a
-- governed configuration (Purpose + Instructions + Models + Sources + Graph
-- + Guardrails + Termination + Evaluation), never merged with a graph:
-- agents -> agent_versions (immutable) reference a graph_versions row and
-- EXECUTE THROUGH the existing M4 execution spine (graph_runs/graph_steps)
-- rather than a parallel agent_runs table -- see graph_runs.agent_id/
-- agent_version_id below, added exactly how eval_run_id/eval_case_id were
-- added in 20260811100001_graph_runtime.sql.
--
-- Agents are created FROM a template (agent_templates), not hand-authored
-- independently -- this is the M5A foundation slice: just enough schema to
-- prove "create a custom Agent from an Agent Template" honestly for one
-- concrete Agent (RAG Answer), without the amendment's full repo-scope/
-- knowledge-multi-select/OpenAPI+MCP-target wizard, which has nothing to
-- attach to yet (that arrives with the first Engineering-family template in
-- a later milestone).
--
-- Revised scope per the user's M5 re-plan: M5A Agent Templates + Custom
-- Agents (this migration, foundation slice), M5B RAG Answer Agent (this
-- migration's seed, no arbitrary tools), M5C Guardrail Templates, M5D
-- External Engineering Workbench Integration. No tool-calling/authorization
-- framework in this migration -- deferred until a concrete milestone
-- actually needs to execute a tool.

-- agent_templates -----------------------------------------------------------
-- A reusable pattern -- ordinary MUTABLE table, unlike agent_versions. A
-- template has no runs of its own; it only supplies defaults at Agent
-- *creation* time. "Template changes do not silently mutate existing Agent
-- versions" is satisfied structurally by copying these defaults into an
-- agent_versions row at creation (src/lib/agent/create.ts), not by making
-- the template itself immutable -- so ordinary staff-managed UPDATE is fine
-- here, and is exercised (not just declared) by the RLS test.
create table agent_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  agent_type text not null check (agent_type in ('knowledge', 'research', 'evaluation', 'engineering', 'governance', 'learning')),
  -- A specific immutable graph_versions snapshot, not graphs.active_version_id
  -- -- a template's recommended graph never silently drifts underneath
  -- agents already created from it.
  default_graph_version_id uuid not null references graph_versions(id),
  -- Not in the amendment's literal field list, but essential: a template
  -- with nothing to prefill defeats the point of "create from template".
  default_purpose text not null,
  default_instructions text not null,
  default_source_policy jsonb not null default '{}'::jsonb,
  default_tool_policy jsonb not null default '{}'::jsonb,
  default_guardrails jsonb not null default '{}'::jsonb,
  default_termination_policy jsonb not null default '{}'::jsonb,
  -- A recommended starting model, overridable at creation time -- nullable
  -- because a future template family may not want to prescribe one.
  default_generation_provider_id uuid references ai_providers(id),
  default_generation_model_id uuid references ai_models(id),
  default_embedding_provider_id uuid references ai_providers(id),
  default_embedding_model_id uuid references ai_models(id),
  default_evaluator_provider_id uuid references ai_providers(id),
  default_evaluator_model_id uuid references ai_models(id),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger agent_templates_set_updated_at before update on agent_templates
  for each row execute function set_updated_at();

-- agents ----------------------------------------------------------------
create table agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  -- Agent Family taxonomy -- not RAG-specific, so the architecture doesn't
  -- stay tied to one use case as later families (engineering/governance/...)
  -- get real implementations.
  agent_type text not null check (agent_type in ('knowledge', 'research', 'evaluation', 'engineering', 'governance', 'learning')),
  -- Nullable -- "do not require every agent to have a template" (amendment,
  -- explicit). Set when the Agent was created via createAgentFromTemplate.
  template_id uuid references agent_templates(id) on delete set null,
  -- Nullable = platform-global, same convention as graphs/knowledge_bases.
  project_id uuid references projects(id) on delete cascade,
  -- Set via UPDATE (by the same manage policies below) when a version is
  -- activated -- single source of truth, same mechanism as graphs.
  active_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger agents_set_updated_at before update on agents
  for each row execute function set_updated_at();

-- agent_versions ----------------------------------------------------------
-- Immutable once created -- deliberately NO update policy at all below,
-- same enforcement mechanism as graph_versions/wiki_versions. A changed
-- purpose/instructions/models/policy always means a new Agent version. This
-- is where a template's defaults land, copied at creation time.
create table agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  version_number integer not null,
  purpose text not null,
  instructions text not null,
  graph_version_id uuid not null references graph_versions(id),
  -- Real FK columns, not folded into jsonb -- matches how EvalRunConfig
  -- always keeps generation/embedding/evaluator as three parallel typed
  -- model slots rather than an opaque bag.
  generation_provider_id uuid not null references ai_providers(id),
  generation_model_id uuid not null references ai_models(id),
  embedding_provider_id uuid not null references ai_providers(id),
  embedding_model_id uuid not null references ai_models(id),
  evaluator_provider_id uuid references ai_providers(id),
  evaluator_model_id uuid references ai_models(id),
  -- { evidenceSource: 'chunks'|'wiki'|'both', topK: number, threshold?: number }
  source_policy jsonb not null default '{}'::jsonb,
  tool_policy jsonb not null default '{}'::jsonb,
  -- { noUnsupportedClaims, projectKnowledgeBoundary, maxRetries } --
  -- documents what the underlying graph's own acceptance thresholds already
  -- enforce; this migration adds no new enforcement layer on top of the M4
  -- graph's shouldContinue(). Real runtime-enforced guardrail policy is
  -- M5C's scope.
  guardrails jsonb not null default '{}'::jsonb,
  -- { maxIterations, successTerminationReasons } -- mirrors the referenced
  -- graph version's own maxIterations so a historical Agent version stays
  -- self-describing without joining graph_versions.
  termination_policy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Informational only, same convention as graph_versions.activated_at --
  -- agents.active_version_id is authoritative.
  activated_at timestamptz,
  unique (agent_id, version_number)
);

alter table agents add constraint agents_active_version_id_fkey
  foreign key (active_version_id) references agent_versions(id) on delete set null;

-- Extend graph_runs (M4's execution spine) rather than build a parallel
-- agent_runs table -- exactly mirrors how eval_run_id/eval_case_id were
-- added in 20260811100001_graph_runtime.sql.
alter table graph_runs add column if not exists agent_id uuid references agents(id) on delete set null;
alter table graph_runs add column if not exists agent_version_id uuid references agent_versions(id) on delete set null;
create index if not exists graph_runs_agent_id_idx on graph_runs(agent_id);
create index if not exists graph_runs_agent_version_id_idx on graph_runs(agent_version_id);

-- RLS -----------------------------------------------------------------------
alter table agent_templates enable row level security;
alter table agents enable row level security;
alter table agent_versions enable row level security;

-- agent_templates: platform-global registry (no project scoping -- a
-- template is a reusable pattern, not a project artifact). Any
-- authenticated, active, non-anonymous session may see what templates exist
-- (needed to choose one when creating an Agent, same bar as ai_providers/
-- ai_models); only staff manage the catalog.
create policy "agent_templates_select_staff_or_consultant" on agent_templates
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "agent_templates_manage_staff" on agent_templates
  for all using (is_curator_or_admin(auth.uid()))
  with check (is_curator_or_admin(auth.uid()));

-- agents / agent_versions: identical two-tier shape to graphs/graph_versions
-- (20260811100001) -- manage is OWNER-gated (can_manage_project), not
-- curator-gated, for project-scoped Agents.
create policy "agents_select_global_or_member" on agents
  for select using (project_id is null or is_project_member(project_id, auth.uid()));

create policy "agents_manage_staff" on agents
  for all using (project_id is null and is_curator_or_admin(auth.uid()))
  with check (project_id is null and is_curator_or_admin(auth.uid()));

create policy "agents_manage_project_owner" on agents
  for all using (project_id is not null and can_manage_project(project_id, auth.uid()))
  with check (project_id is not null and can_manage_project(project_id, auth.uid()));

create policy "agent_versions_select_global_or_member" on agent_versions
  for select using (
    exists (
      select 1 from agents a where a.id = agent_versions.agent_id
      and (a.project_id is null or is_project_member(a.project_id, auth.uid()))
    )
  );

create policy "agent_versions_insert_staff" on agent_versions
  for insert with check (
    exists (select 1 from agents a where a.id = agent_versions.agent_id and a.project_id is null and is_curator_or_admin(auth.uid()))
  );

create policy "agent_versions_insert_project_owner" on agent_versions
  for insert with check (
    exists (select 1 from agents a where a.id = agent_versions.agent_id and a.project_id is not null and can_manage_project(a.project_id, auth.uid()))
  );
-- Deliberately NO update policy on agent_versions -- immutability, same
-- mechanism as graph_versions/wiki_versions.

-- Seed: "RAG Answer" template ------------------------------------------------
insert into agent_templates (
  name, slug, description, agent_type, default_graph_version_id,
  default_purpose, default_instructions,
  default_source_policy, default_guardrails, default_termination_policy,
  default_generation_provider_id, default_generation_model_id,
  default_embedding_provider_id, default_embedding_model_id,
  default_evaluator_provider_id, default_evaluator_model_id
)
select
  'RAG Answer',
  'rag-answer',
  'Grounded question-answering over permitted KB Sandbox knowledge, maximizing traceability. Wraps the RAG Retry graph; no arbitrary tools.',
  'knowledge',
  gv.id,
  'Answer questions using permitted KB Sandbox knowledge while maximizing grounding and traceability.',
  'Answer the user''s question using only the retrieved evidence. Cite which evidence supports each claim. If the evidence does not support an answer, say so explicitly rather than guessing. Never claim knowledge outside approved project or global sources.',
  jsonb_build_object('evidenceSource', 'both', 'topK', 5),
  jsonb_build_object('noUnsupportedClaims', true, 'projectKnowledgeBoundary', true, 'maxRetries', 2),
  jsonb_build_object('maxIterations', 2, 'successTerminationReasons', jsonb_build_array('success', 'unscored')),
  gen_provider.id, gen_model.id,
  embed_provider.id, embed_model.id,
  eval_provider.id, eval_model.id
from graphs g
join graph_versions gv on gv.graph_id = g.id and gv.id = g.active_version_id
join ai_providers gen_provider on gen_provider.name = 'groq'
join ai_models gen_model on gen_model.provider_id = gen_provider.id and gen_model.model_id = 'openai/gpt-oss-20b'
join ai_providers embed_provider on embed_provider.name = 'gemini'
join ai_models embed_model on embed_model.provider_id = embed_provider.id and embed_model.model_id = 'gemini-embedding-001'
join ai_providers eval_provider on eval_provider.name = 'groq'
join ai_models eval_model on eval_model.provider_id = eval_provider.id and eval_model.model_id = 'openai/gpt-oss-20b'
where g.slug = 'rag-retry';

-- Seed: RAG Answer Agent, created FROM the template above -------------------
-- Wraps the existing RAG Retry graph as-is (no new graph_type, no new
-- nodes). Not hand-authored independently -- template_id is set, and the v1
-- agent_versions row below copies the template's defaults verbatim, exactly
-- what src/lib/agent/create.ts's createAgentFromTemplate does at runtime
-- for any future Agent created through the /agents/new UI.
insert into agents (name, slug, description, agent_type, template_id, project_id, status)
select
  'RAG Answer Agent',
  'rag-answer-agent',
  'Answers questions using permitted KB Sandbox knowledge while maximizing grounding and traceability. The first working formal Agent: a named, versioned wrapper around the RAG Retry graph, created from the RAG Answer template, no arbitrary tools.',
  'knowledge',
  t.id,
  null,
  'active'
from agent_templates t where t.slug = 'rag-answer';

insert into agent_versions (
  agent_id, version_number, purpose, instructions, graph_version_id,
  generation_provider_id, generation_model_id,
  embedding_provider_id, embedding_model_id,
  evaluator_provider_id, evaluator_model_id,
  source_policy, guardrails, termination_policy, metadata,
  activated_at
)
select
  a.id,
  1,
  t.default_purpose,
  t.default_instructions,
  t.default_graph_version_id,
  t.default_generation_provider_id, t.default_generation_model_id,
  t.default_embedding_provider_id, t.default_embedding_model_id,
  t.default_evaluator_provider_id, t.default_evaluator_model_id,
  t.default_source_policy, t.default_guardrails, t.default_termination_policy,
  jsonb_build_object('family', 'knowledge', 'createdFromTemplate', t.slug),
  now()
from agents a
join agent_templates t on t.id = a.template_id
where a.slug = 'rag-answer-agent';

update agents set active_version_id = (
  select id from agent_versions where agent_id = agents.id and version_number = 1
) where slug = 'rag-answer-agent';
