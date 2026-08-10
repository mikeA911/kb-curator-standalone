-- Missed in 20260810100004: executeEvalRun's own status transitions
-- (pending -> running -> completed/failed) run as UPDATE statements using the
-- caller's session -- when the caller is a consultant, those updates were
-- silently blocked by RLS (no matching UPDATE policy on eval_runs), leaving
-- every consultant-run evaluation permanently stuck at status='pending' even
-- though its results were inserted successfully (confirmed live: a
-- consultant test run showed real scores in the UI but status never left
-- 'pending'). Scoped to the consultant's own run (created_by = auth.uid()),
-- matching the ownership check already used by
-- eval_runs_insert_active_consultant.
create policy "eval_runs_update_own_consultant" on eval_runs
  for update using (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  )
  with check (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );
