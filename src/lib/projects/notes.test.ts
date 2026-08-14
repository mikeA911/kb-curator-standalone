import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { listProjectNotes, getProjectNote, listNoteReplies, listNotesForUser } from './notes'

describe('listProjectNotes', () => {
  it('merges each note with its author and (when recipient_type is user) its recipient', async () => {
    const supabase = createFakeSupabase({
      project_notes: [
        {
          data: [
            {
              id: 'n-1',
              project_id: 'p-1',
              author_id: 'u-1',
              recipient_type: 'user',
              recipient_user_id: 'u-2',
              subject: 'Retrieval regression',
              body: 'Hit@K dropped on the new dataset version.',
              context_type: 'eval_run',
              context_id: 'run-1',
              status: 'open',
              created_at: '2026-01-01',
              resolved_at: null,
              resolved_by: null,
            },
          ],
          error: null,
        },
      ],
      profiles: [
        {
          data: [
            { id: 'u-1', email: 'author@example.com' },
            { id: 'u-2', email: 'recipient@example.com' },
          ],
          error: null,
        },
      ],
    })

    const notes = await listProjectNotes(supabase as never, 'p-1')

    expect(notes).toHaveLength(1)
    expect(notes[0].author).toEqual({ id: 'u-1', email: 'author@example.com' })
    expect(notes[0].recipientUser).toEqual({ id: 'u-2', email: 'recipient@example.com' })
  })

  it('short-circuits to [] when there are no notes', async () => {
    const supabase = createFakeSupabase({ project_notes: [{ data: [], error: null }] })
    expect(await listProjectNotes(supabase as never, 'p-1')).toEqual([])
  })

  it('degrades to null author/recipientUser rather than throwing when a profile is missing', async () => {
    const supabase = createFakeSupabase({
      project_notes: [
        {
          data: [
            {
              id: 'n-1',
              project_id: 'p-1',
              author_id: 'deleted-user',
              recipient_type: 'project_team',
              recipient_user_id: null,
              subject: 'X',
              body: 'Y',
              context_type: null,
              context_id: null,
              status: 'open',
              created_at: '2026-01-01',
              resolved_at: null,
              resolved_by: null,
            },
          ],
          error: null,
        },
      ],
      profiles: [{ data: [], error: null }],
    })

    const notes = await listProjectNotes(supabase as never, 'p-1')
    expect(notes[0].author).toBeNull()
    expect(notes[0].recipientUser).toBeNull()
  })
})

describe('getProjectNote', () => {
  it('returns null (not throw) when nothing matches -- maybeSingle semantics', async () => {
    const supabase = createFakeSupabase({ project_notes: [{ data: null, error: null }] })
    expect(await getProjectNote(supabase as never, 'missing')).toBeNull()
  })
})

describe('listNoteReplies', () => {
  it('short-circuits to [] when there are no replies', async () => {
    const supabase = createFakeSupabase({ project_note_replies: [{ data: [], error: null }] })
    expect(await listNoteReplies(supabase as never, 'n-1')).toEqual([])
  })

  it('merges each reply with its author via a second query', async () => {
    const supabase = createFakeSupabase({
      project_note_replies: [
        { data: [{ id: 'r-1', note_id: 'n-1', author_id: 'u-1', body: 'Looking into it', created_at: '2026-01-02' }], error: null },
      ],
      profiles: [{ data: [{ id: 'u-1', email: 'curator@example.com' }], error: null }],
    })

    const replies = await listNoteReplies(supabase as never, 'n-1')

    expect(replies).toEqual([
      { id: 'r-1', note_id: 'n-1', author_id: 'u-1', body: 'Looking into it', created_at: '2026-01-02', author: { id: 'u-1', email: 'curator@example.com' } },
    ])
  })
})

describe('listNotesForUser', () => {
  it('returns whatever the narrow author-or-addressed-recipient query resolves to', async () => {
    const supabase = createFakeSupabase({
      project_notes: [
        {
          data: [
            {
              id: 'n-1',
              project_id: 'p-1',
              author_id: 'u-1',
              recipient_type: 'user',
              recipient_user_id: 'u-1',
              subject: 'X',
              body: 'Y',
              context_type: null,
              context_id: null,
              status: 'open',
              created_at: '2026-01-01',
              resolved_at: null,
              resolved_by: null,
            },
          ],
          error: null,
        },
      ],
      profiles: [{ data: [{ id: 'u-1', email: 'me@example.com' }], error: null }],
    })

    const notes = await listNotesForUser(supabase as never, 'u-1')
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('n-1')
  })
})
