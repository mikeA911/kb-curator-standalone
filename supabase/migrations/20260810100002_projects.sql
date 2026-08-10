-- `projects` -- new top-level container per the Project Model brief. Deliberately
-- separate from `knowledge_bases` (a project is broader than a knowledge base;
-- knowledge_bases/eval_datasets link into a project via a nullable FK, added
-- in the next migration, rather than renaming knowledge_bases into projects).
-- `create table if not exists` since this table may already have been created
-- manually against the live project while this migration file was in progress.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_type text not null check (project_type in ('learning', 'experiment', 'consulting', 'transformation', 'knowledge')),
  objective text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  notes text,
  -- Type-specific fields (hypothesis, success_criteria, business_problem, ...)
  -- live here rather than as a wide table of nullable columns -- no template
  -- engine per the brief's explicit scope limit; the UI renders a few fields
  -- based on project_type and reads/writes them into this bag.
  details jsonb not null default '{}',
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();
