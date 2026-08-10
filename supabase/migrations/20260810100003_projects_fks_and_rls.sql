-- Nullable project_id links from existing entities -- direct FK rather than
-- a join table, per the brief's "choose the simplest clean architecture"
-- guidance (project_knowledge_bases/project_eval_datasets join tables would
-- only earn their keep once a KB or dataset needs to belong to more than one
-- project, which isn't a requirement yet).
alter table knowledge_bases add column if not exists project_id uuid references projects(id) on delete set null;
alter table eval_datasets add column if not exists project_id uuid references projects(id) on delete set null;

-- projects RLS ----------------------------------------------------------------
-- No project-membership model yet (owner/curator/consultant/viewer *within* a
-- project) -- deferred per the brief's explicit allowance until justified by
-- real multi-project use. For now: any non-anonymous staff/consultant can see
-- every project (mirrors how documents/knowledge_bases aren't per-user siloed
-- elsewhere in this app either); only the owner or curator/admin can update;
-- anonymous sessions get no access at all.
alter table projects enable row level security;

create policy "projects_select_staff_or_consultant" on projects
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "projects_insert_self" on projects
  for insert with check (
    owner_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "projects_update_owner_or_staff" on projects
  for update using (owner_id = auth.uid() or is_curator_or_admin(auth.uid()))
  with check (owner_id = auth.uid() or is_curator_or_admin(auth.uid()));
