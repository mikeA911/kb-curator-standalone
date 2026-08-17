-- Workstream System Understanding Assessment. A reusable capability, not
-- specific to OpenAPI/CareCall: a curator-authored, versioned set of
-- standardized questions that every "participant" (an external AI tool/
-- method, or eventually a human) answers after independently examining a
-- system -- testing whether they actually understood it, not just whether
-- they produced plausible-looking artifacts. Deliberately separate from
-- workstream_artifacts (the engineering outputs) and from any future human
-- benchmark/scoring (see design note -- ground truth stays out of the
-- participant-facing assessment).
--
-- Scope for this pass: definition + versioned questions/instructions +
-- manual response entry + question-by-question viewing. No native LLM
-- execution, no automated grading -- see docs/ design note.
--
-- project_id is denormalized onto every table (rather than the one-hop
-- join pattern workstream_artifacts uses) specifically to keep RLS shallow
-- across this 4-table chain (assessment -> version -> question/response ->
-- answer) instead of stacking 3-4 levels of EXISTS.

create table system_assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  -- Soft/optional link to the workstream this assessment originated under.
  -- Not used for access control -- an assessment is a project-wide,
  -- cross-workstream comparison surface (Claude Code and ChatGPT/Codex are
  -- separate *workstreams* in this app's model, but the same assessment).
  workstream_id uuid references project_workstreams(id) on delete set null,
  name text not null,
  description text,
  -- FK added below, after system_assessment_versions exists -- same
  -- circular-reference pattern as wiki_articles.current_version_id /
  -- wiki_versions (20260808220003_wiki_versions.sql).
  current_version_id uuid,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger system_assessments_set_updated_at before update on system_assessments
  for each row execute function set_updated_at();

create index system_assessments_project_id_idx on system_assessments(project_id);

-- Two independently versioned things live here, per the design note:
-- (A) the question set, and (B) the instructions given to a participant on
-- how to answer. Both travel together as one version so a response can
-- always be traced to exactly what was asked and how.
create table system_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references system_assessments(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  version_number integer not null,
  instructions text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  unique (assessment_id, version_number)
);

create index system_assessment_versions_assessment_id_idx on system_assessment_versions(assessment_id);

alter table system_assessments
  add constraint system_assessments_current_version_fk
  foreign key (current_version_id) references system_assessment_versions(id) on delete set null;

create table system_assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references system_assessment_versions(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  sequence integer not null,
  title text not null,
  question text not null,
  category text,
  guidance text,

  unique (assessment_version_id, sequence)
);

create index system_assessment_questions_version_id_idx on system_assessment_questions(assessment_version_id);

-- One response per (assessment version, participant) -- "participant" is
-- descriptive metadata, not a workstream FK: a response like "Claude Code"
-- happens to correspond to a workstream of the same name in this project
-- today, but the assessment/response model doesn't assume that link always
-- holds (a future human-benchmark or a tool with no matching workstream
-- should be representable the same way).
create table assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references system_assessment_versions(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  participant_label text not null,
  external_tool text,
  model text,
  repository_ref text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (assessment_version_id, participant_label)
);

create trigger assessment_responses_set_updated_at before update on assessment_responses
  for each row execute function set_updated_at();

create index assessment_responses_version_id_idx on assessment_responses(assessment_version_id);

-- One row per question per response -- deliberately not one giant Markdown
-- blob, so individual questions stay independently reviewable/scoreable
-- later (see design note section 9). Evidence stays inline free text in
-- this pass rather than a normalized evidence table.
create table assessment_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references assessment_responses(id) on delete cascade,
  question_id uuid not null references system_assessment_questions(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  answer text not null,
  classification text check (classification in ('CONFIRMED', 'INFERRED', 'UNKNOWN')),
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (response_id, question_id)
);

create trigger assessment_answers_set_updated_at before update on assessment_answers
  for each row execute function set_updated_at();

create index assessment_answers_response_id_idx on assessment_answers(response_id);

-- RLS -------------------------------------------------------------------
-- No parallel permission system -- every policy reuses is_project_member /
-- can_curate_project exactly as project_workstreams/workstream_artifacts
-- do. "Immutable once active" (design note section 5) is enforced in the
-- action layer (checking version.status = 'draft' before allowing an edit),
-- not by RLS -- same app-layer-invariant convention as this codebase's
-- other insert-only/immutable tables, since the real rule ("no edits once
-- responses exist") doesn't map cleanly onto a column-level RLS check.
alter table system_assessments enable row level security;
alter table system_assessment_versions enable row level security;
alter table system_assessment_questions enable row level security;
alter table assessment_responses enable row level security;
alter table assessment_answers enable row level security;

create policy "system_assessments_select_member" on system_assessments
  for select using (is_project_member(project_id, auth.uid()));

create policy "system_assessments_manage_curator" on system_assessments
  for all
  using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

create policy "system_assessment_versions_select_member" on system_assessment_versions
  for select using (is_project_member(project_id, auth.uid()));

create policy "system_assessment_versions_manage_curator" on system_assessment_versions
  for all
  using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

create policy "system_assessment_questions_select_member" on system_assessment_questions
  for select using (is_project_member(project_id, auth.uid()));

create policy "system_assessment_questions_manage_curator" on system_assessment_questions
  for all
  using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

-- Any project member can see every participant's responses -- the entire
-- point is comparing methods side by side (design note section 11-12), not
-- hiding answers from one another the way, say, a blind eval would.
create policy "assessment_responses_select_member" on assessment_responses
  for select using (is_project_member(project_id, auth.uid()));

-- can_run_project_evals (owner/curator/consultant, excludes viewer) is the
-- closest existing helper to "Consultant / Project Member with appropriate
-- edit rights" from the design note's permission table -- a viewer must
-- not be able to submit a response, same reasoning as it excluding viewer
-- from triggering eval runs.
create policy "assessment_responses_insert_member" on assessment_responses
  for insert to authenticated
  with check (can_run_project_evals(project_id, auth.uid()) and created_by = auth.uid());

-- The response's own author can keep editing it (design note: "edit
-- responses until submitted" -- the in_progress/completed cutoff is
-- app-layer, same reasoning as version immutability above), or a curator
-- can fix/annotate any response.
create policy "assessment_responses_update_owner_or_curator" on assessment_responses
  for update
  using (created_by = auth.uid() or can_curate_project(project_id, auth.uid()))
  with check (created_by = auth.uid() or can_curate_project(project_id, auth.uid()));

create policy "assessment_answers_select_member" on assessment_answers
  for select using (is_project_member(project_id, auth.uid()));

create policy "assessment_answers_insert_response_owner" on assessment_answers
  for insert to authenticated
  with check (
    is_project_member(project_id, auth.uid())
    and exists (select 1 from assessment_responses r where r.id = response_id and r.created_by = auth.uid())
  );

create policy "assessment_answers_update_owner_or_curator" on assessment_answers
  for update
  using (
    can_curate_project(project_id, auth.uid())
    or exists (select 1 from assessment_responses r where r.id = response_id and r.created_by = auth.uid())
  )
  with check (
    can_curate_project(project_id, auth.uid())
    or exists (select 1 from assessment_responses r where r.id = response_id and r.created_by = auth.uid())
  );
