-- Adds a curator-editable outcome summary to project_workstreams, distinct
-- from `goal` (what we set out to do). Populated once artifacts/evidence
-- exist, shown at the top of the workstream page. Reuses the existing
-- project_workstreams_manage_curator policy (for all) -- no new RLS needed.
alter table project_workstreams add column if not exists summary text;
