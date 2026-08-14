import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireUserMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireUser: (...args: unknown[]) => requireUserMock(...args),
  }
})

const { createProjectNoteAction, replyToProjectNoteAction, resolveProjectNoteAction } = await import('./project-notes')

beforeEach(() => {
  requireUserMock.mockReset()
})

describe('createProjectNoteAction', () => {
  it('rejects an anonymous visitor -- requireUser alone does not exclude that role', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(
      createProjectNoteAction({ projectId: 'p-1', recipientType: 'project_team', subject: 'X', body: 'Y' })
    ).rejects.toThrow('Create an account')
  })

  it('rejects an empty subject', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant' } })
    await expect(
      createProjectNoteAction({ projectId: 'p-1', recipientType: 'project_team', subject: '  ', body: 'Y' })
    ).rejects.toThrow('Subject')
  })

  it('rejects an empty body', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant' } })
    await expect(
      createProjectNoteAction({ projectId: 'p-1', recipientType: 'project_team', subject: 'X', body: '  ' })
    ).rejects.toThrow('body')
  })

  it('requires a recipient user id when recipientType is user', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant' } })
    await expect(
      createProjectNoteAction({ projectId: 'p-1', recipientType: 'user', subject: 'X', body: 'Y' })
    ).rejects.toThrow('addressed to')
  })

  it('inserts through the RLS-scoped client, stamping author_id from the session, and trims subject/body', async () => {
    const supabase = createFakeSupabase({ project_notes: [{ data: { id: 'note-1' }, error: null }] })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    const result = await createProjectNoteAction({
      projectId: 'p-1',
      recipientType: 'user',
      recipientUserId: 'user-2',
      subject: '  Retrieval regression  ',
      body: '  Hit@K dropped.  ',
      contextType: 'eval_run',
      contextId: 'run-1',
    })

    expect(result).toEqual({ noteId: 'note-1' })
    const insert = supabase._calls.find((c) => c.table === 'project_notes' && c.method === 'insert')
    expect(insert?.args).toEqual({
      project_id: 'p-1',
      author_id: 'user-1',
      recipient_type: 'user',
      recipient_user_id: 'user-2',
      subject: 'Retrieval regression',
      body: 'Hit@K dropped.',
      context_type: 'eval_run',
      context_id: 'run-1',
    })
  })

  it('clears recipient_user_id when recipientType is not user, even if one was passed', async () => {
    const supabase = createFakeSupabase({ project_notes: [{ data: { id: 'note-1' }, error: null }] })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    await createProjectNoteAction({
      projectId: 'p-1',
      recipientType: 'project_team',
      recipientUserId: 'user-2',
      subject: 'X',
      body: 'Y',
    })

    const insert = supabase._calls.find((c) => c.table === 'project_notes' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ recipient_type: 'project_team', recipient_user_id: null })
  })
})

describe('replyToProjectNoteAction', () => {
  it('rejects an anonymous visitor', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(replyToProjectNoteAction('n-1', 'hello')).rejects.toThrow('Create an account')
  })

  it('rejects a blank reply', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant' } })
    await expect(replyToProjectNoteAction('n-1', '   ')).rejects.toThrow('empty')
  })

  it('inserts a trimmed reply stamped with the session author', async () => {
    const supabase = createFakeSupabase({
      project_notes: [{ data: { project_id: 'p-1' }, error: null }],
      project_note_replies: [{ data: null, error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    await replyToProjectNoteAction('n-1', '  Looking into it  ')

    const insert = supabase._calls.find((c) => c.table === 'project_note_replies' && c.method === 'insert')
    expect(insert?.args).toEqual({ note_id: 'n-1', author_id: 'user-1', body: 'Looking into it' })
  })
})

describe('resolveProjectNoteAction', () => {
  it('updates status to resolved and stamps resolved_by/resolved_at', async () => {
    const supabase = createFakeSupabase({
      project_notes: [{ data: { project_id: 'p-1' }, error: null }, { data: [{ id: 'n-1' }], error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator', id: 'user-1' }, supabase })

    await resolveProjectNoteAction('n-1')

    const update = supabase._calls.find((c) => c.table === 'project_notes' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'resolved', resolved_by: 'user-1' })
    expect((update?.args as { resolved_at: string }).resolved_at).toBeTruthy()
  })

  it('throws a clear error when RLS silently rejects the update (zero rows matched)', async () => {
    const supabase = createFakeSupabase({
      project_notes: [{ data: { project_id: 'p-1' }, error: null }, { data: [], error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    await expect(resolveProjectNoteAction('n-1')).rejects.toThrow('permission')
  })
})
