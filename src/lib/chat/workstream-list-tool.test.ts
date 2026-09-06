import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const { runListWorkstreams } = await import('./workstream-list-tool')

function fakeCtx(supabase: unknown): WorkbenchCallerContext {
  return { user: { id: 'viewer-1' }, profile: { id: 'viewer-1', role: 'consultant' }, supabase } as unknown as WorkbenchCallerContext
}

describe('runListWorkstreams', () => {
  it('returns each workstream with its real id, name, slug, and status', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [
        {
          data: [
            { id: 'ws-1', name: 'Phase 1 -- Showcase', slug: 'phase-1-showcase', status: 'draft' },
            { id: 'ws-2', name: 'Phase 2 -- Design Partner', slug: 'phase-2-design-partner', status: 'active' },
          ],
          error: null,
        },
      ],
    })

    const result = await runListWorkstreams(fakeCtx(supabase), 'proj-1')

    expect(result).toEqual({
      workstreams: [
        { id: 'ws-1', name: 'Phase 1 -- Showcase', slug: 'phase-1-showcase', status: 'draft' },
        { id: 'ws-2', name: 'Phase 2 -- Design Partner', slug: 'phase-2-design-partner', status: 'active' },
      ],
    })
  })

  it('returns an empty list when the project has no workstreams', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: [], error: null }] })

    const result = await runListWorkstreams(fakeCtx(supabase), 'proj-1')

    expect(result).toEqual({ workstreams: [] })
  })

  it('throws when the query errors', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: null, error: new Error('boom') }] })

    await expect(runListWorkstreams(fakeCtx(supabase), 'proj-1')).rejects.toBeTruthy()
  })
})
