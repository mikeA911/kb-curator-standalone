-- Adds research_dossier as a first-class workstream_artifacts type -- Ember's
-- web-research findings (via the search_web tool), proposed for human
-- curator review before becoming real project knowledge. Purely additive:
-- no existing value is renamed or removed, so every historical row stays
-- valid. Same drop-and-recreate pattern as
-- 20260818100001_workstream_artifact_type_design_note.sql.
alter table workstream_artifacts drop constraint workstream_artifacts_artifact_type_check;
alter table workstream_artifacts add constraint workstream_artifacts_artifact_type_check
  check (artifact_type in (
    'capability_inventory', 'endpoint_inventory', 'openapi_spec', 'mcp_server',
    'evidence_map', 'test_results', 'findings', 'design_note', 'implementation_handoff',
    'research_dossier', 'other'
  ));
