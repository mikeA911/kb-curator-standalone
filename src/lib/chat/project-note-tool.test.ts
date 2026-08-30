import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { runSendProjectNote } from './project-note-tool'

function fakeCtx(supabase: unknown): WorkbenchCallerContext {
  return { user: { id: 'author-1' }, profile: { id: 'author-1', role: 'consultant' }, supabase } as unknown as WorkbenchCallerContext
}

describe('runSendProjectNote', () => {
  it('rejects a recipient who is not an active member of this project, without inserting anything', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: null, error: null }] })

    await expect(
      runSendProjectNote(fakeCtx(supabase), 'proj-1', { recipientUserId: 'not-a-member', subject: 'X', body: 'Y' })
    ).rejects.toThrow('not an active member')

    expect(supabase._calls.some((c) => c.table === 'project_notes' && c.method === 'insert')).toBe(false)
  })

  it('inserts an addressed note for an active member and returns a route to it', async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { id: 'membership-2' }, error: null }],
      project_notes: [{ data: { id: 'note-1' }, error: null }],
    })

    const result = await runSendProjectNote(fakeCtx(supabase), 'proj-1', {
      recipientUserId: 'user-2',
      subject: 'Pricing question',
      body: 'Can you confirm the discount limit?',
    })

    expect(result).toEqual({ noteId: 'note-1', route: '/projects/proj-1/notes/note-1' })
    const insert = supabase._calls.find((c) => c.table === 'project_notes' && c.method === 'insert')
    expect(insert?.args).toEqual({
      project_id: 'proj-1',
      author_id: 'author-1',
      recipient_type: 'user',
      recipient_user_id: 'user-2',
      subject: 'Pricing question',
      body: 'Can you confirm the discount limit?',
      context_type: null,
      context_id: null,
    })
  })
})
