import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getLatestActivityLabel, listRecentConversations, toDisplayMessages } from './conversations'
import type { ChatMessageRow } from '@/types/database'

describe('getLatestActivityLabel', () => {
  it('returns null when the conversation has no messages yet', async () => {
    const supabase = createFakeSupabase({ chat_messages: [{ data: null, error: null }] }) as never
    expect(await getLatestActivityLabel(supabase, 'conv-1')).toBeNull()
  })

  it('maps the most recent assistant tool call to a friendly label', async () => {
    const supabase = createFakeSupabase({
      chat_messages: [{ data: { role: 'assistant', tool_calls: [{ id: 'c1', name: 'search_wiki', arguments: {} }], tool_name: null }, error: null }],
    }) as never
    expect(await getLatestActivityLabel(supabase, 'conv-1')).toBe('Searching the Workbench Handbook & Wiki…')
  })

  it('returns "Reviewing results…" once a known tool has returned its result', async () => {
    const supabase = createFakeSupabase({
      chat_messages: [{ data: { role: 'tool', tool_calls: null, tool_name: 'create_project' }, error: null }],
    }) as never
    expect(await getLatestActivityLabel(supabase, 'conv-1')).toBe('Reviewing results…')
  })

  it('falls back to null for a plain assistant reply with no tool call, letting the client show a generic label', async () => {
    const supabase = createFakeSupabase({
      chat_messages: [{ data: { role: 'assistant', tool_calls: null, tool_name: null }, error: null }],
    }) as never
    expect(await getLatestActivityLabel(supabase, 'conv-1')).toBeNull()
  })
})

describe('listRecentConversations', () => {
  it('returns the queued rows, an empty result being the first-use signal', async () => {
    const supabase = createFakeSupabase({ conversations: [{ data: [], error: null }] }) as never
    expect(await listRecentConversations(supabase, 'user-1')).toEqual([])
  })

  it('returns recent conversations ordered by the query (most-recent-first)', async () => {
    const rows = [{ id: 'conv-2' }, { id: 'conv-1' }]
    const supabase = createFakeSupabase({ conversations: [{ data: rows, error: null }] }) as never
    expect(await listRecentConversations(supabase, 'user-1')).toEqual(rows)
  })
})

function row(overrides: Partial<ChatMessageRow>): ChatMessageRow {
  return {
    id: 'm1',
    conversation_id: 'conv-1',
    user_id: 'user-1',
    role: 'user',
    content: null,
    tool_calls: null,
    tool_call_id: null,
    tool_name: null,
    provider: null,
    model: null,
    created_at: '2026-08-20T00:00:00Z',
    ...overrides,
  }
}

describe('toDisplayMessages', () => {
  it('turns a simple user/assistant exchange into display messages, resolving provenance from the lookup', () => {
    const rows = [
      row({ id: 'm1', role: 'user', content: 'What is KB Sandbox?' }),
      row({ id: 'm2', role: 'assistant', content: 'A knowledge platform.', provider: 'groq', model: 'openai/gpt-oss-20b' }),
    ]
    const lookup = new Map([['groq::openai/gpt-oss-20b', { providerDisplayName: 'Groq', modelDisplayName: 'GPT-OSS 20B' }]])

    expect(toDisplayMessages(rows, lookup)).toEqual([
      { role: 'user', content: 'What is KB Sandbox?' },
      { role: 'assistant', content: 'A knowledge platform.', providerDisplayName: 'Groq', modelDisplayName: 'GPT-OSS 20B', toolsUsed: undefined },
    ])
  })

  it('reconstructs toolsUsed from an intermediate tool-call row, folding it into the next real reply', () => {
    const rows = [
      row({ id: 'm1', role: 'user', content: 'What do we know about chunking?' }),
      row({ id: 'm2', role: 'assistant', content: '', tool_calls: [{ id: 'c1', name: 'search_wiki', arguments: { query: 'chunking' } }] }),
      row({ id: 'm3', role: 'tool', content: '{}', tool_call_id: 'c1', tool_name: 'search_wiki' }),
      row({ id: 'm4', role: 'assistant', content: 'Found some articles.', provider: 'groq', model: 'openai/gpt-oss-20b' }),
    ]

    const result = toDisplayMessages(rows, new Map())

    expect(result).toEqual([
      { role: 'user', content: 'What do we know about chunking?' },
      {
        role: 'assistant',
        content: 'Found some articles.',
        providerDisplayName: 'groq',
        modelDisplayName: 'openai/gpt-oss-20b',
        toolsUsed: ['search_wiki'],
      },
    ])
  })

  it('falls back to the raw provider/model identifiers when a model has since been renamed or removed', () => {
    const rows = [row({ role: 'assistant', content: 'ok', provider: 'deepseek', model: 'deepseek-v4-flash' })]

    const result = toDisplayMessages(rows, new Map())

    expect(result[0]).toEqual({
      role: 'assistant',
      content: 'ok',
      providerDisplayName: 'deepseek',
      modelDisplayName: 'deepseek-v4-flash',
      toolsUsed: undefined,
    })
  })

  it('does not carry toolsUsed over into a later turn that used no tools', () => {
    const rows = [
      row({ id: 'm1', role: 'user', content: 'first' }),
      row({ id: 'm2', role: 'assistant', content: '', tool_calls: [{ id: 'c1', name: 'search_wiki', arguments: {} }] }),
      row({ id: 'm3', role: 'tool', content: '{}', tool_call_id: 'c1', tool_name: 'search_wiki' }),
      row({ id: 'm4', role: 'assistant', content: 'first reply' }),
      row({ id: 'm5', role: 'user', content: 'second' }),
      row({ id: 'm6', role: 'assistant', content: 'second reply' }),
    ]

    const result = toDisplayMessages(rows, new Map())

    expect(result[1].toolsUsed).toEqual(['search_wiki'])
    expect(result[3].toolsUsed).toBeUndefined()
  })
})
