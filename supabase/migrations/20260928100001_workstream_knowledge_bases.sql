-- Builder Ontology, Part D (docs/kbs-ontology-dev-req-3.md, Part D of the
-- implementation plan): today a knowledge_bases attachment is project-
-- scoped only (project_knowledge_bases) -- there's no way for one
-- Workstream to have its own scoped KB distinct from its Project's (e.g. a
-- client-specific reference set that shouldn't be visible to every other
-- workstream in the same builder-agency Project). Independent of Parts
-- A/B/C. Exact structural mirror of project_knowledge_bases' own final,
-- hardened shape (20260824160001_project_knowledge_visibility_fixes.sql +
-- 20260824170001_project_wiki_strict_membership.sql +
-- 20260824210001_project_junction_manage_policies_no_select_leak.sql):
-- strict membership for select (is_project_member_strict, no admin-bypass
-- leak on content-visibility-adjacent data), curator-gated insert/delete
-- only (can_curate_project, which does keep its admin bypass -- managing an
-- association is a different, lower-stakes capability than reading
-- confidential content), no update policy (only ever inserted or deleted,
-- never updated in place).

create table workstream_knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references project_workstreams(id) on delete cascade,
  knowledge_base_id text not null references knowledge_bases(id) on delete cascade,
  purpose text,
  attached_by uuid references profiles(id) on delete set null,
  attached_at timestamptz not null default now(),
  unique (workstream_id, knowledge_base_id)
);

create index workstream_knowledge_bases_workstream_id_idx on workstream_knowledge_bases(workstream_id);
create index workstream_knowledge_bases_kb_id_idx on workstream_knowledge_bases(knowledge_base_id);

alter table workstream_knowledge_bases enable row level security;

create policy "workstream_knowledge_bases_select_member" on workstream_knowledge_bases
  for select using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_knowledge_bases.workstream_id and is_project_member_strict(w.project_id, auth.uid())
    )
  );

create policy "workstream_knowledge_bases_insert_curator" on workstream_knowledge_bases
  for insert with check (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_knowledge_bases.workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  );

create policy "workstream_knowledge_bases_delete_curator" on workstream_knowledge_bases
  for delete using (
    exists (
      select 1 from project_workstreams w
      where w.id = workstream_knowledge_bases.workstream_id and can_curate_project(w.project_id, auth.uid())
    )
  );
