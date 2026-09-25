import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { createProjectObject, updateProjectObject, deleteProjectObject, listProjectObjects } from './project-objects'

function ctxWithProfile(supabase: unknown, profileRole: string) {
  return { user: { id: 'user-1' }, profile: { role: profileRole }, supabase } as never
}

describe('createProjectObject', () => {
  it('rejects a caller with no active membership on the project, before attempting the insert', async () => {
    const fakeSupabase = createFakeSupabase({ project_members: [{ data: null, error: null }] })

    await expect(
      createProjectObject(ctxWithProfile(fakeSupabase, 'consultant'), { projectId: 'project-1', name: 'Sensor', slug: 'sensor' })
    ).rejects.toThrow("this project's owner or curator role")
    expect(fakeSupabase._calls.find((c) => c.table === 'project_objects' && c.method === 'insert')).toBeUndefined()
  })

  it('rejects a caller whose project role is consultant, naming their actual role', async () => {
    const fakeSupabase = createFakeSupabase({ project_members: [{ data: { role: 'consultant' }, error: null }] })

    await expect(
      createProjectObject(ctxWithProfile(fakeSupabase, 'consultant'), { projectId: 'project-1', name: 'Sensor', slug: 'sensor' })
    ).rejects.toThrow("you're currently a consultant on this project")
  })

  it('allows a project curator through to the insert', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'curator' }, error: null }],
      project_objects: [{ data: { id: 'obj-1' }, error: null }],
    })

    const result = await createProjectObject(ctxWithProfile(fakeSupabase, 'consultant'), {
      projectId: 'project-1',
      name: 'Sensor',
      slug: 'sensor',
    })
    expect(result).toEqual({ objectId: 'obj-1', projectId: 'project-1' })
  })

  it('skips the project-membership lookup entirely for a platform admin', async () => {
    const fakeSupabase = createFakeSupabase({ project_objects: [{ data: { id: 'obj-1' }, error: null }] })

    await createProjectObject(ctxWithProfile(fakeSupabase, 'admin'), { projectId: 'project-1', name: 'Sensor', slug: 'sensor' })
    expect(fakeSupabase._calls.find((c) => c.table === 'project_members')).toBeUndefined()
  })

  it('walks a given parentObjectId before inserting (pre-check mirroring the DB trigger) -- no cycle, insert proceeds', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'owner' }, error: null }],
      // The cycle walk's own select (parent chain ends at null), then the insert.
      project_objects: [{ data: null, error: null }, { data: { id: 'obj-2' }, error: null }],
    })

    const result = await createProjectObject(ctxWithProfile(fakeSupabase, 'consultant'), {
      projectId: 'project-1',
      parentObjectId: 'obj-1',
      name: 'AnomalyEvent',
      slug: 'anomaly-event',
    })
    expect(result).toEqual({ objectId: 'obj-2', projectId: 'project-1' })
  })
})

describe('updateProjectObject', () => {
  it('throws when the requested parentObjectId would create a cycle, before attempting the update', async () => {
    // objectId 'obj-1' is being updated to have parentObjectId 'obj-2', but
    // obj-2's own parent chain walks back to obj-1 -- a cycle.
    const fakeSupabase = createFakeSupabase({
      project_objects: [
        { data: { id: 'obj-1', project_id: 'project-1' }, error: null }, // existing lookup
        { data: { parent_object_id: 'obj-1' }, error: null }, // cycle walk: obj-2's parent is obj-1
      ],
    })

    await expect(updateProjectObject(ctxWithProfile(fakeSupabase, 'admin'), 'obj-1', { parentObjectId: 'obj-2' })).rejects.toThrow(
      'That parent would create a cycle'
    )
    expect(fakeSupabase._calls.find((c) => c.table === 'project_objects' && c.method === 'update')).toBeUndefined()
  })

  it('throws when zero rows are updated (not authorized)', async () => {
    const fakeSupabase = createFakeSupabase({
      project_objects: [
        { data: { id: 'obj-1', project_id: 'project-1' }, error: null },
        { data: [], error: null },
      ],
    })

    await expect(updateProjectObject(ctxWithProfile(fakeSupabase, 'consultant'), 'obj-1', { name: 'New name' })).rejects.toThrow(
      'You do not have permission to update this project object'
    )
  })
})

describe('deleteProjectObject', () => {
  it('throws when zero rows are deleted (not authorized)', async () => {
    const fakeSupabase = createFakeSupabase({ project_objects: [{ data: [], error: null }] })
    await expect(deleteProjectObject(ctxWithProfile(fakeSupabase, 'consultant'), 'obj-1')).rejects.toThrow(
      'You do not have permission to delete this project object'
    )
  })

  it('returns the projectId on a successful delete', async () => {
    const fakeSupabase = createFakeSupabase({ project_objects: [{ data: [{ id: 'obj-1', project_id: 'project-1' }], error: null }] })
    const result = await deleteProjectObject(ctxWithProfile(fakeSupabase, 'admin'), 'obj-1')
    expect(result).toEqual({ projectId: 'project-1' })
  })
})

describe('listProjectObjects', () => {
  it('returns the rows for a project', async () => {
    const fakeSupabase = createFakeSupabase({ project_objects: [{ data: [{ id: 'obj-1' }, { id: 'obj-2' }], error: null }] })
    const result = await listProjectObjects(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1')
    expect(result).toEqual([{ id: 'obj-1' }, { id: 'obj-2' }])
  })
})
