import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { attachWorkstreamKnowledgeBase, detachWorkstreamKnowledgeBase, listWorkstreamKnowledgeBases } from './workstream-knowledge-bases'

function ctxWithProfile(supabase: unknown, profileRole: string) {
  return { user: { id: 'user-1' }, profile: { role: profileRole }, supabase } as never
}

describe('attachWorkstreamKnowledgeBase', () => {
  it('resolves the workstream project_id and rejects a caller without owner/curator role there', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })

    await expect(
      attachWorkstreamKnowledgeBase(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', 'kb-1')
    ).rejects.toThrow("you're currently a consultant on this project")
  })

  it('rejects a knowledge base that is not active', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'curator' }, error: null }],
      knowledge_bases: [{ data: null, error: null }],
    })

    await expect(attachWorkstreamKnowledgeBase(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', 'kb-1')).rejects.toThrow(
      'retained for reference'
    )
  })

  it('rejects a project_private/selected_projects knowledge base (OR-036 parity)', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'curator' }, error: null }],
      knowledge_bases: [{ data: { id: 'kb-1' }, error: null }, { data: { visibility_scope: 'selected_projects' }, error: null }],
    })

    await expect(attachWorkstreamKnowledgeBase(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', 'kb-1')).rejects.toThrow(
      'scoped to a specific project'
    )
  })

  it('inserts the link row with purpose and attached_by', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'owner' }, error: null }],
      knowledge_bases: [{ data: { id: 'kb-1' }, error: null }, { data: { visibility_scope: 'platform' }, error: null }],
      workstream_knowledge_bases: [{ data: null, error: null }],
    })

    const result = await attachWorkstreamKnowledgeBase(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', 'kb-1', 'Client reference set')
    expect(result).toEqual({ projectId: 'project-1' })

    const insert = fakeSupabase._calls.find((c) => c.table === 'workstream_knowledge_bases' && c.method === 'insert')
    expect(insert?.args).toEqual({ workstream_id: 'ws-1', knowledge_base_id: 'kb-1', purpose: 'Client reference set', attached_by: 'user-1' })
  })
})

describe('detachWorkstreamKnowledgeBase', () => {
  it('deletes the link row scoped to both workstream_id and knowledge_base_id', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'curator' }, error: null }],
      workstream_knowledge_bases: [{ data: null, error: null }],
    })

    const result = await detachWorkstreamKnowledgeBase(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', 'kb-1')
    expect(result).toEqual({ projectId: 'project-1' })
    expect(fakeSupabase._calls.find((c) => c.table === 'workstream_knowledge_bases' && c.method === 'delete')).toBeDefined()
  })
})

describe('listWorkstreamKnowledgeBases', () => {
  it('lists rows scoped to the workstream', async () => {
    const fakeSupabase = createFakeSupabase({
      workstream_knowledge_bases: [{ data: [{ id: 'link-1', workstream_id: 'ws-1', knowledge_base_id: 'kb-1' }], error: null }],
    })
    const result = await listWorkstreamKnowledgeBases(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1')
    expect(result).toEqual([{ id: 'link-1', workstream_id: 'ws-1', knowledge_base_id: 'kb-1' }])
  })
})
