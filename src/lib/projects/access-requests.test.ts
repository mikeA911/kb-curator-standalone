import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

const { requestResourceAccess, decideResourceAccessRequest } = await import('./access-requests')

beforeEach(() => {
  createAdminClientMock.mockReset()
})

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>, userId = 'requester-1'): WorkbenchCallerContext {
  return { user: { id: userId }, profile: { role: 'consultant', email: `${userId}@example.com` }, supabase } as unknown as WorkbenchCallerContext
}

describe('requestResourceAccess', () => {
  it('does not create a duplicate request or notification when one is already pending', async () => {
    const supabase = createFakeSupabase({
      resource_access_requests: [{ data: { id: 'req-existing' }, error: null }], // existing pending check
    })

    const result = await requestResourceAccess(fakeCtx(supabase), {
      projectId: 'proj-1',
      resourceType: 'knowledge_source',
      resourceId: 'src-1',
    })

    expect(result).toEqual({ requestId: 'req-existing', alreadyRequested: true })
    expect(supabase._calls.find((c) => c.table === 'resource_access_requests' && c.method === 'insert')).toBeUndefined()
    expect(supabase._calls.find((c) => c.table === 'project_notes')).toBeUndefined()
  })

  it('addresses the notification to the access steward when one is set, else falls back to the project owner', async () => {
    const supabase = createFakeSupabase({
      resource_access_requests: [
        { data: null, error: null }, // no existing pending request
        { data: { id: 'req-1' }, error: null }, // insert result
      ],
      project_notes: [{ data: { id: 'note-1' }, error: null }],
    })
    const admin = createFakeSupabase({
      resource_access_policies: [{ data: { access_steward_user_id: 'steward-1' }, error: null }],
      projects: [{ data: { owner_id: 'owner-1' }, error: null }],
      resource_access_requests: [{ data: null, error: null }], // note_id update
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await requestResourceAccess(fakeCtx(supabase), {
      projectId: 'proj-1',
      resourceType: 'knowledge_source',
      resourceId: 'src-1',
    })

    expect(result).toEqual({ requestId: 'req-1', alreadyRequested: false })
    const noteInsert = supabase._calls.find((c) => c.table === 'project_notes' && c.method === 'insert')
    expect(noteInsert?.args).toMatchObject({
      recipient_type: 'user',
      recipient_user_id: 'steward-1',
      context_type: 'resource_access_request',
      context_id: 'req-1',
    })
    const noteIdUpdate = admin._calls.find((c) => c.table === 'resource_access_requests' && c.method === 'update')
    expect(noteIdUpdate?.args).toMatchObject({ note_id: 'note-1' })
  })
})

describe('decideResourceAccessRequest', () => {
  it('approving inserts a grant, resolves the decision note, and notifies the requester', async () => {
    const supabase = createFakeSupabase({
      resource_access_requests: [
        { data: { id: 'req-1', project_id: 'proj-1', resource_type: 'knowledge_source', resource_id: 'src-1', requester_id: 'requester-1', status: 'pending', note_id: 'note-1' }, error: null }, // fetch request
        { data: [{ id: 'req-1' }], error: null }, // decision update
        { data: null, error: null }, // outcome_note_id update
      ],
      project_members: [{ data: { id: 'member-1' }, error: null }],
      resource_access_policies: [{ data: { id: 'policy-1' }, error: null }],
      resource_access_grants: [{ data: null, error: null }],
      project_notes: [
        { data: null, error: null }, // resolve original note
        { data: { id: 'outcome-note-1' }, error: null }, // outcome note insert
      ],
    })
    const admin = createFakeSupabase({
      resource_access_audit_log: [{ data: null, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    await decideResourceAccessRequest(fakeCtx(supabase, 'owner-1'), { requestId: 'req-1', decision: 'approved' })

    const grantInsert = supabase._calls.find((c) => c.table === 'resource_access_grants' && c.method === 'insert')
    expect(grantInsert?.args).toMatchObject({ resource_access_policy_id: 'policy-1', project_member_id: 'member-1' })

    const decisionUpdate = supabase._calls.filter((c) => c.table === 'resource_access_requests' && c.method === 'update')[0]
    expect(decisionUpdate?.args).toMatchObject({ status: 'approved' })

    const outcomeNoteInsert = supabase._calls.filter((c) => c.table === 'project_notes' && c.method === 'insert')[0]
    expect(outcomeNoteInsert?.args).toMatchObject({ recipient_user_id: 'requester-1', subject: 'Access request approved' })
  })

  it('denying does not insert a grant, but still notifies the requester with the reason', async () => {
    const supabase = createFakeSupabase({
      resource_access_requests: [
        { data: { id: 'req-1', project_id: 'proj-1', resource_type: 'knowledge_source', resource_id: 'src-1', requester_id: 'requester-1', status: 'pending', note_id: 'note-1' }, error: null },
        { data: [{ id: 'req-1' }], error: null },
        { data: null, error: null },
      ],
      project_notes: [
        { data: null, error: null },
        { data: { id: 'outcome-note-1' }, error: null },
      ],
    })
    createAdminClientMock.mockReturnValue(createFakeSupabase({}))

    await decideResourceAccessRequest(fakeCtx(supabase, 'owner-1'), { requestId: 'req-1', decision: 'denied', reason: 'Not needed for this task' })

    expect(supabase._calls.find((c) => c.table === 'resource_access_grants')).toBeUndefined()
    expect(supabase._calls.find((c) => c.table === 'project_members')).toBeUndefined()

    const outcomeNoteInsert = supabase._calls.filter((c) => c.table === 'project_notes' && c.method === 'insert')[0]
    expect(outcomeNoteInsert?.args).toMatchObject({ subject: 'Access request denied' })
    expect((outcomeNoteInsert?.args as { body: string }).body).toContain('Not needed for this task')
  })

  it('is a no-op on a request that has already been decided', async () => {
    const supabase = createFakeSupabase({
      resource_access_requests: [
        { data: { id: 'req-1', project_id: 'proj-1', resource_type: 'knowledge_source', resource_id: 'src-1', requester_id: 'requester-1', status: 'approved', note_id: 'note-1' }, error: null },
      ],
    })

    await decideResourceAccessRequest(fakeCtx(supabase, 'owner-1'), { requestId: 'req-1', decision: 'denied' })

    expect(supabase._calls.filter((c) => c.method === 'update' || c.method === 'insert')).toHaveLength(0)
  })
})
