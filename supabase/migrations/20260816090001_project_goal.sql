-- A project-level goal, shared by every workstream in that project (the
-- method/approach doesn't change per workstream -- only which external tool
-- executes it does). Workstreams now link back here instead of repeating
-- the same text. No RLS change: projects_update_managers (can_manage_project)
-- already covers this column, same as `notes`.
alter table projects add column if not exists goal text;
