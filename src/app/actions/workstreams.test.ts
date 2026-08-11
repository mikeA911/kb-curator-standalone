import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireUserMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireUser: (...args: unknown[]) => requireUserMock(...args),
  }
})

const { createWorkstreamAction, toggleDeliverableAction, attachArtifactAction } = await import('./workstreams')

beforeEach(() => {
  requireUserMock.mockReset()
})

describe('createWorkstreamAction', () => {
  it('rejects an anonymous session', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(
      createWorkstreamAction({ projectId: 'p-1', name: 'X', slug: 'x', repositoryScope: [], deliverables: [] })
    ).rejects.toThrow('Create an account')
  })

  it('inserts through the RLS-scoped client -- project_workstreams_manage_curator is the real gate', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: { id: 'ws-1' }, error: null }] })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator', id: 'user-1' }, supabase })

    const result = await createWorkstreamAction({
      projectId: 'p-1',
      name: 'Onboarding',
      slug: 'onboarding',
      repositoryScope: ['src/onboarding/**', ''],
      goal: 'Ship it',
      deliverables: ['capability inventory', '', 'openapi spec'],
    })

    expect(result).toEqual({ workstreamId: 'ws-1' })
    const insert = supabase._calls.find((c) => c.table === 'project_workstreams' && c.method === 'insert')
    expect(insert?.args).toMatchObject({
      project_id: 'p-1',
      name: 'Onboarding',
      repository_scope: ['src/onboarding/**'], // blank lines filtered
      deliverables: [
        { label: 'capability inventory', completed: false },
        { label: 'openapi spec', completed: false },
      ],
    })
  })
})

describe('toggleDeliverableAction', () => {
  it('flips only the targeted deliverable, leaving the rest untouched', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [
        {
          data: {
            id: 'ws-1',
            project_id: 'p-1',
            deliverables: [
              { label: 'capability inventory', completed: false },
              { label: 'openapi spec', completed: true },
            ],
          },
          error: null,
        },
        { data: [{ id: 'ws-1' }], error: null },
      ],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator', id: 'user-1' }, supabase })

    await toggleDeliverableAction('ws-1', 0)

    const update = supabase._calls.find((c) => c.table === 'project_workstreams' && c.method === 'update')
    expect(update?.args).toEqual({
      deliverables: [
        { label: 'capability inventory', completed: true },
        { label: 'openapi spec', completed: true },
      ],
    })
  })

  it('throws a clear error when RLS silently rejects the update (zero rows matched)', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [
        { data: { id: 'ws-1', project_id: 'p-1', deliverables: [{ label: 'x', completed: false }] }, error: null },
        { data: [], error: null },
      ],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    await expect(toggleDeliverableAction('ws-1', 0)).rejects.toThrow('permission')
  })
})

describe('attachArtifactAction', () => {
  it('rejects an anonymous session', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(
      attachArtifactAction({ workstreamId: 'ws-1', artifactType: 'findings', title: 'X', content: 'notes' })
    ).rejects.toThrow('Create an account')
  })

  it('requires either content or an external URL', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' } })
    await expect(attachArtifactAction({ workstreamId: 'ws-1', artifactType: 'findings', title: 'X' })).rejects.toThrow(
      'content or a link'
    )
  })

  it('inserts through the RLS-scoped client -- workstream_artifacts_insert_consultant is the real gate', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { project_id: 'p-1' }, error: null }],
      workstream_artifacts: [{ data: null, error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    await attachArtifactAction({ workstreamId: 'ws-1', artifactType: 'findings', title: 'Findings', content: 'It works' })

    const insert = supabase._calls.find((c) => c.table === 'workstream_artifacts' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ workstream_id: 'ws-1', artifact_type: 'findings', title: 'Findings', content: 'It works' })
  })
})
