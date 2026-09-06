import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const {
  createWorkingKnowledgeItem,
  listMyWorkingKnowledge,
  listSharedWorkingKnowledge,
  shareWorkingKnowledgeItem,
  revokeWorkingKnowledgeShare,
  archiveWorkingKnowledgeItem,
} = await import('./working-knowledge')

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>, overrides: { userId?: string } = {}): WorkbenchCallerContext {
  return { user: { id: overrides.userId ?? 'user-1' }, profile: { id: overrides.userId ?? 'user-1', role: 'member' }, supabase } as unknown as WorkbenchCallerContext
}

describe('createWorkingKnowledgeItem', () => {
  it('rejects an anonymous caller', async () => {
    const supabase = createFakeSupabase({})
    await expect(
      createWorkingKnowledgeItem(supabase as never, { id: 'anon-1', role: 'anonymous' }, { projectId: 'proj-1', type: 'working_note', title: 'x', content: 'y' })
    ).rejects.toThrow('Create an account')
  })

  it('rejects an empty title or content', async () => {
    const supabase = createFakeSupabase({})
    await expect(
      createWorkingKnowledgeItem(supabase as never, { id: 'user-1', role: 'member' }, { projectId: 'proj-1', type: 'working_note', title: '  ', content: 'y' })
    ).rejects.toThrow('Title is required')
    await expect(
      createWorkingKnowledgeItem(supabase as never, { id: 'user-1', role: 'member' }, { projectId: 'proj-1', type: 'working_note', title: 'x', content: '  ' })
    ).rejects.toThrow('Content is required')
  })

  it('inserts the item privately-scoped by default, and its sources when provided', async () => {
    const supabase = createFakeSupabase({
      working_knowledge_items: [{ data: { id: 'wk-1' }, error: null }],
      working_knowledge_sources: [{ data: null, error: null }],
    })

    const result = await createWorkingKnowledgeItem(supabase as never, { id: 'user-1', role: 'member' }, {
      projectId: 'proj-1',
      type: 'research_notebook',
      title: 'Acme Corp Research',
      content: 'Findings...',
      sources: [{ url: 'https://acme.example', title: 'Acme homepage' }],
    })

    expect(result).toEqual({ itemId: 'wk-1' })

    const itemInsert = supabase._calls.find((c) => c.table === 'working_knowledge_items' && c.method === 'insert')
    expect(itemInsert?.args).toMatchObject({ project_id: 'proj-1', owner_id: 'user-1', type: 'research_notebook', title: 'Acme Corp Research' })

    const sourcesInsert = supabase._calls.find((c) => c.table === 'working_knowledge_sources' && c.method === 'insert')
    expect(sourcesInsert?.args).toEqual([
      { item_id: 'wk-1', url: 'https://acme.example', domain: null, title: 'Acme homepage', published_date: null, excerpt: null, content_fingerprint: null },
    ])
  })
})

describe('listMyWorkingKnowledge / listSharedWorkingKnowledge', () => {
  it('scopes "mine" to the caller\'s own owner_id', async () => {
    const supabase = createFakeSupabase({
      working_knowledge_items: [{ data: [{ id: 'wk-1', owner_id: 'user-1', title: 'Mine' }], error: null }],
    })
    const result = await listMyWorkingKnowledge(fakeCtx(supabase), 'proj-1')
    expect(result).toEqual([{ id: 'wk-1', owner_id: 'user-1', title: 'Mine' }])
  })

  it('excludes the caller\'s own items from "shared"', async () => {
    const supabase = createFakeSupabase({
      working_knowledge_items: [{ data: [{ id: 'wk-2', owner_id: 'user-2', title: 'Shared with me' }], error: null }],
    })
    const result = await listSharedWorkingKnowledge(fakeCtx(supabase), 'proj-1')
    expect(result).toEqual([{ id: 'wk-2', owner_id: 'user-2', title: 'Shared with me' }])
  })
})

describe('shareWorkingKnowledgeItem', () => {
  it('rejects sharing with someone who is not an active member of the item\'s project', async () => {
    const supabase = createFakeSupabase({
      working_knowledge_items: [{ data: { project_id: 'proj-1' }, error: null }],
      project_members: [{ data: null, error: null }],
    })
    await expect(shareWorkingKnowledgeItem(fakeCtx(supabase), 'wk-1', 'user-2')).rejects.toThrow('active member of this project')
  })

  it('inserts a share row once the recipient is confirmed an active member', async () => {
    const supabase = createFakeSupabase({
      working_knowledge_items: [{ data: { project_id: 'proj-1' }, error: null }],
      project_members: [{ data: { role: 'viewer' }, error: null }],
      working_knowledge_shares: [{ data: null, error: null }],
    })

    await shareWorkingKnowledgeItem(fakeCtx(supabase), 'wk-1', 'user-2')

    const shareInsert = supabase._calls.find((c) => c.table === 'working_knowledge_shares' && c.method === 'insert')
    expect(shareInsert?.args).toEqual({ item_id: 'wk-1', recipient_user_id: 'user-2', granted_by: 'user-1' })
  })
})

describe('revokeWorkingKnowledgeShare', () => {
  it('throws a friendly error when RLS silently denies the update (not the owner)', async () => {
    const supabase = createFakeSupabase({
      working_knowledge_shares: [{ data: [], error: null }],
    })
    await expect(revokeWorkingKnowledgeShare(fakeCtx(supabase), 'share-1')).rejects.toThrow('permission to revoke')
  })
})

describe('archiveWorkingKnowledgeItem', () => {
  it('throws a friendly error when RLS silently denies the update (not the owner)', async () => {
    const supabase = createFakeSupabase({
      working_knowledge_items: [{ data: [], error: null }],
    })
    await expect(archiveWorkingKnowledgeItem(fakeCtx(supabase), 'wk-1')).rejects.toThrow('permission to archive')
  })
})
