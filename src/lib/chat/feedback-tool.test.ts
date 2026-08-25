import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const { runSubmitFeedbackReport } = await import('./feedback-tool')

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>): WorkbenchCallerContext {
  return { user: { id: 'user-1' }, profile: {}, supabase } as unknown as WorkbenchCallerContext
}

describe('runSubmitFeedbackReport', () => {
  it('inserts a feedback_reports row scoped to the caller, the submission context, and returns the report number/status', async () => {
    const supabase = createFakeSupabase({
      feedback_reports: [{ data: { report_number: 42, status: 'new' }, error: null }],
    })

    const result = await runSubmitFeedbackReport(
      fakeCtx(supabase),
      { category: 'bug', currentPage: '/projects/abc123', conversationId: 'conv-1' },
      { title: 'Broken save button', description: 'Clicking Save does nothing on the project page.' }
    )

    expect(result).toEqual({ reportNumber: 42, status: 'new' })
    const insertCall = supabase._calls.find((c) => c.table === 'feedback_reports' && c.method === 'insert')
    expect(insertCall?.args).toMatchObject({
      reporter_id: 'user-1',
      source_conversation_id: 'conv-1',
      type: 'bug',
      title: 'Broken save button',
      description: 'Clicking Save does nothing on the project page.',
      current_page: '/projects/abc123',
    })
  })

  it('rejects a submission with no title or description -- the model must draft something usable before calling this', async () => {
    const supabase = createFakeSupabase({})

    await expect(
      runSubmitFeedbackReport(fakeCtx(supabase), { category: 'feature_request', currentPage: '/wiki', conversationId: 'conv-2' }, { title: '', description: '' })
    ).rejects.toThrow()

    expect(supabase._calls.find((c) => c.table === 'feedback_reports')).toBeUndefined()
  })

  it('passes through optional fields only when provided', async () => {
    const supabase = createFakeSupabase({
      feedback_reports: [{ data: { report_number: 7, status: 'new' }, error: null }],
    })

    await runSubmitFeedbackReport(
      fakeCtx(supabase),
      { category: 'improvement', currentPage: '/dashboard', conversationId: 'conv-3' },
      {
        title: 'Faster search',
        description: 'Search feels slow.',
        expectedResult: 'Results in under a second',
        actualResult: 'Takes 5+ seconds',
        impact: 'Slows down daily use',
        reproductionSteps: 'Search for any term',
      }
    )

    const insertCall = supabase._calls.find((c) => c.table === 'feedback_reports' && c.method === 'insert')
    expect(insertCall?.args).toMatchObject({
      expected_result: 'Results in under a second',
      actual_result: 'Takes 5+ seconds',
      impact: 'Slows down daily use',
      reproduction_steps: 'Search for any term',
    })
  })
})
