import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { applyProjectOntologySuggestion } from './project-ontology-suggestions'

function ctxWithProfile(supabase: unknown, profileRole: string) {
  return { user: { id: 'user-1' }, profile: { role: profileRole }, supabase } as never
}

describe('applyProjectOntologySuggestion', () => {
  it('rejects a caller without owner/curator role on the project, before reading anything', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })

    await expect(
      applyProjectOntologySuggestion(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1', {
        objects: [{ tempId: 'o1', parentTempId: null, name: 'Sensor', description: 'A sensor' }],
        workstreams: [],
      })
    ).rejects.toThrow("you're currently a consultant on this project")
    expect(fakeSupabase._calls.find((c) => c.table === 'project_objects')).toBeUndefined()
  })

  it('inserts a nested object tree and a workstream tree for a curator, resolving parent tempIds to real ids', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'curator' }, error: null }],
      project_objects: [
        { data: [], error: null }, // existing-slugs lookup -- nothing yet
        { data: [{ id: 'real-obj-1' }], error: null }, // level 1: root
        { data: [{ id: 'real-obj-2' }], error: null }, // level 2: child
      ],
      project_workstreams: [
        { data: [], error: null }, // existing-slugs lookup
        { data: [{ id: 'real-ws-1' }], error: null },
      ],
    })

    const result = await applyProjectOntologySuggestion(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1', {
      objects: [
        { tempId: 'o1', parentTempId: null, name: 'Sensor', description: 'A sensor' },
        { tempId: 'o2', parentTempId: 'o1', name: 'AnomalyEvent', description: 'An anomaly' },
      ],
      workstreams: [{ tempId: 'w1', parentTempId: null, name: 'Onboarding', goal: 'Onboard the client' }],
    })

    expect(result).toEqual({ objectIds: ['real-obj-1', 'real-obj-2'], workstreamIds: ['real-ws-1'] })

    const objectInserts = fakeSupabase._calls.filter((c) => c.table === 'project_objects' && c.method === 'insert')
    expect(objectInserts).toHaveLength(2)
    expect(objectInserts[0].args).toEqual([expect.objectContaining({ name: 'Sensor', slug: 'sensor', parent_object_id: null })])
    expect(objectInserts[1].args).toEqual([expect.objectContaining({ name: 'AnomalyEvent', slug: 'anomalyevent', parent_object_id: 'real-obj-1' })])

    const workstreamInsert = fakeSupabase._calls.find((c) => c.table === 'project_workstreams' && c.method === 'insert')
    expect(workstreamInsert?.args).toEqual([expect.objectContaining({ name: 'Onboarding', slug: 'onboarding', status: 'draft' })])
  })

  it("mangles a suggested object's slug when it collides with one this project already has", async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'owner' }, error: null }],
      project_objects: [
        { data: [{ slug: 'sensor' }], error: null }, // existing-slugs lookup -- already has "sensor"
        { data: [{ id: 'real-obj-1' }], error: null },
      ],
      project_workstreams: [{ data: [], error: null }],
    })

    await applyProjectOntologySuggestion(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1', {
      objects: [{ tempId: 'o1', parentTempId: null, name: 'Sensor', description: 'A second sensor type' }],
      workstreams: [],
    })

    const insert = fakeSupabase._calls.find((c) => c.table === 'project_objects' && c.method === 'insert')
    expect(insert?.args).toEqual([expect.objectContaining({ slug: 'sensor-2' })])
  })

  it('does nothing for an empty suggestion (no objects, no workstreams)', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'curator' }, error: null }],
      project_objects: [{ data: [], error: null }],
      project_workstreams: [{ data: [], error: null }],
    })

    const result = await applyProjectOntologySuggestion(ctxWithProfile(fakeSupabase, 'consultant'), 'project-1', {
      objects: [],
      workstreams: [],
    })
    expect(result).toEqual({ objectIds: [], workstreamIds: [] })
    expect(fakeSupabase._calls.find((c) => c.method === 'insert')).toBeUndefined()
  })
})
