import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getLatestActivityLabel } from './conversations'

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
