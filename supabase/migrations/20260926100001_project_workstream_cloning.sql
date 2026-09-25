-- Builder Ontology, Part B (docs/kbs-ontology-dev-req-3.md, Part B of the
-- implementation plan): lets a builder duplicate a Project or a Workstream
-- (with its own subtree) to compare two options side by side under
-- otherwise-identical conditions -- e.g. two VLM training partners run as
-- siblings, each with its own fresh run history. Provenance-only columns:
-- cloning itself is a service-layer deep copy (project-cloning.ts), nothing
-- here executes or cascades automatically. No new RLS -- both columns land
-- on tables already fully covered by existing policies (projects_*,
-- project_workstreams_*).

alter table projects add column cloned_from_project_id uuid references projects(id) on delete set null;
create index if not exists projects_cloned_from_project_id_idx on projects(cloned_from_project_id);

alter table project_workstreams add column cloned_from_workstream_id uuid references project_workstreams(id) on delete set null;
create index if not exists project_workstreams_cloned_from_workstream_id_idx on project_workstreams(cloned_from_workstream_id);
