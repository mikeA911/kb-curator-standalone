-- Builder Ontology, Part C (docs/kbs-ontology-dev-req-3.md, Part C of the
-- implementation plan): a structured Method a builder can promote from a
-- workstream that worked -- reusable process/guardrails other builders can
-- browse and instantiate into a fresh workstream of their own. Deliberately
-- narrowed scope for this pass: ships the table, promotion-from-workstream,
-- and instantiation. Deferred: Ember checking published Methods before
-- proposing a new workstream tree during the wizard's own "Domain objects &
-- workstreams" step (a loop.ts/context-retrieval change, separate work from
-- the schema+CRUD here) -- the applied_method_id column below is added now
-- anyway (cheap, foundational) even though nothing populates it live yet.
--
-- requirements/evidence/deliverables/guardrails/review_points are plain
-- text, not jsonb -- this codebase's own "no template engine" convention
-- (see projects.details' own comment) for free-form curator-authored
-- content rendered as Markdown, same as project_workstreams.guardrail/
-- summary/goal. Nothing in this pass parses them as structured data.

create table methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  -- The workstream a Method was promoted from -- not null (every Method has
  -- a real, demonstrated origin), so its own delete cascades here too,
  -- matching workstream_promotions.workstream_id's identical not-null +
  -- cascade shape (20260906100001_workstream_promotions_schema.sql) rather
  -- than the "set null" that would violate this column's own not-null
  -- constraint.
  derived_from_workstream_id uuid not null references project_workstreams(id) on delete cascade,
  derived_from_wiki_article_id uuid references wiki_articles(id) on delete set null,
  requirements text,
  evidence text,
  deliverables text,
  guardrails text,
  review_points text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_by uuid references profiles(id) on delete set null,
  published_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index methods_derived_from_workstream_id_idx on methods(derived_from_workstream_id);
create index methods_status_idx on methods(status);

create trigger methods_set_updated_at before update on methods
  for each row execute function set_updated_at();

alter table project_workstreams add column derived_from_method_id uuid references methods(id) on delete set null;
create index project_workstreams_derived_from_method_id_idx on project_workstreams(derived_from_method_id);

-- Runtime-evidence column for the deferred design-time integration (see
-- header comment) -- not populated by anything in this pass.
alter table ai_operation_logs add column applied_method_id uuid references methods(id) on delete set null;

alter table methods enable row level security;

-- Published is cross-builder visible (the whole point of a Method); a draft
-- is visible only to the originating builder (whoever can curate the source
-- workstream's project) or platform staff.
create policy "methods_select_published_or_own_draft" on methods
  for select using (
    status = 'published'
    or is_curator_or_admin(auth.uid())
    or exists (
      select 1 from project_workstreams w
      where w.id = derived_from_workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  );

create policy "methods_insert_own" on methods
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from project_workstreams w
      where w.id = derived_from_workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  );

-- Same two-policy split as capability_evaluations
-- (20260906110001_capability_evaluations_schema.sql), this session's own
-- precedent: the originating builder can edit their own Method, but the
-- WITH CHECK keeps status in ('draft'), so even a raw API call can't
-- self-publish -- publishing is a separate staff-only policy below.
-- Postgres has no column-level RLS, so the terminal state is excluded at
-- the row level for the owner's own policy specifically.
create policy "methods_manage_own_draft" on methods
  for update
  using (
    exists (
      select 1 from project_workstreams w
      where w.id = derived_from_workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  )
  with check (
    status = 'draft'
    and exists (
      select 1 from project_workstreams w
      where w.id = derived_from_workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  );

create policy "methods_publish_staff" on methods
  for update
  using (is_curator_or_admin(auth.uid()))
  with check (is_curator_or_admin(auth.uid()));
