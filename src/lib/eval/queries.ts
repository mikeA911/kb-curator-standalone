import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Review is tracked per-result (eval_results.human_reviewed_at), not per-run
// -- there's no run-level "reviewed" flag. needReview counts completed runs
// that have at least one unreviewed result, which is the closest run-level
// reading of "needs review" the schema actually supports.
export async function getEvalStats(supabase: SupabaseClient<Database>) {
  const { data: runs, error: runsError } = await supabase.from('eval_runs').select('id, status')
  if (runsError) throw runsError
  const rows = runs ?? []
  const totalRuns = rows.length
  const completedRunIds = rows.filter((r) => r.status === 'completed').map((r) => r.id)

  if (completedRunIds.length === 0) return { totalRuns, needReview: 0 }

  const { data: unreviewed, error: resultsError } = await supabase
    .from('eval_results')
    .select('eval_run_id')
    .in('eval_run_id', completedRunIds)
    .is('human_reviewed_at', null)
  if (resultsError) throw resultsError

  const needReview = new Set((unreviewed ?? []).map((r) => r.eval_run_id)).size
  return { totalRuns, needReview }
}
