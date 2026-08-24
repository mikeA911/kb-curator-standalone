import { describe, expect, it } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { listActiveKnowledgeBases, requireActiveKnowledgeBase } from './knowledge-bases'

describe('knowledge base lifecycle', () => {
  it('lists only active knowledge bases', async () => {
    const rows = [{ id: 'ai_engineering', lifecycle_status: 'active' }]
    const supabase = createFakeSupabase({ knowledge_bases: [{ data: rows, error: null }] })

    await expect(listActiveKnowledgeBases(supabase as never)).resolves.toEqual(rows)
    expect(supabase._calls).toContainEqual({
      table: 'knowledge_bases',
      method: 'eq',
      args: { column: 'lifecycle_status', value: 'active' },
    })
  })

  it('accepts an active knowledge base', async () => {
    const supabase = createFakeSupabase({ knowledge_bases: [{ data: { id: 'ai_engineering' }, error: null }] })
    await expect(requireActiveKnowledgeBase(supabase as never, 'ai_engineering')).resolves.toBeUndefined()
  })

  it('falls back safely while the classification migration is still pending', async () => {
    const missingColumn = Object.assign(new Error('missing column'), { code: '42703' })
    const rows = [{ id: 'billing' }]
    const supabase = createFakeSupabase({
      knowledge_bases: [
        { data: null, error: missingColumn },
        { data: rows, error: null },
      ],
    })
    await expect(listActiveKnowledgeBases(supabase as never)).resolves.toEqual(rows)
  })

  it('rejects a legacy/reference knowledge base', async () => {
    const supabase = createFakeSupabase({ knowledge_bases: [{ data: null, error: null }] })
    await expect(requireActiveKnowledgeBase(supabase as never, 'billing')).rejects.toThrow('retained for reference')
    expect(supabase._calls).toEqual([
      { table: 'knowledge_bases', method: 'eq', args: { column: 'id', value: 'billing' } },
      { table: 'knowledge_bases', method: 'eq', args: { column: 'lifecycle_status', value: 'active' } },
    ])
  })
})
