-- Adds design_note as a first-class workstream_artifacts type -- for
-- handoff-ready architecture/design docs (e.g. the M5F Phases A/C/D/E
-- design note), distinct from the evidence-oriented types already listed
-- (capability_inventory, findings, etc.). Purely additive: no existing
-- value is renamed or removed, so every historical row stays valid. Same
-- drop-and-recreate pattern as 20260814130001_workstream_artifact_types.sql.
alter table workstream_artifacts drop constraint workstream_artifacts_artifact_type_check;
alter table workstream_artifacts add constraint workstream_artifacts_artifact_type_check
  check (artifact_type in (
    'capability_inventory', 'endpoint_inventory', 'openapi_spec', 'mcp_server',
    'evidence_map', 'test_results', 'findings', 'design_note', 'other'
  ));
