-- Evaluation RLS. Curator/admin only throughout -- unlike the Wiki, eval
-- datasets/results aren't end-user-facing content, they're an internal QA
-- tool, so there's no "approved -> visible to everyone" tier here.
--
-- The one RLS rule doing real work beyond simple role-gating: eval_cases
-- cannot be inserted/updated/deleted once the parent dataset's status is no
-- longer 'draft'. That's what makes "an active benchmark can't be silently
-- modified" a guarantee instead of a convention -- see the eval_cases
-- policies below.

-- eval_datasets ------------------------------------------------------------
alter table eval_datasets enable row level security;

create policy "eval_datasets_select_staff" on eval_datasets
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_datasets_insert_staff" on eval_datasets
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "eval_datasets_update_staff" on eval_datasets
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- eval_cases ------------------------------------------------------------------
alter table eval_cases enable row level security;

create policy "eval_cases_select_staff" on eval_cases
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_cases_insert_staff_draft_only" on eval_cases
  for insert with check (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

create policy "eval_cases_update_staff_draft_only" on eval_cases
  for update using (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  ) with check (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

create policy "eval_cases_delete_staff_draft_only" on eval_cases
  for delete using (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

-- eval_runs -----------------------------------------------------------------
alter table eval_runs enable row level security;

create policy "eval_runs_select_staff" on eval_runs
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_runs_insert_staff" on eval_runs
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "eval_runs_update_staff" on eval_runs
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- eval_results ------------------------------------------------------------------
alter table eval_results enable row level security;

create policy "eval_results_select_staff" on eval_results
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_results_insert_staff" on eval_results
  for insert with check (is_curator_or_admin(auth.uid()));

-- Update is allowed (unlike wiki_versions) because eval_results rows are
-- where human review lands (human_* columns) -- that's an intentional
-- in-place update of an existing row, not a rewrite of history the way
-- editing approved Wiki content is.
create policy "eval_results_update_staff" on eval_results
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));
