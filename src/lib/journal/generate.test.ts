import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const listMessagesMock = vi.fn()
// gatherProjectActivity resolves related-actor display names via the admin
// client (profiles RLS only lets a caller see their own row -- see the
// comment in generate.ts), so tests point this at a fresh fake per-case.
let adminSupabase = createFakeSupabase({})

vi.mock('@/lib/chat/conversations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat/conversations')>('@/lib/chat/conversations')
  return { ...actual, listMessages: (...args: unknown[]) => listMessagesMock(...args) }
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminSupabase }))

const { gatherJournalSource, generateJournalContent, gatherProjectActivity, resolveJournalRange, generateJournal } = await import('./generate')

beforeEach(() => {
  listMessagesMock.mockReset()
  adminSupabase = createFakeSupabase({})
})

describe('gatherJournalSource', () => {
  it('returns an empty source when there are no conversations in range', async () => {
    const supabase = createFakeSupabase({ conversations: [{ data: [], error: null }] })

    const result = await gatherJournalSource({ user: { id: 'user-1' }, profile: {}, supabase } as never, new Date('2026-07-21'))

    expect(result).toEqual({ conversations: [], evidence: '', truncated: false })
    expect(listMessagesMock).not.toHaveBeenCalled()
  })

  it('filters to one project when a projectId is passed, leaving general/all-project behavior unchanged when omitted', async () => {
    const supabase = createFakeSupabase({ conversations: [{ data: [], error: null }] })

    await gatherJournalSource({ user: { id: 'user-1' }, profile: {}, supabase } as never, new Date('2026-07-21'), 'proj-1')

    const eqCall = supabase._calls.find((c) => c.table === 'conversations' && c.method === 'eq' && (c.args as { column: string }).column === 'project_id')
    expect(eqCall?.args).toEqual({ column: 'project_id', value: 'proj-1' })
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
    expect(result.narrative).toContain('No activity was found for last 30 days')
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

  it('uses a smaller token budget for brief detail and a larger one for detailed', async () => {
    const generateStructured = vi.fn().mockResolvedValue({
      data: { narrative: 'x', projectsAndThemes: [], decisionsAndMilestones: [], lessonsAndChangedAssumptions: [], openQuestions: [], itemsToRevisit: [] },
      model: 'test-model',
    })
    const source = { conversations: [{ id: 'conv-1', title: 'x', date: '2026-08-01' }], evidence: 'evidence text', truncated: false }

    await generateJournalContent({ name: 'groq', generateStructured } as never, source, 'last 30 days', { detail: 'brief' })
    await generateJournalContent({ name: 'groq', generateStructured } as never, source, 'last 30 days', { detail: 'detailed' })

    const briefCall = generateStructured.mock.calls[0][0]
    const detailedCall = generateStructured.mock.calls[1][0]
    expect(briefCall.maxOutputTokens).toBeLessThan(detailedCall.maxOutputTokens)
  })

  it('uses a factual-summary voice instruction when style is factual', async () => {
    const generateStructured = vi.fn().mockResolvedValue({
      data: { narrative: 'x', projectsAndThemes: [], decisionsAndMilestones: [], lessonsAndChangedAssumptions: [], openQuestions: [], itemsToRevisit: [] },
      model: 'test-model',
    })
    const source = { conversations: [{ id: 'conv-1', title: 'x', date: '2026-08-01' }], evidence: 'evidence text', truncated: false }

    await generateJournalContent({ name: 'groq', generateStructured } as never, source, 'last 30 days', { style: 'factual' })

    expect(generateStructured.mock.calls[0][0].system).toContain('factual activity summary')
  })
})

describe('resolveJournalRange', () => {
  const now = new Date('2026-08-25T12:00:00Z')

  it('resolves last_30_days to a 30-day window ending now', () => {
    const { sinceDate, untilDate } = resolveJournalRange({ range: 'last_30_days' }, now)
    expect(untilDate).toEqual(now)
    expect(now.getTime() - sinceDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('resolves this_year to January 1st of the current year', () => {
    const { sinceDate } = resolveJournalRange({ range: 'this_year' }, now)
    expect(sinceDate.getFullYear()).toBe(2026)
    expect(sinceDate.getMonth()).toBe(0)
    expect(sinceDate.getDate()).toBe(1)
  })

  it('clamps a custom range end date to now and rejects a start after the end', () => {
    const { untilDate } = resolveJournalRange({ range: 'custom', from: '2026-01-01', to: '2099-01-01' }, now)
    expect(untilDate).toEqual(now)
    expect(() => resolveJournalRange({ range: 'custom', from: '2026-08-20', to: '2026-08-01' }, now)).toThrow()
  })

  it('clamps an oversized custom range to the maximum span', () => {
    const { sinceDate, untilDate } = resolveJournalRange({ range: 'custom', from: '2010-01-01', to: '2026-08-25' }, now)
    const spanDays = (untilDate.getTime() - sinceDate.getTime()) / (24 * 60 * 60 * 1000)
    expect(spanDays).toBeLessThanOrEqual(366)
  })
})

describe('gatherProjectActivity', () => {
  it('returns nothing when the user has no active project memberships', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: [], error: null }] })

    const result = await gatherProjectActivity(
      { user: { id: 'user-1' }, profile: {}, supabase } as never,
      new Date('2026-07-01'),
      new Date('2026-08-01'),
      { includeRelated: true }
    )

    expect(result).toEqual({ mine: [], related: [], projects: [] })
  })

  it('splits activity into mine vs related by actor, and omits related activity when includeRelated is false', async () => {
    adminSupabase = createFakeSupabase({ profiles: [{ data: [{ id: 'user-2', full_name: 'Maria', email: null }], error: null }] })
    const supabase = createFakeSupabase({
      project_members: [{ data: [{ project_id: 'proj-1' }], error: null }],
      projects: [{ data: [{ id: 'proj-1', name: 'Project One' }], error: null }],
      project_workstreams: [{ data: [], error: null }],
      project_notes: [
        {
          data: [
            { id: 'note-1', project_id: 'proj-1', author_id: 'user-1', subject: 'My note', created_at: '2026-07-15T00:00:00Z' },
            { id: 'note-2', project_id: 'proj-1', author_id: 'user-2', subject: 'Their note', created_at: '2026-07-16T00:00:00Z' },
          ],
          error: null,
        },
      ],
    })

    const result = await gatherProjectActivity(
      { user: { id: 'user-1' }, profile: {}, supabase } as never,
      new Date('2026-07-01'),
      new Date('2026-08-01'),
      { includeRelated: true }
    )

    expect(result.mine).toEqual([{ id: 'note-1', date: '2026-07-15T00:00:00Z', line: 'Wrote a note in Project One: "My note".', projectId: 'proj-1', projectName: 'Project One' }])
    expect(result.related).toEqual([
      { id: 'note-2', date: '2026-07-16T00:00:00Z', actorName: 'Maria', line: 'Maria wrote a note in Project One: "Their note".', projectId: 'proj-1', projectName: 'Project One' },
    ])

    const withoutRelated = await gatherProjectActivity(
      { user: { id: 'user-1' }, profile: {}, supabase: createFakeSupabase({
        project_members: [{ data: [{ project_id: 'proj-1' }], error: null }],
        projects: [{ data: [{ id: 'proj-1', name: 'Project One' }], error: null }],
        project_workstreams: [{ data: [], error: null }],
        project_notes: [
          {
            data: [{ id: 'note-2', project_id: 'proj-1', author_id: 'user-2', subject: 'Their note', created_at: '2026-07-16T00:00:00Z' }],
            error: null,
          },
        ],
      }) } as never,
      new Date('2026-07-01'),
      new Date('2026-08-01'),
      { includeRelated: false }
    )
    expect(withoutRelated.related).toEqual([])
  })
})

describe('generateJournal', () => {
  it('reports an honest empty result when there is no conversation or project activity in range', async () => {
    const generateStructured = vi.fn()
    const supabase = createFakeSupabase({
      conversations: [{ data: [], error: null }],
      project_members: [{ data: [], error: null }],
    })

    const result = await generateJournal(
      { user: { id: 'user-1' }, profile: {}, supabase } as never,
      { name: 'groq', generateStructured } as never,
      {
        range: 'last_30_days',
        includeRelatedActivity: true,
        detail: 'standard',
        style: 'reflective',
        excludedConversationIds: [],
        excludedProjectIds: [],
      }
    )

    expect(generateStructured).not.toHaveBeenCalled()
    expect(result.content.narrative).toContain('No activity was found')
    expect(result.relatedActivity).toEqual([])
    expect(result.projects).toEqual([])
  })
})
