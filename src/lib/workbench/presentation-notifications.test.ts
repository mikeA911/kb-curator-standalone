import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const createProjectNoteMock = vi.fn()
vi.mock('@/lib/projects/notes', () => ({ createProjectNote: (...args: unknown[]) => createProjectNoteMock(...args) }))

const { notifyReviewOpened, notifySubmittedForCuratorReview, notifyApproved } = await import('./presentation-notifications')

beforeEach(() => {
  createProjectNoteMock.mockReset()
  createProjectNoteMock.mockResolvedValue({ noteId: 'note-1' })
})

describe('notifyReviewOpened', () => {
  it('notifies every active project member except the acting author', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1', name: 'CCTV Rollout' }, error: null }],
      project_members: [{ data: [{ user_id: 'author-1' }, { user_id: 'member-2' }, { user_id: 'member-3' }], error: null }],
    }) as never
    await notifyReviewOpened(
      supabase,
      { id: 'author-1', role: 'curator' },
      { presentationId: 'presentation-1', workstreamId: 'ws-1', reviewDeadline: null }
    )
    expect(createProjectNoteMock).toHaveBeenCalledTimes(2)
    const recipients = createProjectNoteMock.mock.calls.map((call) => (call[2] as { recipientUserId: string }).recipientUserId)
    expect(recipients.sort()).toEqual(['member-2', 'member-3'])
  })

  it('does nothing when the workstream no longer exists', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: null, error: null }] }) as never
    await notifyReviewOpened(supabase, { id: 'author-1', role: 'curator' }, { presentationId: 'p1', workstreamId: 'ws-1', reviewDeadline: null })
    expect(createProjectNoteMock).not.toHaveBeenCalled()
  })
})

describe('notifySubmittedForCuratorReview', () => {
  it('notifies only active owner/curator members', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1', name: 'CCTV Rollout' }, error: null }],
      project_members: [{ data: [{ user_id: 'curator-2' }], error: null }],
    }) as never
    await notifySubmittedForCuratorReview(supabase, { id: 'author-1', role: 'consultant' }, { presentationId: 'p1', workstreamId: 'ws-1' })
    expect(createProjectNoteMock).toHaveBeenCalledTimes(1)
    expect(createProjectNoteMock.mock.calls[0][2]).toMatchObject({ recipientUserId: 'curator-2', subject: 'Presentation ready for approval' })
  })
})

describe('notifyApproved', () => {
  it('notifies only the presentation creator', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1', name: 'CCTV Rollout' }, error: null }],
    }) as never
    await notifyApproved(supabase, { id: 'approver-1', role: 'curator' }, { presentationId: 'p1', workstreamId: 'ws-1', createdBy: 'creator-9' })
    expect(createProjectNoteMock).toHaveBeenCalledTimes(1)
    expect(createProjectNoteMock.mock.calls[0][2]).toMatchObject({ recipientUserId: 'creator-9', subject: 'Presentation approved' })
  })

  it('does nothing when createdBy is null', async () => {
    const supabase = createFakeSupabase({}) as never
    await notifyApproved(supabase, { id: 'approver-1', role: 'curator' }, { presentationId: 'p1', workstreamId: 'ws-1', createdBy: null })
    expect(createProjectNoteMock).not.toHaveBeenCalled()
  })
})
