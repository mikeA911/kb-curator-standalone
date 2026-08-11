-- Missed in 20260811100001: runCaseViaGraph's own graph_runs status
-- transitions (pending -> running -> completed/failed, plus
-- termination_reason/error_code/final_output/iteration_count) run as UPDATE
-- statements using the caller's session -- with no UPDATE policy on
-- graph_runs at all, every one of those updates was silently blocked by
-- RLS, leaving every graph run permanently stuck at status='running' even
-- though its eval_results row (success or failure) was inserted correctly.
-- Confirmed live: a full benchmark run's graph_runs all showed
-- status='running'/completed_at=null after the eval run itself completed.
-- This is the exact same bug class already hit and fixed once this session
-- for eval_runs (20260810100005_eval_runs_update_consultant.sql) -- same
-- fix shape, mirrored for graph_runs: one policy for platform staff
-- (unrestricted, matching eval_runs_update_staff), one scoped to the
-- consultant's own run (created_by = auth.uid()), matching
-- eval_runs_update_own_consultant.
create policy "graph_runs_update_staff" on graph_runs
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

create policy "graph_runs_update_own_consultant" on graph_runs
  for update using (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  )
  with check (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );
