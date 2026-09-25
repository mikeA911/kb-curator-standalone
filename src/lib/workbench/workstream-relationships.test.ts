import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import {
  linkWorkstreamObject,
  unlinkWorkstreamObject,
  createWorkstreamFlowEdge,
  deleteWorkstreamFlowEdge,
  listWorkstreamFlow,
} from './workstream-relationships'

function ctxWithProfile(supabase: unknown, profileRole: string) {
  return { user: { id: 'user-1' }, profile: { role: profileRole }, supabase } as never
}

describe('linkWorkstreamObject', () => {
  it('resolves the workstream project_id and rejects a caller without owner/curator role there', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })

    await expect(
      linkWorkstreamObject(ctxWithProfile(fakeSupabase, 'consultant'), { workstreamId: 'ws-1', objectId: 'obj-1', accessModes: ['reads'] })
    ).rejects.toThrow("you're currently a consultant on this project")
  })

  it('upserts on (workstream_id, object_id) rather than a plain insert', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'curator' }, error: null }],
      workstream_object_links: [{ data: { id: 'link-1' }, error: null }],
    })

    const result = await linkWorkstreamObject(ctxWithProfile(fakeSupabase, 'consultant'), {
      workstreamId: 'ws-1',
      objectId: 'obj-1',
      accessModes: ['reads', 'writes'],
    })
    expect(result).toEqual({ linkId: 'link-1', projectId: 'project-1' })

    const upsert = fakeSupabase._calls.find((c) => c.table === 'workstream_object_links' && c.method === 'upsert')
    expect(upsert?.args).toMatchObject({ workstream_id: 'ws-1', object_id: 'obj-1', access_modes: ['reads', 'writes'] })
  })
})

describe('unlinkWorkstreamObject', () => {
  it('deletes the link row scoped to both workstream_id and object_id', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'owner' }, error: null }],
      workstream_object_links: [{ data: null, error: null }],
    })

    const result = await unlinkWorkstreamObject(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', 'obj-1')
    expect(result).toEqual({ projectId: 'project-1' })
    expect(fakeSupabase._calls.find((c) => c.table === 'workstream_object_links' && c.method === 'delete')).toBeDefined()
  })
})

describe('createWorkstreamFlowEdge', () => {
  it('resolves the upstream workstream\'s project_id for the role check', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'curator' }, error: null }],
      workstream_flow: [{ data: { id: 'edge-1' }, error: null }],
    })

    const result = await createWorkstreamFlowEdge(ctxWithProfile(fakeSupabase, 'consultant'), {
      upstreamWorkstreamId: 'ws-1',
      downstreamWorkstreamId: 'ws-2',
    })
    expect(result).toEqual({ edgeId: 'edge-1', projectId: 'project-1' })
  })

  it('rejects an anonymous caller before any lookup', async () => {
    const fakeSupabase = createFakeSupabase({})
    await expect(
      createWorkstreamFlowEdge(ctxWithProfile(fakeSupabase, 'anonymous'), { upstreamWorkstreamId: 'ws-1', downstreamWorkstreamId: 'ws-2' })
    ).rejects.toThrow('Create an account')
    expect(fakeSupabase._calls.find((c) => c.table === 'project_workstreams')).toBeUndefined()
  })
})

describe('deleteWorkstreamFlowEdge', () => {
  it('throws when zero rows are deleted (not authorized)', async () => {
    const fakeSupabase = createFakeSupabase({ workstream_flow: [{ data: [], error: null }] })
    await expect(deleteWorkstreamFlowEdge(ctxWithProfile(fakeSupabase, 'consultant'), 'edge-1')).rejects.toThrow(
      'You do not have permission to delete this workstream flow edge'
    )
  })
})

describe('listWorkstreamFlow', () => {
  it('returns an empty array without querying workstream_flow when the project has no workstreams', async () => {
    const fakeSupabase = createFakeSupabase({ project_workstreams: [{ data: [], error: null }] })
    const result = await listWorkstreamFlow(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1')
    expect(result).toEqual([])
    expect(fakeSupabase._calls.find((c) => c.table === 'workstream_flow')).toBeUndefined()
  })

  it('lists edges upstream from any of the project\'s workstreams', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: [{ id: 'ws-1' }, { id: 'ws-2' }], error: null }],
      workstream_flow: [{ data: [{ id: 'edge-1', upstream_workstream_id: 'ws-1', downstream_workstream_id: 'ws-2' }], error: null }],
    })
    const result = await listWorkstreamFlow(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1')
    expect(result).toEqual([{ id: 'edge-1', upstream_workstream_id: 'ws-1', downstream_workstream_id: 'ws-2' }])
  })
})
