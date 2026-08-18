-- M6A: Workbench Handbook Wiki (M5F Phase A). wiki_categories is a lookup
-- table, not a check-constraint enum (see 20260808220001_wiki_categories.sql),
-- so adding the category is a plain insert.
insert into wiki_categories (id, name, sort_order) values
  ('platform_handbook', 'Workbench Handbook', 7)
on conflict (id) do nothing;

-- wiki_sources previously had no way to cite a workstream_artifacts row as
-- evidence (only document_id/chunk_id) -- Handbook articles synthesized from
-- project self-analysis artifacts (e.g. the M5F OpenAPI Discovery output)
-- need real, queryable traceability back to that evidence, not a text note
-- stuffed into source_type='external'. Purely additive: new nullable column,
-- widened check constraints, no existing row's meaning changes. Same
-- drop-and-recreate pattern as 20260814130001_workstream_artifact_types.sql.
alter table wiki_sources add column workstream_artifact_id uuid references workstream_artifacts(id) on delete set null;

alter table wiki_sources drop constraint wiki_sources_source_type_check;
alter table wiki_sources add constraint wiki_sources_source_type_check
  check (source_type in ('document', 'chunk', 'external', 'workstream_artifact'));

alter table wiki_sources drop constraint wiki_sources_evidence_required;
alter table wiki_sources add constraint wiki_sources_evidence_required check (
  source_type = 'external' or document_id is not null or chunk_id is not null or workstream_artifact_id is not null
);
