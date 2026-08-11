-- ==== supabase/migrations/20260811100004_project_workstreams.sql ====
-- M5D (simplified): Project Workstreams & External Artifacts. KB Sandbox
-- does not execute engineering work itself -- a consultant clones a
-- standalone repo template (openapi-modernizer/mcp-modernizer, entirely
-- outside this codebase) and drives it with Claude Code against the target
-- legacy repository. A Workstream is the scope document that tells the
-- consultant what to do (repository scope, goal, a named guardrail, a
-- deliverables checklist); a workstream_artifacts row is the evidence the
-- consultant attaches when they're done (a capability inventory, a spec
-- excerpt, findings, a link to the actual PR/repo). No execution, no
-- automated scoring in this pass -- "automate the workflow after you
-- understand the workflow."
--
-- This is project-scoped, not an Agent -- unrelated to the agents/
-- agent_versions tables from 20260811100003_agent_framework.sql.

-- project_workstreams -------------------------------------------------------
-- Ordinary mutable table -- a workstream is a living scope document someone
-- edits as understanding evolves, not something executed against, so no
-- immutable-versioning is warranted (unlike graph_versions/agent_versions).
create table project_workstreams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  -- Glob patterns, e.g. 'src/onboarding/**' -- documentation for the
  -- consultant's external tooling, not enforced/read by KB Sandbox itself.
  repository_scope text[] not null default '{}',
  goal text,
  -- Free-text reference (e.g. "Safe Modernization") until M5C's
  -- guardrail_templates exists -- upgrade to a real FK then.
  guardrail text,
  -- [{label: string, completed: boolean}]
  deliverables jsonb not null default '[]',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create trigger project_workstreams_set_updated_at before update on project_workstreams
  for each row execute function set_updated_at();

-- workstream_artifacts --------------------------------------------------------
-- The evidence trail. Insert-only -- no update/delete policy below, same
-- immutability reasoning as wiki_sources: you don't edit history, you
-- attach a new finding if something changes. No file upload in this pass --
-- deliberately simpler than the Milestone 1 document pipeline: the real
-- generated artifacts (OpenAPI YAML, MCP server code) live in the
-- consultant's external repo/PR; KB Sandbox holds a link plus a text
-- summary, not the files themselves.
create table workstream_artifacts (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references project_workstreams(id) on delete cascade,
  artifact_type text not null check (artifact_type in ('capability_inventory', 'openapi_spec', 'mcp_server', 'test_results', 'findings', 'other')),
  title text not null,
  -- "record external tool used", e.g. "Claude Code".
  external_tool text,
  -- Inline text/markdown -- a findings writeup, a small spec excerpt.
  content text,
  -- Link to the actual PR/branch/repo where generated files live.
  external_url text,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint workstream_artifacts_evidence_required check (content is not null or external_url is not null)
);

create index if not exists workstream_artifacts_workstream_id_idx on workstream_artifacts(workstream_id);

-- RLS -----------------------------------------------------------------------
alter table project_workstreams enable row level security;
alter table workstream_artifacts enable row level security;

create policy "project_workstreams_select_member" on project_workstreams
  for select using (is_project_member(project_id, auth.uid()));

-- Owner+curator define/edit scope and mark deliverables complete -- matches
-- the eval_datasets_manage_project_curator precedent exactly (can_curate_project,
-- not can_manage_project -- a project curator, not just its owner, can run
-- this).
create policy "project_workstreams_manage_curator" on project_workstreams
  for all using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

create policy "workstream_artifacts_select_member" on workstream_artifacts
  for select using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_artifacts.workstream_id and is_project_member(w.project_id, auth.uid())
    )
  );

-- Broader than curator -- the consultant who did the external work is who
-- attaches the evidence, matching how graph_runs_insert_consultant/
-- eval_runs_insert_active_consultant are scoped (can_run_project_evals:
-- owner/curator/consultant, excludes viewer).
create policy "workstream_artifacts_insert_consultant" on workstream_artifacts
  for insert with check (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_artifacts.workstream_id and can_run_project_evals(w.project_id, auth.uid())
    )
  );
