-- ==== supabase/migrations/20260809110001_eval_datasets_and_cases.sql ====
-- eval_datasets: a named, versionable benchmark. `version` is a plain
-- integer snapshot recorded onto eval_runs at run time (see eval_runs.sql);
-- it does not itself branch storage -- "don't silently invalidate historical
-- comparisons" is enforced by freezing eval_cases once status='active'
-- rather than by the version number alone (see the RLS policies).
create table if not exists eval_datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  knowledge_base_id text references knowledge_bases(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists eval_datasets_set_updated_at on eval_datasets;
create trigger eval_datasets_set_updated_at before update on eval_datasets
  for each row execute function set_updated_at();

-- eval_cases: one test. Not every field is required -- a retrieval-only case
-- can omit expected_answer, a structured-output case can omit expected
-- evidence, etc.
create table if not exists eval_cases (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references eval_datasets(id) on delete cascade,
  question text not null,
  expected_answer text,
  expected_concepts text[],
  expected_article_ids uuid[],
  expected_chunk_ids uuid[],
  scoring_criteria text,
  tags text[],
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eval_cases_dataset_id_idx on eval_cases(dataset_id);

drop trigger if exists eval_cases_set_updated_at on eval_cases;
create trigger eval_cases_set_updated_at before update on eval_cases
  for each row execute function set_updated_at();


-- ==== supabase/migrations/20260809110002_eval_runs_and_results.sql ====
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


-- ==== supabase/migrations/20260809110003_match_wiki_vectors.sql ====
-- Vector similarity search over wiki_vectors, mirroring match_documents
-- (kb_vectors). Joined through to wiki_articles and restricted to each
-- article's current_version_id so a pending draft's embedding can never be
-- retrieved during evaluation -- only what's actually approved and live.
create or replace function match_wiki_vectors(
  query_embedding vector(1536),
  match_threshold float default 0,
  match_count int default 10
)
returns table (
  id uuid,
  wiki_version_id uuid,
  wiki_article_id uuid,
  content text,
  similarity float,
  article_slug text,
  article_title text
)
language sql stable as $$
  select
    wv.id,
    wv.wiki_version_id,
    wa.id as wiki_article_id,
    wv.content,
    1 - (wv.embedding <=> query_embedding) as similarity,
    wa.slug as article_slug,
    wa.title as article_title
  from wiki_vectors wv
  join wiki_articles wa on wa.current_version_id = wv.wiki_version_id
  where 1 - (wv.embedding <=> query_embedding) > match_threshold
  order by wv.embedding <=> query_embedding
  limit match_count;
$$;


-- ==== supabase/migrations/20260809110004_eval_rls.sql ====
-- Evaluation RLS. Curator/admin only throughout -- unlike the Wiki, eval
-- datasets/results aren't end-user-facing content, they're an internal QA
-- tool, so there's no "approved -> visible to everyone" tier here.
--
-- The one RLS rule doing real work beyond simple role-gating: eval_cases
-- cannot be inserted/updated/deleted once the parent dataset's status is no
-- longer 'draft'. That's what makes "an active benchmark can't be silently
-- modified" a guarantee instead of a convention -- see the eval_cases
-- policies below.

-- eval_datasets ------------------------------------------------------------
alter table eval_datasets enable row level security;

create policy "eval_datasets_select_staff" on eval_datasets
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_datasets_insert_staff" on eval_datasets
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "eval_datasets_update_staff" on eval_datasets
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- eval_cases ------------------------------------------------------------------
alter table eval_cases enable row level security;

create policy "eval_cases_select_staff" on eval_cases
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_cases_insert_staff_draft_only" on eval_cases
  for insert with check (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

create policy "eval_cases_update_staff_draft_only" on eval_cases
  for update using (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  ) with check (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

create policy "eval_cases_delete_staff_draft_only" on eval_cases
  for delete using (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

-- eval_runs -----------------------------------------------------------------
alter table eval_runs enable row level security;

create policy "eval_runs_select_staff" on eval_runs
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_runs_insert_staff" on eval_runs
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "eval_runs_update_staff" on eval_runs
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- eval_results ------------------------------------------------------------------
alter table eval_results enable row level security;

create policy "eval_results_select_staff" on eval_results
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_results_insert_staff" on eval_results
  for insert with check (is_curator_or_admin(auth.uid()));

-- Update is allowed (unlike wiki_versions) because eval_results rows are
-- where human review lands (human_* columns) -- that's an intentional
-- in-place update of an existing row, not a rewrite of history the way
-- editing approved Wiki content is.
create policy "eval_results_update_staff" on eval_results
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));


-- ==== supabase/migrations/20260809110005_match_documents_chunk_id.sql ====
-- match_documents originally returned kb_vectors.id only. Evaluation needs to
-- compare retrieved evidence against eval_cases.expected_chunk_ids, which
-- references document_chunks (the unit curators actually reviewed/approved),
-- not the vector row's own id -- so chunk_id is added to the return set.
-- Safe to replace: this function had zero callers before Milestone 3. Adding
-- a return column requires DROP + CREATE, not CREATE OR REPLACE -- Postgres
-- rejects an in-place return-type change (42P13).
drop function if exists match_documents(vector, double precision, integer, text, text[]);

create function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.75,
  match_count int default 10,
  filter_doc_type text default null,
  filter_use_cases text[] default null
)
returns table (
  id uuid,
  chunk_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
language sql stable as $$
  select
    kb_vectors.id,
    kb_vectors.chunk_id,
    kb_vectors.content,
    1 - (kb_vectors.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'topic', kb_vectors.topic,
      'subtopic', kb_vectors.subtopic,
      'doc_type', kb_vectors.doc_type,
      'source_document', kb_vectors.source_document,
      'source_page', kb_vectors.source_page,
      'tags', kb_vectors.tags
    ) as metadata
  from kb_vectors
  where 1 - (kb_vectors.embedding <=> query_embedding) > match_threshold
    and (filter_doc_type is null or kb_vectors.doc_type = filter_doc_type)
    and (filter_use_cases is null or kb_vectors.use_cases && filter_use_cases)
  order by kb_vectors.embedding <=> query_embedding
  limit match_count;
$$;


