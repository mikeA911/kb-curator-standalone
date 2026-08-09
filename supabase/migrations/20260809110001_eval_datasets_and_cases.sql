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
