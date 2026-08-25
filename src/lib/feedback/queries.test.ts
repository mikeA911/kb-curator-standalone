import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const { isPlatformOwner, updateFeedbackReport } = await import('./queries')

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>): WorkbenchCallerContext {
  return { user: { id: 'user-1' }, profile: {}, supabase } as unknown as WorkbenchCallerContext
}

describe('isPlatformOwner', () => {
  it('is true when a platform_owners row exists for the caller', async () => {
    const supabase = createFakeSupabase({ platform_owners: [{ data: { user_id: 'user-1' }, error: null }] })
    expect(await isPlatformOwner(fakeCtx(supabase))).toBe(true)
  })

  it('is false when no row exists', async () => {
    const supabase = createFakeSupabase({ platform_owners: [{ data: null, error: null }] })
    expect(await isPlatformOwner(fakeCtx(supabase))).toBe(false)
  })
})

describe('updateFeedbackReport', () => {
  it('refuses a non-owner -- a friendlier error than an opaque RLS denial', async () => {
    const supabase = createFakeSupabase({ platform_owners: [{ data: null, error: null }] })
    await expect(updateFeedbackReport(fakeCtx(supabase), 'report-1', { status: 'triaged' })).rejects.toThrow(/authorized owner/)
  })

  it('writes a status_history row only when the status actually changes, with from/to and the actor', async () => {
    const supabase = createFakeSupabase({
      platform_owners: [{ data: { user_id: 'user-1' }, error: null }],
      feedback_reports: [{ data: { status: 'new' }, error: null }, { data: null, error: null }],
      feedback_report_status_history: [{ data: null, error: null }],
    })

    await updateFeedbackReport(fakeCtx(supabase), 'report-1', { status: 'triaged', statusChangeReason: 'looks real' })

    const historyInsert = supabase._calls.find((c) => c.table === 'feedback_report_status_history' && c.method === 'insert')
    expect(historyInsert?.args).toMatchObject({
      feedback_report_id: 'report-1',
      from_status: 'new',
      to_status: 'triaged',
      changed_by: 'user-1',
      reason: 'looks real',
    })
  })

  it('does not write a status_history row when status is unchanged', async () => {
    const supabase = createFakeSupabase({
      platform_owners: [{ data: { user_id: 'user-1' }, error: null }],
      feedback_reports: [{ data: { status: 'triaged' }, error: null }, { data: null, error: null }],
    })

    await updateFeedbackReport(fakeCtx(supabase), 'report-1', { status: 'triaged', severity: 'high' })

    expect(supabase._calls.find((c) => c.table === 'feedback_report_status_history')).toBeUndefined()
    const updateCall = supabase._calls.find((c) => c.table === 'feedback_reports' && c.method === 'update')
    expect(updateCall?.args).toMatchObject({ status: 'triaged', severity: 'high' })
  })
})
