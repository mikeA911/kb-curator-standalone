import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getEvalStats } from './queries'

describe('getEvalStats', () => {
  it('counts completed runs that have at least one unreviewed result', async () => {
    const supabase = createFakeSupabase({
      eval_runs: [
        {
          data: [
            { id: 'run-1', status: 'completed' },
            { id: 'run-2', status: 'completed' },
            { id: 'run-3', status: 'failed' },
            { id: 'run-4', status: 'pending' },
          ],
          error: null,
        },
      ],
      eval_results: [
        {
          // run-1 has an unreviewed result; run-2's only result is reviewed
          data: [{ eval_run_id: 'run-1' }],
          error: null,
        },
      ],
    }) as never

    const result = await getEvalStats(supabase)

    expect(result).toEqual({ totalRuns: 4, needReview: 1 })
  })

  it('skips the results query entirely when there are no completed runs', async () => {
    // eval_results is queued to error if touched at all -- proves the early
    // return actually happens rather than just coincidentally returning 0.
    const supabase = createFakeSupabase({
      eval_runs: [{ data: [{ id: 'run-1', status: 'pending' }], error: null }],
      eval_results: [{ data: null, error: new Error('should not be queried') }],
    }) as never

    const result = await getEvalStats(supabase)

    expect(result).toEqual({ totalRuns: 1, needReview: 0 })
  })
})
