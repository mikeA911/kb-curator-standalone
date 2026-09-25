-- Builder Ontology, Part A (docs/kbs-ontology-dev-req-3.md): per-project
-- domain-object ontology (project_objects, a self-referencing tree -- e.g.
-- Plane/Route for an airline client, Sensor/AnomalyEvent for a
-- riverbank-monitoring client) plus richer Workstream structure (nesting,
-- lifecycle stage, operational status, planned/actual duration) and two
-- relationship tables (workstream_object_links: which objects a workstream
-- reads/writes/creates; workstream_flow: pipeline ordering between
-- workstreams). This is the instance-graph layer later Methods/cloning
-- features read -- nothing here executes anything. Single shared database,
-- one operator, many builders, isolated from each other by RLS -- NOT
-- per-client physical database separation (see the doc's own §1.1
-- correction from an earlier draft).

alter table project_workstreams
  add column parent_workstream_id uuid references project_workstreams(id) on delete cascade,
  -- Commercial/engagement lifecycle stage -- a different axis than `status`
  -- (draft/active/completed/archived). Nullable: existing rows and non-
  -- Builder-programme projects may never set this.
  add column lifecycle_stage text check (lifecycle_stage in ('presales', 'deployment', 'management_maintenance')),
  add column operational_status text not null default 'open' check (operational_status in ('open', 'concluded')),
  add column planned_duration interval,
  add column actual_duration interval;

create index if not exists project_workstreams_parent_workstream_id_idx on project_workstreams(parent_workstream_id);

-- Connecting infrastructure for the doc's own §9 (Evals section workstream
-- list) and a later comparison view -- neither can join a run back to a
-- workstream without this.
alter table eval_runs add column workstream_id uuid references project_workstreams(id) on delete set null;
create index if not exists eval_runs_workstream_id_idx on eval_runs(workstream_id);

-- Cycle guard for parent_workstream_id -- Postgres/RLS can't declaratively
-- forbid "no cycles" on a self-referencing adjacency list. This trigger is
-- the real enforcement (fires for every writer, not just the service
-- layer); the service layer additionally pre-checks the same thing so a
-- caller gets a clear message instead of a raw trigger exception (same
-- defense-in-depth shape as createWorkstream's own OL-002 role preflight).
create or replace function prevent_workstream_cycle()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cursor_id uuid;
begin
  if new.parent_workstream_id is null then
    return new;
  end if;
  if new.parent_workstream_id = new.id then
    raise exception 'project_workstreams: a workstream cannot be its own parent';
  end if;
  cursor_id := new.parent_workstream_id;
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'project_workstreams: parent_workstream_id would create a cycle';
    end if;
    select parent_workstream_id into cursor_id from project_workstreams where id = cursor_id;
  end loop;
  return new;
end;
$$;

create trigger project_workstreams_prevent_cycle before insert or update of parent_workstream_id on project_workstreams
  for each row execute function prevent_workstream_cycle();

-- project_objects ------------------------------------------------------------
-- Per-project domain-object ontology. A self-referencing tree of the domain
-- object *types* that matter for this specific builder's business -- not a
-- platform-wide taxonomy, and not instances of those types. Ordinary
-- mutable table, same reasoning as project_workstreams: a living definition
-- someone edits as understanding evolves, not something executed against.
create table project_objects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_object_id uuid references project_objects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists project_objects_project_id_idx on project_objects(project_id);
create index if not exists project_objects_parent_object_id_idx on project_objects(parent_object_id);

create trigger project_objects_set_updated_at before update on project_objects
  for each row execute function set_updated_at();

create or replace function prevent_project_object_cycle()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cursor_id uuid;
begin
  if new.parent_object_id is null then
    return new;
  end if;
  if new.parent_object_id = new.id then
    raise exception 'project_objects: an object cannot be its own parent';
  end if;
  cursor_id := new.parent_object_id;
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'project_objects: parent_object_id would create a cycle';
    end if;
    select parent_object_id into cursor_id from project_objects where id = cursor_id;
  end loop;
  return new;
end;
$$;

create trigger project_objects_prevent_cycle before insert or update of parent_object_id on project_objects
  for each row execute function prevent_project_object_cycle();

-- workstream_object_links -----------------------------------------------------
-- Which objects a workstream reads/writes/creates. One row per
-- (workstream_id, object_id) pair with an access_modes array -- reuses the
-- repository_scope text[] precedent already on project_workstreams itself,
-- rather than three near-duplicate rows per relation.
create table workstream_object_links (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references project_workstreams(id) on delete cascade,
  object_id uuid not null references project_objects(id) on delete cascade,
  access_modes text[] not null default '{}',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workstream_id, object_id),
  constraint workstream_object_links_access_modes_valid check (access_modes <@ array['reads', 'writes', 'creates']::text[])
);

create index if not exists workstream_object_links_workstream_id_idx on workstream_object_links(workstream_id);
create index if not exists workstream_object_links_object_id_idx on workstream_object_links(object_id);

create trigger workstream_object_links_set_updated_at before update on workstream_object_links
  for each row execute function set_updated_at();

-- A link's workstream and object must belong to the same project, or a
-- builder could wire another builder's object into their own workstream
-- despite both individually passing RLS on their own project.
create or replace function validate_workstream_object_link_project_match()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ws_project_id uuid;
  obj_project_id uuid;
begin
  select project_id into ws_project_id from project_workstreams where id = new.workstream_id;
  select project_id into obj_project_id from project_objects where id = new.object_id;
  if ws_project_id is null or obj_project_id is null or ws_project_id != obj_project_id then
    raise exception 'workstream_object_links: workstream and object must belong to the same project';
  end if;
  return new;
end;
$$;

create trigger workstream_object_links_validate_project_match before insert or update on workstream_object_links
  for each row execute function validate_workstream_object_link_project_match();

-- workstream_flow --------------------------------------------------------------
-- Pipeline ordering between workstreams (a DAG, not a simple tree -- a
-- workstream can have multiple upstream/downstream neighbors).
create table workstream_flow (
  id uuid primary key default gen_random_uuid(),
  upstream_workstream_id uuid not null references project_workstreams(id) on delete cascade,
  downstream_workstream_id uuid not null references project_workstreams(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (upstream_workstream_id, downstream_workstream_id),
  constraint workstream_flow_no_self_loop check (upstream_workstream_id != downstream_workstream_id)
);

create index if not exists workstream_flow_upstream_idx on workstream_flow(upstream_workstream_id);
create index if not exists workstream_flow_downstream_idx on workstream_flow(downstream_workstream_id);

create or replace function validate_workstream_flow_project_match()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  up_project_id uuid;
  down_project_id uuid;
begin
  select project_id into up_project_id from project_workstreams where id = new.upstream_workstream_id;
  select project_id into down_project_id from project_workstreams where id = new.downstream_workstream_id;
  if up_project_id is null or down_project_id is null or up_project_id != down_project_id then
    raise exception 'workstream_flow: both workstreams must belong to the same project';
  end if;
  return new;
end;
$$;

create trigger workstream_flow_validate_project_match before insert or update on workstream_flow
  for each row execute function validate_workstream_flow_project_match();

-- Cycle guard for the flow DAG: does a path already exist from the new
-- edge's downstream node back to its upstream node? If so this edge would
-- close a cycle. Recursive CTE, not a simple parent-walk loop, since this
-- is a general graph, not a tree.
create or replace function prevent_workstream_flow_cycle()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  reaches_upstream boolean;
begin
  with recursive downstream_closure(id) as (
    select new.downstream_workstream_id
    union
    select wf.downstream_workstream_id
    from workstream_flow wf
    join downstream_closure dc on wf.upstream_workstream_id = dc.id
  )
  select exists (select 1 from downstream_closure where id = new.upstream_workstream_id) into reaches_upstream;

  if reaches_upstream then
    raise exception 'workstream_flow: this edge would create a cycle in the workstream pipeline';
  end if;
  return new;
end;
$$;

create trigger workstream_flow_prevent_cycle before insert on workstream_flow
  for each row execute function prevent_workstream_flow_cycle();

-- RLS -----------------------------------------------------------------------
alter table project_objects enable row level security;
alter table workstream_object_links enable row level security;
alter table workstream_flow enable row level security;

-- project_objects: direct child of project, same shape as project_workstreams
-- itself (is_project_member for select, can_curate_project for manage).
create policy "project_objects_select_member" on project_objects
  for select using (is_project_member(project_id, auth.uid()));

create policy "project_objects_manage_curator" on project_objects
  for all using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

-- workstream_object_links: child of workstream via subquery, same shape as
-- workstream_artifacts_select_member/workstream_artifacts_insert_consultant
-- (no denormalized project_id column -- always join through
-- project_workstreams). Curator-level gate for manage: this is a structural
-- definition of the workstream's scope, same authorization bar as the
-- workstream's own repository_scope/goal/guardrail fields
-- (project_workstreams_manage_curator), not the broader consultant-evidence
-- bar workstream_artifacts uses.
create policy "workstream_object_links_select_member" on workstream_object_links
  for select using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_object_links.workstream_id and is_project_member(w.project_id, auth.uid())
    )
  );

create policy "workstream_object_links_manage_curator" on workstream_object_links
  for all using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_object_links.workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_object_links.workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  );

-- workstream_flow: child of workstream via subquery, same shape as above --
-- checking the upstream side is sufficient for using/select (the trigger
-- above already guarantees both sides share a project); with check verifies
-- both sides so a caller can't wire in a workstream from a project they
-- can't curate.
create policy "workstream_flow_select_member" on workstream_flow
  for select using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_flow.upstream_workstream_id and is_project_member(w.project_id, auth.uid())
    )
  );

create policy "workstream_flow_manage_curator" on workstream_flow
  for all using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_flow.upstream_workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_flow.upstream_workstream_id and can_curate_project(w.project_id, auth.uid())
    )
    and exists (
      select 1 from project_workstreams w2
      where w2.id = workstream_flow.downstream_workstream_id and can_curate_project(w2.project_id, auth.uid())
    )
  );
