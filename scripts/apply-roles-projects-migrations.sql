-- ==== supabase/migrations/20260810100001_role_consultant_anonymous.sql ====
-- Renames the 'user' role to 'consultant' (matching the UI/Roles brief's own
-- language -- "user may function as CONSULTANT" becomes literal) and adds a
-- new 'anonymous' role for unauthenticated visitors (real Supabase anonymous
-- auth sessions, wired up separately). Only two places in the schema ever
-- referenced the literal 'user' string -- the check constraint below and the
-- self-insert RLS policy in 20260808190010_rls_policies.sql -- both updated
-- together here.

-- Drop the constraint entirely before the backfill: the old constraint
-- rejects 'consultant', and adding the new constraint before the backfill
-- would immediately reject the still-present 'user' rows (Postgres validates
-- existing rows against a new CHECK constraint at ADD time). So: drop, then
-- backfill data, then add the new constraint once every row already
-- satisfies it.
alter table profiles drop constraint profiles_role_check;

update profiles set role = 'consultant' where role = 'user';

alter table profiles add constraint profiles_role_check
  check (role in ('anonymous', 'consultant', 'curator', 'admin'));
alter table profiles alter column role set default 'consultant';

-- Anonymous auth.users rows have no email; nullable so ensureProfile() can
-- insert an anonymous profile without a placeholder value.
alter table profiles alter column email drop not null;

-- Replace the single self-insert policy with two, split on whether the
-- session is a real Supabase anonymous session (auth.users.is_anonymous) --
-- this is what actually prevents an anonymous session from self-inserting as
-- 'consultant' (privilege escalation blocked at the RLS layer, not just in
-- application code).
drop policy "profiles_insert_self" on profiles;

create policy "profiles_insert_self_consultant" on profiles
  for insert with check (
    auth.uid() = id and role = 'consultant' and is_active = true
    and not exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous)
  );

create policy "profiles_insert_self_anonymous" on profiles
  for insert with check (
    auth.uid() = id and role = 'anonymous' and is_active = true
    and exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous)
  );


-- ==== supabase/migrations/20260810100002_projects.sql ====
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


-- ==== supabase/migrations/20260810100003_projects_fks_and_rls.sql ====
-- Nullable project_id links from existing entities -- direct FK rather than
-- a join table, per the brief's "choose the simplest clean architecture"
-- guidance (project_knowledge_bases/project_eval_datasets join tables would
-- only earn their keep once a KB or dataset needs to belong to more than one
-- project, which isn't a requirement yet).
alter table knowledge_bases add column if not exists project_id uuid references projects(id) on delete set null;
alter table eval_datasets add column if not exists project_id uuid references projects(id) on delete set null;

-- projects RLS ----------------------------------------------------------------
-- No project-membership model yet (owner/curator/consultant/viewer *within* a
-- project) -- deferred per the brief's explicit allowance until justified by
-- real multi-project use. For now: any non-anonymous staff/consultant can see
-- every project (mirrors how documents/knowledge_bases aren't per-user siloed
-- elsewhere in this app either); only the owner or curator/admin can update;
-- anonymous sessions get no access at all.
alter table projects enable row level security;

create policy "projects_select_staff_or_consultant" on projects
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "projects_insert_self" on projects
  for insert with check (
    owner_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "projects_update_owner_or_staff" on projects
  for update using (owner_id = auth.uid() or is_curator_or_admin(auth.uid()))
  with check (owner_id = auth.uid() or is_curator_or_admin(auth.uid()));


-- ==== supabase/migrations/20260810100004_eval_consultant_access.sql ====
-- Additive consultant access to Evals, per the UI/Roles brief's permission
-- matrix: consultants may view active benchmarks, run evaluations against
-- them, and view results -- but never author/edit cases, activate/archive
-- datasets, or mark baselines (those stay curator/admin, unchanged in
-- 20260809110004_eval_rls.sql). Every policy here is scoped to datasets with
-- status = 'active' -- a consultant can never see or run against a draft
-- benchmark still being authored. Anonymous sessions get nothing (not
-- referenced by any of these policies).

create policy "eval_datasets_select_active_consultant" on eval_datasets
  for select using (
    status = 'active'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_cases_select_active_consultant" on eval_cases
  for select using (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_runs_select_active_consultant" on eval_runs
  for select using (
    exists (select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_runs_insert_active_consultant" on eval_runs
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_results_select_active_consultant" on eval_results
  for select using (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_results_insert_active_consultant" on eval_results
  for insert with check (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );


-- ==== supabase/migrations/20260810100005_eval_runs_update_consultant.sql ====
-- Missed in 20260810100004: executeEvalRun's own status transitions
-- (pending -> running -> completed/failed) run as UPDATE statements using the
-- caller's session -- when the caller is a consultant, those updates were
-- silently blocked by RLS (no matching UPDATE policy on eval_runs), leaving
-- every consultant-run evaluation permanently stuck at status='pending' even
-- though its results were inserted successfully (confirmed live: a
-- consultant test run showed real scores in the UI but status never left
-- 'pending'). Scoped to the consultant's own run (created_by = auth.uid()),
-- matching the ownership check already used by
-- eval_runs_insert_active_consultant.
create policy "eval_runs_update_own_consultant" on eval_runs
  for update using (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  )
  with check (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );


-- ==== supabase/migrations/20260810100006_consultant_vector_read_access.sql ====
-- Second half of the same bug class as 20260810100005: match_documents and
-- match_wiki_vectors are plain `language sql stable` functions (not
-- SECURITY DEFINER), so they run under RLS with the *caller's* permissions.
-- kb_vectors and wiki_vectors were both curator/admin-only, so a consultant
-- running an eval got zero evidence back from either RPC no matter the
-- retrieval config -- confirmed live: a consultant-run "wiki only"
-- evaluation showed 0% Hit@K on a benchmark that scores ~100% for the same
-- config run as curator/admin, because retrieval silently returned nothing.
--
-- Safe to open up broadly: kb_vectors only ever contains chunks that were
-- already curator-approved (see 20260808190006_kb_vectors.sql's write path),
-- and wiki_vectors only ever contains content embedded at Wiki *approval*
-- time (embedApprovedVersion in src/lib/wiki/review.ts) -- both tables are
-- already "approved knowledge only" by construction, matching the UI/Roles
-- brief's "Consultant: query approved RAG sources, inspect retrieved
-- evidence" capability.
create policy "kb_vectors_select_consultant" on kb_vectors
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "wiki_vectors_select_consultant" on wiki_vectors
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );


