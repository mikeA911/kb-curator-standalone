import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { cloneProject, cloneWorkstream } from './project-cloning'

function ctxWithProfile(supabase: unknown, profileRole: string) {
  return { user: { id: 'user-1' }, profile: { role: profileRole }, supabase } as never
}

describe('cloneProject', () => {
  it('rejects a caller without owner/curator role, before reading the source project', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })

    await expect(cloneProject(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1')).rejects.toThrow(
      "you're currently a consultant on this project"
    )
    expect(fakeSupabase._calls.find((c) => c.table === 'projects')).toBeUndefined()
  })

  it('deep-copies project_objects and project_workstreams into a new project, setting cloned_from_* provenance', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'curator' }, error: null }],
      projects: [
        { data: { name: 'Riverbank Monitoring', project_type: 'consulting', objective: 'Detect anomalies', details: {} }, error: null },
        { data: { id: 'project-clone-1' }, error: null },
      ],
      project_objects: [
        { data: [{ id: 'obj-1', parent_object_id: null, name: 'Sensor', slug: 'sensor', description: null }], error: null },
        { data: [{ id: 'obj-1-copy' }], error: null },
      ],
      project_workstreams: [
        {
          data: [
            {
              id: 'ws-1',
              parent_workstream_id: null,
              name: 'Interface',
              slug: 'interface',
              repository_scope: [],
              goal: null,
              guardrail: null,
              deliverables: [{ label: 'Done thing', completed: true }],
              lifecycle_stage: 'deployment',
              operational_status: 'open',
              planned_duration: null,
              actual_duration: null,
            },
          ],
          error: null,
        },
        { data: [{ id: 'ws-1-copy' }], error: null },
      ],
    })

    const result = await cloneProject(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1')
    expect(result).toEqual({ projectId: 'project-clone-1' })

    const projectInsert = fakeSupabase._calls.find((c) => c.table === 'projects' && c.method === 'insert')
    expect(projectInsert?.args).toMatchObject({ name: 'Riverbank Monitoring (Copy)', status: 'draft', cloned_from_project_id: 'project-1' })

    const objectInsert = fakeSupabase._calls.find((c) => c.table === 'project_objects' && c.method === 'insert')
    expect(objectInsert?.args).toEqual([expect.objectContaining({ project_id: 'project-clone-1', parent_object_id: null, name: 'Sensor' })])

    const workstreamInsert = fakeSupabase._calls.find((c) => c.table === 'project_workstreams' && c.method === 'insert')
    expect(workstreamInsert?.args).toEqual([
      expect.objectContaining({
        project_id: 'project-clone-1',
        parent_workstream_id: null,
        name: 'Interface',
        status: 'draft',
        // Deliverables are reset -- a clone is a fresh run, not a copy of
        // prior progress.
        deliverables: [{ label: 'Done thing', completed: false }],
        cloned_from_workstream_id: 'ws-1',
      }),
    ])
  })
})

describe('cloneWorkstream', () => {
  it('rejects an anonymous caller before any lookup', async () => {
    const fakeSupabase = createFakeSupabase({})
    await expect(cloneWorkstream(ctxWithProfile(fakeSupabase, 'anonymous'), 'ws-1')).rejects.toThrow('Create an account')
    expect(fakeSupabase._calls.find((c) => c.table === 'project_workstreams')).toBeUndefined()
  })

  it('rejects a caller whose project role is consultant, naming their actual role', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1', project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })
    await expect(cloneWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1')).rejects.toThrow(
      "you're currently a consultant on this project"
    )
  })

  it("clones the workstream's subtree, reparenting the root to top-level and excluding a sibling branch, then copies its object links", async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [
        // 1. fetch the source workstream (ws-1, whose real parent is ws-0 --
        //    an ancestor outside the cloned subtree)
        { data: { id: 'ws-1', project_id: 'project-1', parent_workstream_id: 'ws-0', name: 'Interface', slug: 'interface' }, error: null },
        // 2. fetch every workstream in the project, to walk the subtree
        {
          data: [
            { id: 'ws-0', project_id: 'project-1', parent_workstream_id: null, name: 'Root', slug: 'root' },
            {
              id: 'ws-1',
              project_id: 'project-1',
              parent_workstream_id: 'ws-0',
              name: 'Interface',
              slug: 'interface',
              repository_scope: [],
              goal: null,
              guardrail: null,
              deliverables: [],
              lifecycle_stage: null,
              operational_status: 'open',
              planned_duration: null,
              actual_duration: null,
            },
            {
              id: 'ws-2',
              project_id: 'project-1',
              parent_workstream_id: 'ws-1',
              name: 'Child Task',
              slug: 'child-task',
              repository_scope: [],
              goal: null,
              guardrail: null,
              deliverables: [],
              lifecycle_stage: null,
              operational_status: 'open',
              planned_duration: null,
              actual_duration: null,
            },
          ],
          error: null,
        },
        // 3. level-1 insert (the root, ws-1)
        { data: [{ id: 'ws-1-copy' }], error: null },
        // 4. level-2 insert (the child, ws-2)
        { data: [{ id: 'ws-2-copy' }], error: null },
      ],
      project_members: [{ data: { role: 'owner' }, error: null }],
      workstream_object_links: [
        { data: [{ workstream_id: 'ws-1', object_id: 'obj-1', access_modes: ['reads'] }], error: null },
        { data: null, error: null },
      ],
    })

    const result = await cloneWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1')
    expect(result).toEqual({ workstreamId: 'ws-1-copy', projectId: 'project-1' })

    const inserts = fakeSupabase._calls.filter((c) => c.table === 'project_workstreams' && c.method === 'insert')
    expect(inserts).toHaveLength(2)
    // The root's real parent (ws-0) is outside the cloned subtree -- the
    // clone is reparented to top-level, not left dangling on an
    // unresolved external parent.
    expect(inserts[0].args).toEqual([
      expect.objectContaining({ name: 'Interface', parent_workstream_id: null, cloned_from_workstream_id: 'ws-1' }),
    ])
    expect(inserts[1].args).toEqual([
      expect.objectContaining({ name: 'Child Task', parent_workstream_id: 'ws-1-copy', cloned_from_workstream_id: 'ws-2' }),
    ])
    // ws-0 (outside the subtree) never gets cloned.
    expect(inserts.some((i) => (i.args as Record<string, unknown>[])[0].name === 'Root')).toBe(false)

    const linkInsert = fakeSupabase._calls.find((c) => c.table === 'workstream_object_links' && c.method === 'insert')
    expect(linkInsert?.args).toEqual([expect.objectContaining({ workstream_id: 'ws-1-copy', object_id: 'obj-1', access_modes: ['reads'] })])
  })
})
