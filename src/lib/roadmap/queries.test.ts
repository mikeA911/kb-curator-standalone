import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const { updateRoadmapItem } = await import('./queries')

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>): WorkbenchCallerContext {
  return { user: { id: 'user-1' }, profile: {}, supabase } as unknown as WorkbenchCallerContext
}

describe('updateRoadmapItem', () => {
  it('refuses a non-owner -- a friendlier error than an opaque RLS denial', async () => {
    const supabase = createFakeSupabase({ platform_owners: [{ data: null, error: null }] })
    await expect(updateRoadmapItem(fakeCtx(supabase), 'item-1', { status: 'done' })).rejects.toThrow(/authorized owner/)
  })

  it('updates only the fields provided', async () => {
    const supabase = createFakeSupabase({
      platform_owners: [{ data: { user_id: 'user-1' }, error: null }],
      roadmap_items: [{ data: {}, error: null }],
    })

    await updateRoadmapItem(fakeCtx(supabase), 'item-1', { status: 'done' })

    const updateCall = supabase._calls.find((c) => c.table === 'roadmap_items' && c.method === 'update')
    expect(updateCall?.args).toEqual({ status: 'done' })
  })

  it('allows clearing decision_next_action back to null explicitly', async () => {
    const supabase = createFakeSupabase({
      platform_owners: [{ data: { user_id: 'user-1' }, error: null }],
      roadmap_items: [{ data: {}, error: null }],
    })

    await updateRoadmapItem(fakeCtx(supabase), 'item-1', { decisionNextAction: null })

    const updateCall = supabase._calls.find((c) => c.table === 'roadmap_items' && c.method === 'update')
    expect(updateCall?.args).toEqual({ decision_next_action: null })
  })
})
