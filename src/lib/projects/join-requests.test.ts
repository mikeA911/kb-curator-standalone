import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

const { requestProjectJoin, decideProjectJoinRequest } = await import('./join-requests')

beforeEach(() => {
  createAdminClientMock.mockReset()
})

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>, userId = 'requester-1'): WorkbenchCallerContext {
  return { user: { id: userId }, profile: { role: 'consultant', email: `${userId}@example.com` }, supabase } as unknown as WorkbenchCallerContext
}

describe('requestProjectJoin', () => {
  it('does not create a duplicate request or notification when one is already pending', async () => {
    const supabase = createFakeSupabase({
      project_join_requests: [{ data: { id: 'req-existing' }, error: null }], // existing pending check
    })

    const result = await requestProjectJoin(fakeCtx(supabase), { projectId: 'proj-1' })

    expect(result).toEqual({ requestId: 'req-existing', alreadyRequested: true })
    expect(supabase._calls.find((c) => c.table === 'project_join_requests' && c.method === 'insert')).toBeUndefined()
  })

  it('rejects a request for someone who is already an active member', async () => {
    const supabase = createFakeSupabase({
      project_join_requests: [{ data: null, error: null }], // no existing pending request
      project_members: [{ data: { id: 'member-1' }, error: null }], // already an active member
    })

    await expect(requestProjectJoin(fakeCtx(supabase), { projectId: 'proj-1' })).rejects.toThrow('already a member')
  })

  it('rejects a request for a project that is not discoverable', async () => {
    const supabase = createFakeSupabase({
      project_join_requests: [{ data: null, error: null }],
      project_members: [{ data: null, error: null }],
    })
    const admin = createFakeSupabase({
      projects: [{ data: { owner_id: 'owner-1', discoverability: 'members_only', name: 'Test Project' }, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    await expect(requestProjectJoin(fakeCtx(supabase), { projectId: 'proj-1' })).rejects.toThrow('not open to join requests')
  })

  it('creates a request and notifies the project owner', async () => {
    const supabase = createFakeSupabase({
      project_join_requests: [
        { data: null, error: null }, // no existing pending request
        { data: { id: 'req-1' }, error: null }, // insert result
      ],
      project_members: [{ data: null, error: null }], // not already a member
    })
    const admin = createFakeSupabase({
      projects: [{ data: { owner_id: 'owner-1', discoverability: 'platform', name: 'Test Project' }, error: null }],
      project_notes: [{ data: { id: 'note-1' }, error: null }],
      project_join_requests: [{ data: null, error: null }], // note_id update
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await requestProjectJoin(fakeCtx(supabase), { projectId: 'proj-1' })

    expect(result).toEqual({ requestId: 'req-1', alreadyRequested: false })
    const noteInsert = admin._calls.find((c) => c.table === 'project_notes' && c.method === 'insert')
    expect(noteInsert?.args).toMatchObject({ recipient_type: 'user', recipient_user_id: 'owner-1', context_type: 'project_join_request', context_id: 'req-1' })
    const noteIdUpdate = admin._calls.find((c) => c.table === 'project_join_requests' && c.method === 'update')
    expect(noteIdUpdate?.args).toMatchObject({ note_id: 'note-1' })
  })
})

describe('decideProjectJoinRequest', () => {
  it('approving adds the requester as an active viewer, and notifies them', async () => {
    const supabase = createFakeSupabase({
      project_join_requests: [
        { data: { id: 'req-1', project_id: 'proj-1', requester_id: 'requester-1', status: 'pending', note_id: 'note-1' }, error: null }, // fetch request
        { data: [{ id: 'req-1' }], error: null }, // decision update
      ],
      project_members: [{ data: null, error: null }], // insert member
    })
    const admin = createFakeSupabase({
      project_notes: [
        { data: null, error: null }, // resolve original note
        { data: { id: 'outcome-note-1' }, error: null }, // outcome note insert
      ],
      project_join_requests: [{ data: null, error: null }], // outcome_note_id update
    })
    createAdminClientMock.mockReturnValue(admin)

    await decideProjectJoinRequest(fakeCtx(supabase, 'owner-1'), { requestId: 'req-1', decision: 'approved' })

    const memberInsert = supabase._calls.find((c) => c.table === 'project_members' && c.method === 'insert')
    expect(memberInsert?.args).toMatchObject({ project_id: 'proj-1', user_id: 'requester-1', role: 'viewer', status: 'active' })

    const decisionUpdate = supabase._calls.filter((c) => c.table === 'project_join_requests' && c.method === 'update')[0]
    expect(decisionUpdate?.args).toMatchObject({ status: 'approved' })

    const outcomeNoteInsert = admin._calls.filter((c) => c.table === 'project_notes' && c.method === 'insert')[0]
    expect(outcomeNoteInsert?.args).toMatchObject({ recipient_user_id: 'requester-1', subject: 'Join request approved' })
  })

  it('declining does not add a member, but still notifies the requester with the reason', async () => {
    const supabase = createFakeSupabase({
      project_join_requests: [
        { data: { id: 'req-1', project_id: 'proj-1', requester_id: 'requester-1', status: 'pending', note_id: 'note-1' }, error: null },
        { data: [{ id: 'req-1' }], error: null },
      ],
    })
    const admin = createFakeSupabase({
      project_notes: [
        { data: null, error: null },
        { data: { id: 'outcome-note-1' }, error: null },
      ],
      project_join_requests: [{ data: null, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    await decideProjectJoinRequest(fakeCtx(supabase, 'owner-1'), { requestId: 'req-1', decision: 'declined', reason: 'Wrong team' })

    expect(supabase._calls.find((c) => c.table === 'project_members')).toBeUndefined()

    const outcomeNoteInsert = admin._calls.filter((c) => c.table === 'project_notes' && c.method === 'insert')[0]
    expect(outcomeNoteInsert?.args).toMatchObject({ subject: 'Join request declined' })
    expect((outcomeNoteInsert?.args as { body: string }).body).toContain('Wrong team')
  })

  it('is a no-op on a request that has already been decided', async () => {
    const supabase = createFakeSupabase({
      project_join_requests: [
        { data: { id: 'req-1', project_id: 'proj-1', requester_id: 'requester-1', status: 'approved', note_id: 'note-1' }, error: null },
      ],
    })

    await decideProjectJoinRequest(fakeCtx(supabase, 'owner-1'), { requestId: 'req-1', decision: 'declined' })

    expect(supabase._calls.filter((c) => c.method === 'update' || c.method === 'insert')).toHaveLength(0)
  })
})
