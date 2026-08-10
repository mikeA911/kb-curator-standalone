-- Additive consultant access to Evals, per the UI/Roles brief's permission
-- matrix: consultants may view active benchmarks, run evaluations against
-- them, and view results -- but never author/edit cases, activate/archive
-- datasets, or mark baselines (those stay curator/admin, unchanged in
-- 20260809110004_eval_rls.sql). Every policy here is scoped to datasets with
-- status = 'active' -- a consultant can never see or run against a draft
-- benchmark still being authored. Anonymous sessions get nothing (not
-- referenced by any of these policies).

create policy "eval_datasets_select_active_consultant" on eval_datasets
  for select using (
    status = 'active'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_cases_select_active_consultant" on eval_cases
  for select using (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_runs_select_active_consultant" on eval_runs
  for select using (
    exists (select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_runs_insert_active_consultant" on eval_runs
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_results_select_active_consultant" on eval_results
  for select using (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_results_insert_active_consultant" on eval_results
  for insert with check (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );
