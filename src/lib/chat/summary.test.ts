import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const listMessagesMock = vi.fn()
const getActiveStructuredOutputProviderMock = vi.fn()

vi.mock('./conversations', () => ({
  listMessages: (...args: unknown[]) => listMessagesMock(...args),
}))
vi.mock('@/lib/ai', () => ({
  getActiveStructuredOutputProvider: (...args: unknown[]) => getActiveStructuredOutputProviderMock(...args),
}))

const { maybeRefreshSummary, getConversationSummary } = await import('./summary')

function fakeCtx(supabase: unknown): WorkbenchCallerContext {
  return { user: { id: 'user-1' }, profile: { id: 'user-1', role: 'curator' }, supabase } as unknown as WorkbenchCallerContext
}

function userRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `m${i}`, role: 'user', content: `q${i}`, tool_calls: null }))
}

beforeEach(() => {
  listMessagesMock.mockReset()
  getActiveStructuredOutputProviderMock.mockReset()
})

describe('getConversationSummary', () => {
  it('returns the stored summary_json', async () => {
    const supabase = createFakeSupabase({ conversations: [{ data: { summary_json: { objective: 'x' } }, error: null }] })
    expect(await getConversationSummary(supabase as never, 'conv-1')).toEqual({ objective: 'x' })
  })

  it('returns null when the conversation row is missing', async () => {
    const supabase = createFakeSupabase({ conversations: [{ data: null, error: null }] })
    expect(await getConversationSummary(supabase as never, 'conv-1')).toBeNull()
  })
})

describe('maybeRefreshSummary', () => {
  it('does nothing when fewer than 10 turns have passed and the context was not truncated', async () => {
    const supabase = createFakeSupabase({
      conversations: [{ data: { summary_json: null, summary_through_message_id: null }, error: null }],
    })
    listMessagesMock.mockResolvedValue(userRows(2))

    await maybeRefreshSummary(fakeCtx(supabase), 'conv-1', false)

    expect(getActiveStructuredOutputProviderMock).not.toHaveBeenCalled()
  })

  it('does nothing when there is no history yet, even if flagged as truncated', async () => {
    const supabase = createFakeSupabase({
      conversations: [{ data: { summary_json: null, summary_through_message_id: null }, error: null }],
    })
    listMessagesMock.mockResolvedValue([])

    await maybeRefreshSummary(fakeCtx(supabase), 'conv-1', true)

    expect(getActiveStructuredOutputProviderMock).not.toHaveBeenCalled()
  })

  it('refreshes once ~10 turns have passed since the last summary', async () => {
    const supabase = createFakeSupabase({
      conversations: [
        { data: { summary_json: null, summary_through_message_id: null }, error: null },
        { data: null, error: null },
      ],
    })
    listMessagesMock.mockResolvedValue(userRows(10))
    const generateStructured = vi.fn().mockResolvedValue({ data: { objective: 'o' }, model: 'test-model' })
    getActiveStructuredOutputProviderMock.mockResolvedValue({ name: 'groq', generateStructured })

    await maybeRefreshSummary(fakeCtx(supabase), 'conv-1', false)

    expect(generateStructured).toHaveBeenCalled()
  })

  it('refreshes immediately when the working context was truncated, even with few turns', async () => {
    const supabase = createFakeSupabase({
      conversations: [
        { data: { summary_json: null, summary_through_message_id: null }, error: null },
        { data: null, error: null },
      ],
    })
    listMessagesMock.mockResolvedValue(userRows(1))
    const generateStructured = vi.fn().mockResolvedValue({ data: { objective: 'o' }, model: 'test-model' })
    getActiveStructuredOutputProviderMock.mockResolvedValue({ name: 'groq', generateStructured })

    await maybeRefreshSummary(fakeCtx(supabase), 'conv-1', true)

    expect(generateStructured).toHaveBeenCalled()
  })

  it('never throws -- a generation failure is logged, not surfaced, mirroring embedApprovedVersion', async () => {
    const supabase = createFakeSupabase({
      conversations: [{ data: { summary_json: null, summary_through_message_id: null }, error: null }],
    })
    listMessagesMock.mockResolvedValue(userRows(10))
    getActiveStructuredOutputProviderMock.mockRejectedValue(new Error('provider down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(maybeRefreshSummary(fakeCtx(supabase), 'conv-1', false)).resolves.toBeUndefined()

    errorSpy.mockRestore()
  })

  it('does nothing when the conversation row lookup fails', async () => {
    const supabase = createFakeSupabase({ conversations: [{ data: null, error: new Error('not found') }] })

    await maybeRefreshSummary(fakeCtx(supabase), 'conv-1', true)

    expect(listMessagesMock).not.toHaveBeenCalled()
  })
})
