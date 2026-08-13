import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getAgentStats } from './queries'

describe('getAgentStats', () => {
  it('counts total agents and how many are active', async () => {
    const supabase = createFakeSupabase({
      agents: [{ data: [{ status: 'active' }, { status: 'draft' }, { status: 'active' }, { status: 'archived' }], error: null }],
    }) as never

    const result = await getAgentStats(supabase)

    expect(result).toEqual({ total: 4, active: 2 })
  })
})
