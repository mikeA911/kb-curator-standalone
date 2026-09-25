import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import {
  createMethodFromWorkstream,
  updateMethodDraft,
  publishMethod,
  listPublishedMethods,
  listPendingMethods,
  instantiateMethodAsWorkstream,
} from './methods'

function ctxWithProfile(supabase: unknown, profileRole: string) {
  return { user: { id: 'user-1' }, profile: { role: profileRole }, supabase } as never
}

describe('createMethodFromWorkstream', () => {
  it('resolves the workstream\'s project_id and rejects a caller without owner/curator role there', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })

    await expect(
      createMethodFromWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', { name: 'Riverbank Sensor Onboarding' })
    ).rejects.toThrow("you're currently a consultant on this project")
  })

  it('inserts a draft method with slug derived from the name and guardrails pre-filled', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'curator' }, error: null }],
      methods: [{ data: { id: 'method-1' }, error: null }],
    })

    const result = await createMethodFromWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', {
      name: 'Riverbank Sensor Onboarding',
      description: 'Sensor calibration and anomaly baseline',
      guardrails: 'Never write to prod without a dry run',
    })
    expect(result).toEqual({ methodId: 'method-1' })

    const insert = fakeSupabase._calls.find((c) => c.table === 'methods' && c.method === 'insert')
    expect(insert?.args).toMatchObject({
      name: 'Riverbank Sensor Onboarding',
      slug: 'riverbank-sensor-onboarding',
      derived_from_workstream_id: 'ws-1',
      guardrails: 'Never write to prod without a dry run',
      status: 'draft',
    })
  })

  it('turns a unique-slug collision into a friendly error', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'project-1' }, error: null }],
      project_members: [{ data: { role: 'owner' }, error: null }],
      methods: [{ data: null, error: Object.assign(new Error('duplicate key'), { code: '23505' }) }],
    })

    await expect(createMethodFromWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), 'ws-1', { name: 'Dup' })).rejects.toThrow(
      'A Method with a similar name already exists'
    )
  })
})

describe('updateMethodDraft', () => {
  it('throws when zero rows are updated (published, or not the owner) -- RLS is the real gate', async () => {
    const fakeSupabase = createFakeSupabase({ methods: [{ data: [], error: null }] })
    await expect(updateMethodDraft(ctxWithProfile(fakeSupabase, 'consultant'), 'method-1', { name: 'New name' })).rejects.toThrow(
      'it may already be published'
    )
  })

  it('updates only the fields provided', async () => {
    const fakeSupabase = createFakeSupabase({ methods: [{ data: [{ id: 'method-1' }], error: null }] })
    await updateMethodDraft(ctxWithProfile(fakeSupabase, 'consultant'), 'method-1', { requirements: 'A working sensor feed' })
    const update = fakeSupabase._calls.find((c) => c.table === 'methods' && c.method === 'update')
    expect(update?.args).toEqual({ requirements: 'A working sensor feed' })
  })
})

describe('publishMethod', () => {
  it('rejects a caller who is not a platform curator or admin', async () => {
    const fakeSupabase = createFakeSupabase({})
    await expect(publishMethod(ctxWithProfile(fakeSupabase, 'consultant'), 'method-1')).rejects.toThrow(
      'Only a platform curator or admin can publish'
    )
    expect(fakeSupabase._calls.find((c) => c.table === 'methods')).toBeUndefined()
  })

  it('publishes a draft, setting published_by/published_at', async () => {
    const fakeSupabase = createFakeSupabase({ methods: [{ data: [{ id: 'method-1' }], error: null }] })
    const result = await publishMethod(ctxWithProfile(fakeSupabase, 'curator'), 'method-1')
    expect(result).toEqual({ methodId: 'method-1' })
    const update = fakeSupabase._calls.find((c) => c.table === 'methods' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'published', published_by: 'user-1' })
  })

  it('throws when the method is not found or already published', async () => {
    const fakeSupabase = createFakeSupabase({ methods: [{ data: [], error: null }] })
    await expect(publishMethod(ctxWithProfile(fakeSupabase, 'admin'), 'method-1')).rejects.toThrow('not currently a draft')
  })
})

describe('listPublishedMethods / listPendingMethods', () => {
  it('listPublishedMethods filters to status=published', async () => {
    const fakeSupabase = createFakeSupabase({ methods: [{ data: [{ id: 'method-1', status: 'published' }], error: null }] })
    const result = await listPublishedMethods(ctxWithProfile(fakeSupabase, 'consultant'))
    expect(result).toEqual([{ id: 'method-1', status: 'published' }])
  })

  it('listPendingMethods filters to status=draft', async () => {
    const fakeSupabase = createFakeSupabase({ methods: [{ data: [{ id: 'method-2', status: 'draft' }], error: null }] })
    const result = await listPendingMethods(ctxWithProfile(fakeSupabase, 'curator'))
    expect(result).toEqual([{ id: 'method-2', status: 'draft' }])
  })
})

describe('instantiateMethodAsWorkstream', () => {
  it('rejects a caller without owner/curator role on the TARGET project', async () => {
    const fakeSupabase = createFakeSupabase({ project_members: [{ data: { role: 'consultant' }, error: null }] })
    await expect(
      instantiateMethodAsWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), { methodId: 'method-1', projectId: 'project-1', name: 'New WS' })
    ).rejects.toThrow("you're currently a consultant on this project")
    expect(fakeSupabase._calls.find((c) => c.table === 'methods')).toBeUndefined()
  })

  it('rejects instantiating a method that is not published', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'owner' }, error: null }],
      methods: [{ data: null, error: null }],
    })
    await expect(
      instantiateMethodAsWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), { methodId: 'method-1', projectId: 'project-1', name: 'New WS' })
    ).rejects.toThrow('not currently published')
  })

  it('creates a new workstream pre-filling only guardrail from the method, with derived_from_method_id set', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'curator' }, error: null }],
      methods: [{ data: { guardrails: 'Never write to prod without a dry run' }, error: null }],
      project_workstreams: [{ data: { id: 'ws-new-1' }, error: null }],
    })

    const result = await instantiateMethodAsWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), {
      methodId: 'method-1',
      projectId: 'project-1',
      name: 'Sensor Onboarding (from Method)',
    })
    expect(result).toEqual({ workstreamId: 'ws-new-1', projectId: 'project-1' })

    const insert = fakeSupabase._calls.find((c) => c.table === 'project_workstreams' && c.method === 'insert')
    expect(insert?.args).toMatchObject({
      project_id: 'project-1',
      name: 'Sensor Onboarding (from Method)',
      guardrail: 'Never write to prod without a dry run',
      derived_from_method_id: 'method-1',
      status: 'draft',
    })
  })
})
