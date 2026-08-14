-- Adds endpoint_inventory and evidence_map as first-class
-- workstream_artifacts types -- previously these would have been squeezed
-- into 'other'. Purely additive: no existing value is renamed or removed,
-- so every historical row (and every other existing type) stays valid.
-- Constraint name relies on Postgres's default naming for an unnamed inline
-- check ("<table>_<column>_check"), same convention already relied on in
-- 20260810100001_role_consultant_anonymous.sql (profiles_role_check).
alter table workstream_artifacts drop constraint workstream_artifacts_artifact_type_check;
alter table workstream_artifacts add constraint workstream_artifacts_artifact_type_check
  check (artifact_type in (
    'capability_inventory', 'endpoint_inventory', 'openapi_spec', 'mcp_server',
    'evidence_map', 'test_results', 'findings', 'other'
  ));
