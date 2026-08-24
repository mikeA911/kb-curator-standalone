import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { listProjectsWithMissingAuthorities } from './queries'

describe('listProjectsWithMissingAuthorities', () => {
  it('flags a required policy with no active assignment', async () => {
    const supabase = createFakeSupabase({
      project_approval_policies: [{ data: [{ project_id: 'p1', approval_type: 'commercial' }], error: null }],
      project_authority_assignments: [{ data: [], error: null }],
      projects: [{ data: [{ id: 'p1', name: 'Client Rollout' }], error: null }],
    })
    const result = await listProjectsWithMissingAuthorities(supabase as never)
    expect(result).toEqual([{ id: 'p1', name: 'Client Rollout', missingApprovalTypes: ['commercial'] }])
  })

  it('does not flag a required policy that has an active, unexpired assignment', async () => {
    const supabase = createFakeSupabase({
      project_approval_policies: [{ data: [{ project_id: 'p1', approval_type: 'commercial' }], error: null }],
      project_authority_assignments: [
        { data: [{ project_id: 'p1', approval_type: 'commercial', status: 'active', expires_at: null }], error: null },
      ],
    })
    const result = await listProjectsWithMissingAuthorities(supabase as never)
    expect(result).toEqual([])
  })

  it('treats an expired assignment as still missing', async () => {
    const supabase = createFakeSupabase({
      project_approval_policies: [{ data: [{ project_id: 'p1', approval_type: 'commercial' }], error: null }],
      project_authority_assignments: [
        {
          data: [{ project_id: 'p1', approval_type: 'commercial', status: 'active', expires_at: '2020-01-01T00:00:00Z' }],
          error: null,
        },
      ],
      projects: [{ data: [{ id: 'p1', name: 'Client Rollout' }], error: null }],
    })
    const result = await listProjectsWithMissingAuthorities(supabase as never)
    expect(result).toEqual([{ id: 'p1', name: 'Client Rollout', missingApprovalTypes: ['commercial'] }])
  })
})
