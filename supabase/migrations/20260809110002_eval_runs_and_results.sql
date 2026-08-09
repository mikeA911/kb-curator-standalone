-- eval_runs: execution of a dataset against one specific, fully-snapshotted
-- configuration. `config` is captured at launch time so a historical run
-- stays interpretable even after `settings` (the global active AI provider)
-- or the dataset itself later change. Shape:
--   {
--     generation: { provider, model },
--     embedding:  { provider, model, dimensions },
--     retrieval:  { evidence_source: 'chunks'|'wiki'|'both', top_k, threshold },
--     evaluator:  { type: 'none'|'llm_judge', provider?, model? }
--   }
create table if not exists eval_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references eval_datasets(id) on delete cascade,
  dataset_version integer not null,
  name text,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  config jsonb not null,
  is_baseline boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists eval_runs_dataset_id_idx on eval_runs(dataset_id);
create index if not exists eval_runs_status_idx on eval_runs(status);

-- eval_results: one case result within a run. Every metric is nullable --
-- scoring is expected to evolve, and a case that failed outright (provider
-- error, etc.) still gets a row with status='failed' + structured `error`,
-- rather than silently having no result at all.
--
-- human_* columns are deliberately separate from the automated score
-- columns above them: a human review never overwrites the automated
-- evaluation, it's recorded alongside it (see the brief's "preserve both").
create table if not exists eval_results (
  id uuid primary key default gen_random_uuid(),
  eval_run_id uuid not null references eval_runs(id) on delete cascade,
  eval_case_id uuid not null references eval_cases(id) on delete cascade,

  status text not null default 'completed' check (status in ('completed', 'failed')),
  error jsonb, -- {stage, code, message, occurred_at} -- see src/lib/eval/failures.ts

  generated_answer text,
  retrieved_evidence jsonb, -- [{type:'chunk'|'wiki', id, rank, similarity, title}]

  retrieval_hit boolean,
  retrieval_recall numeric,
  retrieval_mrr numeric,

  generation_score numeric,
  grounding_score numeric,
  outcome_score numeric,
  overall_score numeric,

  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric,

  evaluator_details jsonb, -- {provider, model, reasoning, missing_concepts, unsupported_claims}
  failure_classification text check (failure_classification is null or failure_classification in (
    'knowledge_failure', 'retrieval_failure', 'reasoning_failure', 'workflow_failure',
    'tool_failure', 'behavior_failure', 'rule_failure', 'unknown'
  )),

  human_reviewed_by uuid references profiles(id) on delete set null,
  human_reviewed_at timestamptz,
  human_accepted boolean,
  human_generation_score numeric,
  human_grounding_score numeric,
  human_outcome_score numeric,
  human_failure_classification text check (human_failure_classification is null or human_failure_classification in (
    'knowledge_failure', 'retrieval_failure', 'reasoning_failure', 'workflow_failure',
    'tool_failure', 'behavior_failure', 'rule_failure', 'unknown'
  )),
  human_notes text,

  created_at timestamptz not null default now(),

  unique (eval_run_id, eval_case_id)
);

create index if not exists eval_results_run_id_idx on eval_results(eval_run_id);
create index if not exists eval_results_case_id_idx on eval_results(eval_case_id);

-- Link AI operations (embed/generate/judge) back to the eval run/case they
-- happened for, without building the future full Runs/Tracing subsystem.
alter table ai_operation_logs add column if not exists eval_run_id uuid references eval_runs(id) on delete set null;
alter table ai_operation_logs add column if not exists eval_case_id uuid references eval_cases(id) on delete set null;
create index if not exists ai_operation_logs_eval_run_id_idx on ai_operation_logs(eval_run_id);
