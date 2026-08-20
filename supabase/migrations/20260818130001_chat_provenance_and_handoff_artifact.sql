-- M6E: Assistant model identity/provenance + document-first Workbench
-- methods. Two purely additive changes:

-- 1. Per-message model provenance on chat_messages, mirroring the existing
-- plain-text-snapshot convention used by wiki_versions.ai_provider/.ai_model
-- and ai_operation_logs.provider/.model (never a live FK to ai_providers/
-- ai_models -- historical rows must stay accurate even if a model is later
-- renamed, disabled, or stops being the default). Nullable: only set on
-- assistant-role rows.
alter table chat_messages add column provider text;
alter table chat_messages add column model text;

-- 2. implementation_handoff as a first-class workstream_artifacts type --
-- the generic handoff-document concept the design note asks for (rather
-- than a new artifact type per engineering method). Same drop-and-recreate
-- pattern as 20260818100001_workstream_artifact_type_design_note.sql.
alter table workstream_artifacts drop constraint workstream_artifacts_artifact_type_check;
alter table workstream_artifacts add constraint workstream_artifacts_artifact_type_check
  check (artifact_type in (
    'capability_inventory', 'endpoint_inventory', 'openapi_spec', 'mcp_server',
    'evidence_map', 'test_results', 'findings', 'design_note', 'implementation_handoff', 'other'
  ));
