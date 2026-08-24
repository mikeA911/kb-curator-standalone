import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { upsertApprovalPolicy, grantAuthorityAssignment, revokeAuthorityAssignment, listProjectGovernance } from './governance'
import type { WorkbenchCallerContext } from './context'

function ctxWith(supabase: unknown): WorkbenchCallerContext {
  return { user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase } as unknown as WorkbenchCallerContext
}

describe('upsertApprovalPolicy', () => {
  it('rejects an anonymous session', async () => {
    const supabase = createFakeSupabase({})
    const ctx = { user: { id: 'u' }, profile: { role: 'anonymous' }, supabase } as unknown as WorkbenchCallerContext
    await expect(
      upsertApprovalPolicy(ctx, 'project-1', { approvalType: 'technical', requirementStatus: 'required' })
    ).rejects.toThrow('Create an account')
  })

  it('upserts on (project_id, approval_type) so re-running never duplicates a policy row', async () => {
    const supabase = createFakeSupabase({ project_approval_policies: [{ data: null, error: null }] })
    await upsertApprovalPolicy(ctxWith(supabase), 'project-1', { approvalType: 'commercial', requirementStatus: 'optional' })

    const upsert = supabase._calls.find((c) => c.table === 'project_approval_policies' && c.method === 'upsert')
    expect((upsert?.args as { approval_type: string; requirement_status: string }).approval_type).toBe('commercial')
    expect((upsert?.args as { requirement_status: string }).requirement_status).toBe('optional')
  })
})

describe('grantAuthorityAssignment', () => {
  it('records the granting user and defaults status to active', async () => {
    const supabase = createFakeSupabase({ project_authority_assignments: [{ data: null, error: null }] })
    await grantAuthorityAssignment(ctxWith(supabase), 'project-1', { userId: 'user-2', approvalType: 'pricing' })

    const insert = supabase._calls.find((c) => c.table === 'project_authority_assignments' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ project_id: 'project-1', user_id: 'user-2', approval_type: 'pricing', status: 'active', granted_by: 'user-1' })
  })
})

describe('revokeAuthorityAssignment', () => {
  it('flips status to revoked and records who/why rather than deleting the row', async () => {
    const supabase = createFakeSupabase({ project_authority_assignments: [{ data: null, error: null }] })
    await revokeAuthorityAssignment(ctxWith(supabase), 'assignment-1', 'No longer with the client team')

    const update = supabase._calls.find((c) => c.table === 'project_authority_assignments' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'revoked', revoked_by: 'user-1', revocation_reason: 'No longer with the client team' })
  })
})

describe('listProjectGovernance', () => {
  it('returns policies and assignments together', async () => {
    const supabase = createFakeSupabase({
      project_approval_policies: [{ data: [{ id: 'policy-1' }], error: null }],
      project_authority_assignments: [{ data: [{ id: 'assignment-1' }], error: null }],
    })
    const result = await listProjectGovernance(ctxWith(supabase), 'project-1')
    expect(result).toEqual({ policies: [{ id: 'policy-1' }], assignments: [{ id: 'assignment-1' }] })
  })
})
