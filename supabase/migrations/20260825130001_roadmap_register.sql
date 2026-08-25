-- Owner Roadmap register, in-app. The owner-confidential Markdown roadmap
-- (docs/commercial/ROADMAP.md, local-only, excluded from Git) explicitly
-- anticipates this: "If this roadmap later needs access from multiple
-- devices or through KB Sandbox, move it to an authenticated private
-- record ... and enforce access for the two identities above." This
-- migration does exactly that for the register TABLE specifically (the
-- tabular OR-XXX rows) -- the longer prose detail sections for individual
-- items stay in the Markdown file, which remains the narrative source of
-- record; this table is the operational, editable, exportable register.
--
-- Same authorization shape as platform_owners/feedback_reports (this
-- session's own precedent): is_platform_owner(), zero role bypass.

create table roadmap_items (
  id uuid primary key default gen_random_uuid(),
  -- The human-facing "OR-014" identifier -- stable, assigned by an owner,
  -- never renumbered (matches the Markdown register's own "Do not renumber
  -- existing methods silently"-style convention elsewhere in this repo).
  item_ref text not null unique,
  title text not null,
  item_type text not null,
  public_milestone text,
  priority text,
  status text not null default 'captured'
    check (status in ('captured', 'assessing', 'proposed', 'approved', 'in_progress', 'validate', 'done', 'deferred', 'declined', 'superseded')),
  pilot_position text,
  decision_next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger roadmap_items_set_updated_at before update on roadmap_items
  for each row execute function set_updated_at();

alter table roadmap_items enable row level security;

-- Select and write share the exact same boundary here -- a single FOR ALL
-- policy is sufficient, same reasoning as project_access_groups etc.
-- (20260825100001's own comment on why this avoids the "combined policy
-- leaks SELECT via OR" trap from 20260824210001).
create policy "roadmap_items_owner" on roadmap_items
  for all using (is_platform_owner(auth.uid())) with check (is_platform_owner(auth.uid()));

-- Seed with the current register (docs/commercial/ROADMAP.md, as of this
-- migration) so the in-app view starts out matching the Markdown file
-- rather than empty. Status values map onto the check constraint above by
-- taking the FIRST listed status where a cell shows more than one (e.g.
-- "Done/Validate" -> 'done', "In progress (Stage 1 Done/Validate)" ->
-- 'in_progress') -- the full original text is preserved verbatim in
-- decision_next_action, nothing is lost, just normalized for the status
-- filter/dropdown.
insert into roadmap_items (item_ref, title, item_type, public_milestone, priority, status, pilot_position, decision_next_action) values
('OR-001', 'Project-aware knowledge and project-bound Ember conversations', 'Change', 'M2/M5', 'P0', 'done', 'Gating', 'Complete deployed regression: citations, isolation, staleness, history and recovery.'),
('OR-002', 'Project approval authorities', 'New feature', 'M7', 'P1', 'done', 'Important', 'Continue staged approval requests/decisions only when artifact versioning and pilot need justify it.'),
('OR-003', 'Project lead role and bounded member-management rights', 'Change', 'M5/M7', 'P1', 'proposed', 'Important', 'Owner/lead may add ordinary members; lead cannot replace owner or grant restricted access without separate stewardship.'),
('OR-004', 'Project evidence access controls for pricing, contracts and other restricted evidence', 'New feature', 'M1/M2/M7', 'P0 before real restricted data', 'in_progress', 'Gating only if real customer pricing/confidential evidence is used', 'Stage 1 (access model + restricted source/chunk/citation retrieval) implemented and live-verified with synthetic pricing 25 Aug 2026. Stage 2 (derived-content inheritance, sanitized release, approval-authority gap warnings) and Stage 3 (conversation/export/eval/MCP hardening) deferred -- see detailed section in the Markdown roadmap for scope and review triggers.'),
('OR-005', 'Personal Work Journal and downloadable reflection', 'Enhancement', 'M8/M9', 'P2', 'done', 'Nice to have', 'Preserve private user ownership and transient DOCX generation.'),
('OR-006', 'Private Journal Calendar and Memory Map', 'Enhancement', 'M8/M9', 'P2', 'proposed', 'Nice to have', 'Calendar/timeline over authorized source activity with project, source and relationship filters. No productivity scoring.'),
('OR-007', 'Ember Weekly Continuity summaries', 'Enhancement', 'M5/M8', 'P2', 'proposed', 'Nice to have; may support evaluation', 'One private weekly summary; bounded recent/relevant use by Ember; inspect/correct/exclude/delete; explicit promotion to governed knowledge.'),
('OR-008', 'Manager asks Ember for work performed by a named user', 'New feature', 'M7/M8', 'P4', 'deferred', 'Excluded', 'Do not introduce manager/team hierarchy or employee dossiers until a real customer request, legal/privacy review and explicit governance design exist.'),
('OR-009', 'Governed external web research', 'New feature', 'M4/M10', 'P3', 'deferred', 'Not gating', 'Users may supply research manually during pilot; reconsider when source approval, security and repeatability justify it.'),
('OR-010', 'Repeatable dedicated-customer deployment package', 'Change/program', 'M6', 'P3 immediately after pilot', 'proposed', 'Post-pilot', 'Automate provisioning, validation, migrations, backup/restore, credentials and initial administration.'),
('OR-011', 'Dedicated deployment fleet management', 'New capability', 'M6/M7', 'P3', 'proposed', 'Post-pilot', 'Add non-content health/version inventory, upgrades, drift, backups, support boundaries and licensing.'),
('OR-012', 'Shared multi-tenant SaaS edition', 'Architecture/program', 'M6/M7', 'P4', 'deferred', 'Excluded', 'Reconsider only on proven demand and after organization scoping, tenant-safe data paths, operations and security evidence.'),
('OR-013', 'Customer-specific source-code forks', 'Architecture exception', 'All', null, 'declined', 'Excluded', 'One product; meet variations through configuration, permissions, deployment profiles and supported extensions.'),
('OR-014', 'Ember-assisted pilot feedback intake and owner request/change/bug board', 'New feature', 'M3/M5/M7/M8', 'P1', 'done', 'Important', 'Report a problem/Suggest an improvement/Request a new feature inside Ember, drafted conversationally and submitted only after user review. Phase 1 (data model, board, Ember drafting) implemented and live-verified 25 Aug 2026 -- duplicate-linking UI and pilot summary reporting deferred.'),
('OR-015', 'Personal Journal evolution program', 'Enhancement program', 'M5/M8/M9', 'P2 after OR-014', 'proposed', 'Nice to have / post-foundation', 'Evolve the private Journal from downloadable reflection into an inspectable personal activity timeline and bounded Ember continuity aid. Implement in privacy-preserving phases; no manager lookup or automatic organizational sharing.'),
('OR-016', 'Graph engineering and executable Workbench Methods', 'Architecture/research program', 'M3/M4/M5/M7/M10', 'P3', 'captured', 'Post-pilot', 'Test whether graph designs outperform simpler loops, then consider versioned Method graph templates coordinating deterministic nodes, agent nodes, evaluators, verifiers and human gates. Keep the primary UX conversational and outputs evidence-led.')
on conflict (item_ref) do nothing;
