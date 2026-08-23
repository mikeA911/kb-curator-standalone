import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const listMessagesMock = vi.fn()

vi.mock('@/lib/chat/conversations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat/conversations')>('@/lib/chat/conversations')
  return { ...actual, listMessages: (...args: unknown[]) => listMessagesMock(...args) }
})

const { gatherJournalSource, generateJournalContent } = await import('./generate')

beforeEach(() => {
  listMessagesMock.mockReset()
})

describe('gatherJournalSource', () => {
  it('returns an empty source when there are no conversations in range', async () => {
    const supabase = createFakeSupabase({ conversations: [{ data: [], error: null }] })

    const result = await gatherJournalSource({ user: { id: 'user-1' }, profile: {}, supabase } as never, new Date('2026-07-21'))

    expect(result).toEqual({ conversations: [], evidence: '', truncated: false })
    expect(listMessagesMock).not.toHaveBeenCalled()
  })

  it('builds evidence from each conversation, skipping ones with no real messages', async () => {
    const supabase = createFakeSupabase({
      conversations: [
        {
          data: [
            { id: 'conv-1', title: 'Refactoring plan', last_message_at: '2026-08-01T00:00:00Z', created_at: '2026-08-01T00:00:00Z' },
            { id: 'conv-2', title: null, last_message_at: '2026-08-02T00:00:00Z', created_at: '2026-08-02T00:00:00Z' },
          ],
          error: null,
        },
      ],
    })
    listMessagesMock.mockImplementation(async (_supabase: unknown, conversationId: string) => {
      if (conversationId !== 'conv-1') return []
      return [
        { role: 'user', content: 'What method fits a refactor?', tool_calls: null, provider: null, model: null },
        { role: 'assistant', content: 'Document-First Engineering.', tool_calls: null, provider: 'groq', model: 'openai/gpt-oss-120b' },
      ]
    })

    const result = await gatherJournalSource({ user: { id: 'user-1' }, profile: {}, supabase } as never, new Date('2026-07-21'))

    expect(result.truncated).toBe(false)
    expect(result.conversations).toEqual([{ id: 'conv-1', title: 'Refactoring plan', date: '2026-08-01T00:00:00Z' }])
    expect(result.evidence).toContain('Refactoring plan')
    expect(result.evidence).toContain('Document-First Engineering.')
  })

  it('stops adding conversations once the evidence budget is exceeded and flags truncation', async () => {
    const supabase = createFakeSupabase({
      conversations: [
        {
          data: [
            { id: 'conv-1', title: 'Big one', last_message_at: '2026-08-01T00:00:00Z', created_at: '2026-08-01T00:00:00Z' },
            { id: 'conv-2', title: 'Small one', last_message_at: '2026-08-02T00:00:00Z', created_at: '2026-08-02T00:00:00Z' },
          ],
          error: null,
        },
      ],
    })
    listMessagesMock.mockImplementation(async (_supabase: unknown, conversationId: string) => [
      {
        role: 'user',
        content: conversationId === 'conv-1' ? 'x'.repeat(70000) : 'short',
        tool_calls: null,
        provider: null,
        model: null,
      },
    ])

    const result = await gatherJournalSource({ user: { id: 'user-1' }, profile: {}, supabase } as never, new Date('2026-07-21'))

    expect(result.truncated).toBe(true)
    expect(result.conversations).toEqual([])
  })
})

describe('generateJournalContent', () => {
  it('returns canned empty content without calling the provider when there is no source', async () => {
    const generateStructured = vi.fn()

    const result = await generateJournalContent(
      { name: 'groq', generateStructured } as never,
      { conversations: [], evidence: '', truncated: false },
      'last 30 days'
    )

    expect(generateStructured).not.toHaveBeenCalled()
    expect(result.narrative).toContain('No Assistant conversations were found for last 30 days')
  })

  it('delegates to the provider when there is source content', async () => {
    const generateStructured = vi.fn().mockResolvedValue({
      data: {
        narrative: 'Worked on refactoring.',
        projectsAndThemes: [],
        decisionsAndMilestones: [],
        lessonsAndChangedAssumptions: [],
        openQuestions: [],
        itemsToRevisit: [],
      },
      model: 'test-model',
    })
    const source = { conversations: [{ id: 'conv-1', title: 'x', date: '2026-08-01' }], evidence: 'evidence text', truncated: false }

    const result = await generateJournalContent({ name: 'groq', generateStructured } as never, source, 'last 30 days')

    expect(generateStructured).toHaveBeenCalled()
    expect(result.narrative).toBe('Worked on refactoring.')
  })
})
