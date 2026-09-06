-- Generalizes Workstream Promotion (20260906100001) beyond Builder mode.
-- The original version scoped insert to the workstream's Project *owner*
-- and decide to platform-level is_curator_or_admin -- both correct for a
-- Builder's single-member Project, both wrong for an ordinary Enterprise
-- team Project (e.g. an HR Manager who is a project-level `curator` but
-- platform role merely `consultant`, with staff who are plain `member`/
-- `consultant` submitting the work, never the Project owner). /admin
-- itself is platform-admin-only, so is_curator_or_admin excluded that HR
-- Manager from ever reviewing at all.
--
-- The generalized, still-safe rule: decide requires can_curate_project
-- (project owner-or-curator, or platform admin via its own bypass) AND
-- submitted_by != auth.uid() -- this still blocks a Builder from
-- self-approving (they're both owner and submitter), still lets a platform
-- admin decide a Builder's solo-Project promotion, and now also lets any
-- team Project's real curator decide their own team's promotions.

drop policy "workstream_promotions_insert_owner" on workstream_promotions;
create policy "workstream_promotions_insert_member" on workstream_promotions
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and exists (select 1 from project_workstreams w where w.id = workstream_id and is_project_member(w.project_id, auth.uid()))
  );

drop policy "workstream_promotions_select_own_or_operator" on workstream_promotions;
create policy "workstream_promotions_select_own_or_curator" on workstream_promotions
  for select using (
    submitted_by = auth.uid()
    or exists (select 1 from project_workstreams w where w.id = workstream_id and can_curate_project(w.project_id, auth.uid()))
  );

drop policy "workstream_promotions_decide_operator" on workstream_promotions;
create policy "workstream_promotions_decide_curator" on workstream_promotions
  for update
  using (
    submitted_by != auth.uid()
    and exists (select 1 from project_workstreams w where w.id = workstream_id and can_curate_project(w.project_id, auth.uid()))
  )
  with check (
    submitted_by != auth.uid()
    and exists (select 1 from project_workstreams w where w.id = workstream_id and can_curate_project(w.project_id, auth.uid()))
  );
