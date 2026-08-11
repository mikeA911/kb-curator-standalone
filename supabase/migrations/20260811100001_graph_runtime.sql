-- Milestone 4: Controlled Graph Runtime. First graph-based execution
-- primitive -- STATE + NODES + EDGES + CONDITIONAL TRANSITIONS +
-- TERMINATION + TRACE, extending the M3 single-pass retrieve->generate->
-- score pipeline into a bounded retry loop. The graph controls execution
-- (deterministic transitions); the LLM only controls content generation and
-- query rewriting inside nodes -- this is NOT the Agent milestone (M5): no
-- tool-calling, no arbitrary autonomy. ai_models.supports_tools stays
-- unread by this migration's runtime.
--
-- Governing layout: graphs (stable identity) -> graph_versions (immutable
-- config snapshot) -> graph_runs (one execution) -> graph_steps (one row
-- per executed node -- the actual trace). The executable graph wiring lives
-- in TypeScript (src/lib/graph/); graph_versions.definition documents what
-- ran, it is never reconstructed from jsonb at runtime.

create table graphs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  graph_type text not null check (graph_type in ('rag_retry')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  -- Nullable = platform-global, same convention as knowledge_bases/eval_datasets.
  project_id uuid references projects(id) on delete cascade,
  -- Set via UPDATE (by the same manage policies below) when a version is
  -- activated -- this is the single source of truth for "what's active",
  -- which is what lets graph_versions stay strictly insert-only.
  active_version_id uuid,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger graphs_set_updated_at before update on graphs
  for each row execute function set_updated_at();

create table graph_versions (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references graphs(id) on delete cascade,
  version_number integer not null,
  definition jsonb not null,
  instructions_version text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Set at insert time if the version is created already-active; a version
  -- later activated via graphs.active_version_id keeps this null -- it's
  -- informational, graphs.active_version_id is authoritative.
  activated_at timestamptz,
  unique (graph_id, version_number)
);

alter table graphs add constraint graphs_active_version_id_fkey
  foreign key (active_version_id) references graph_versions(id) on delete set null;

create table graph_runs (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references graphs(id) on delete cascade,
  graph_version_id uuid not null references graph_versions(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  eval_run_id uuid references eval_runs(id) on delete set null,
  eval_case_id uuid references eval_cases(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'terminated')),
  initial_input jsonb not null,
  final_output jsonb,
  iteration_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  -- Reasoning-retry (insufficient answer -> diagnose -> rewrite) and
  -- infrastructure-retry (429/timeout/network) are distinct concepts -- a
  -- thrown AIProviderError terminates the run immediately via error_code/
  -- error_message and never reaches diagnose. termination_reason (below)
  -- always records why the run stopped, success or not.
  termination_reason text check (termination_reason is null or termination_reason in (
    'success', 'unscored', 'max_iterations', 'non_retryable_failure', 'provider_error', 'invalid_configuration', 'manual_termination'
  )),
  error_code text,
  error_message text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists graph_runs_graph_id_idx on graph_runs(graph_id);
create index if not exists graph_runs_eval_run_id_idx on graph_runs(eval_run_id);
create index if not exists graph_runs_eval_case_id_idx on graph_runs(eval_case_id);

create table graph_steps (
  id uuid primary key default gen_random_uuid(),
  graph_run_id uuid not null references graph_runs(id) on delete cascade,
  sequence_number integer not null,
  node_name text not null check (node_name in ('retrieve', 'generate', 'evaluate', 'diagnose', 'rewrite_query')),
  iteration integer not null,
  input_snapshot jsonb,
  output_snapshot jsonb,
  transition_to text,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  latency_ms integer,
  ai_operation_log_id uuid,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (graph_run_id, sequence_number)
);

create index if not exists graph_steps_graph_run_id_idx on graph_steps(graph_run_id);

-- Link AI operations (embed/generate/judge/rewrite) back to the graph
-- run/step that triggered them, mirroring exactly how eval_run_id/
-- eval_case_id were added to this same table in
-- 20260809110002_eval_runs_and_results.sql.
alter table ai_operation_logs add column if not exists graph_run_id uuid references graph_runs(id) on delete set null;
alter table ai_operation_logs add column if not exists graph_step_id uuid references graph_steps(id) on delete set null;
create index if not exists ai_operation_logs_graph_run_id_idx on ai_operation_logs(graph_run_id);

alter table graph_steps add constraint graph_steps_ai_operation_log_id_fkey
  foreign key (ai_operation_log_id) references ai_operation_logs(id) on delete set null;

-- eval_results gets a nullable link to the graph run that produced it (when
-- the eval run's execution mode was 'graph', null for single-pass), plus
-- iteration_count so the run-comparison summary can show it -- the design
-- brief explicitly asks for "iterations" as one of the compared metrics
-- alongside Hit@K/Recall@K/generation/grounding/outcome/latency/tokens/cost,
-- and neither eval_results nor the existing summary had anywhere to carry
-- it.
alter table eval_results add column if not exists graph_run_id uuid references graph_runs(id) on delete set null;
alter table eval_results add column if not exists iteration_count integer;
create index if not exists eval_results_graph_run_id_idx on eval_results(graph_run_id);

-- RLS -----------------------------------------------------------------------
alter table graphs enable row level security;
alter table graph_versions enable row level security;
alter table graph_runs enable row level security;
alter table graph_steps enable row level security;

-- graphs / graph_versions: same two-tier split knowledge_bases already uses
-- for its nullable project_id (kb_select_global_or_member /
-- kb_manage_project_curator, 20260810120001_project_members.sql) -- except
-- "manage" here is owner-only for project-scoped graphs, matching the
-- design brief's explicit "Only admin/project owner ... should change
-- active configurations."
create policy "graphs_select_global_or_member" on graphs
  for select using (project_id is null or is_project_member(project_id, auth.uid()));

create policy "graphs_manage_staff" on graphs
  for all using (project_id is null and is_curator_or_admin(auth.uid()))
  with check (project_id is null and is_curator_or_admin(auth.uid()));

create policy "graphs_manage_project_owner" on graphs
  for all using (project_id is not null and can_manage_project(project_id, auth.uid()))
  with check (project_id is not null and can_manage_project(project_id, auth.uid()));

-- graph_versions: select follows the parent graph's visibility. Insert-only
-- -- deliberately NO update policy at all, same enforcement mechanism as
-- wiki_versions (the absence of an UPDATE policy is what makes a version's
-- definition immutable once created; activation is a graphs.active_version_id
-- UPDATE instead, never a graph_versions row edit).
create policy "graph_versions_select_global_or_member" on graph_versions
  for select using (
    exists (
      select 1 from graphs g where g.id = graph_versions.graph_id
      and (g.project_id is null or is_project_member(g.project_id, auth.uid()))
    )
  );

create policy "graph_versions_insert_staff" on graph_versions
  for insert with check (
    exists (select 1 from graphs g where g.id = graph_versions.graph_id and g.project_id is null and is_curator_or_admin(auth.uid()))
  );

create policy "graph_versions_insert_project_owner" on graph_versions
  for insert with check (
    exists (select 1 from graphs g where g.id = graph_versions.graph_id and g.project_id is not null and can_manage_project(g.project_id, auth.uid()))
  );

-- graph_runs / graph_steps: mirrors eval_runs' exact select/insert shape
-- (staff unscoped + consultant project-or-global-active) -- these are
-- execution-trace rows created by the same code path that's already
-- authorized to run the eval (requireRole('consultant') + eval_runs RLS),
-- so the bar here matches eval_runs_select_staff / eval_runs_insert_active_consultant
-- rather than inventing a new authorization tier.
create policy "graph_runs_select_staff" on graph_runs
  for select using (is_curator_or_admin(auth.uid()));

create policy "graph_runs_select_consultant" on graph_runs
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
    and (project_id is null or is_project_member(project_id, auth.uid()))
  );

create policy "graph_runs_insert_staff" on graph_runs
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "graph_runs_insert_consultant" on graph_runs
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
    and (project_id is null or can_run_project_evals(project_id, auth.uid()))
  );

create policy "graph_steps_select_staff" on graph_steps
  for select using (is_curator_or_admin(auth.uid()));

create policy "graph_steps_select_consultant" on graph_steps
  for select using (
    exists (
      select 1 from graph_runs r
      join profiles p on p.id = auth.uid() and p.role = 'consultant' and p.is_active
      where r.id = graph_steps.graph_run_id
      and (r.project_id is null or is_project_member(r.project_id, auth.uid()))
    )
  );

create policy "graph_steps_insert_staff" on graph_steps
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "graph_steps_insert_consultant" on graph_steps
  for insert with check (
    exists (
      select 1 from graph_runs r
      join profiles p on p.id = auth.uid() and p.role = 'consultant' and p.is_active
      where r.id = graph_steps.graph_run_id
      and (r.project_id is null or can_run_project_evals(r.project_id, auth.uid()))
    )
  );

-- Seed: the RAG Retry graph, platform-global, active, with its v1 config
-- snapshot -- maxIterations=2 per the design brief's default, thresholds
-- deliberately modest so the graph actually exercises its retry path on the
-- first real experiment rather than accepting everything on try 1.
insert into graphs (name, slug, description, graph_type, status, project_id)
values (
  'RAG Retry',
  'rag-retry',
  'Improves grounded answer quality when the initial retrieval/generation attempt fails evaluation: retrieve -> generate -> evaluate -> (accept -> end | retry: diagnose -> rewrite_query -> retrieve), bounded by max iterations.',
  'rag_retry',
  'active',
  null
);

insert into graph_versions (graph_id, version_number, definition, activated_at)
select
  id,
  1,
  jsonb_build_object(
    'nodes', jsonb_build_array('retrieve', 'generate', 'evaluate', 'diagnose', 'rewrite_query'),
    'edges', jsonb_build_array(
      jsonb_build_object('from', 'start', 'to', 'retrieve'),
      jsonb_build_object('from', 'retrieve', 'to', 'generate'),
      jsonb_build_object('from', 'generate', 'to', 'evaluate'),
      jsonb_build_object('from', 'diagnose', 'to', 'rewrite_query'),
      jsonb_build_object('from', 'rewrite_query', 'to', 'retrieve')
    ),
    'conditionalEdges', jsonb_build_array(
      jsonb_build_object('from', 'evaluate', 'condition', 'shouldContinue', 'accept', 'end', 'retry', 'diagnose')
    ),
    'maxIterations', 2,
    'acceptanceThresholds', jsonb_build_object(
      'requiredOutcomeScore', 0.7,
      'requiredGroundingScore', 0.7,
      'requireExpectedEvidence', false
    )
  ),
  now()
from graphs where slug = 'rag-retry';

update graphs set active_version_id = (
  select id from graph_versions where graph_id = graphs.id and version_number = 1
) where slug = 'rag-retry';
