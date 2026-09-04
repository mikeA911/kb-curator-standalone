import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { AuthError } from '@/lib/auth'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

const { listDiscoverableProjects } = await import('./directory')

beforeEach(() => {
  createAdminClientMock.mockReset()
})

function fakeCtx(role: string, userId = 'viewer-1'): WorkbenchCallerContext {
  return { user: { id: userId }, profile: { role }, supabase: createFakeSupabase({}) } as unknown as WorkbenchCallerContext
}

describe('listDiscoverableProjects', () => {
  it('rejects an anonymous caller', async () => {
    await expect(listDiscoverableProjects(fakeCtx('anonymous'))).rejects.toThrow(AuthError)
  })

  it('returns only safe fields, with owner email and the viewer\'s own membership/request state resolved', async () => {
    const admin = createFakeSupabase({
      projects: [
        {
          data: [{ id: 'proj-1', name: 'Sandz — Organization Home', project_type: 'transformation', objective: 'Entry point', status: 'active', owner_id: 'owner-1', is_organization_home: true }],
          error: null,
        },
      ],
      profiles: [{ data: [{ id: 'owner-1', email: 'owner@example.com' }], error: null }],
      project_members: [{ data: [{ project_id: 'proj-1', user_id: 'viewer-1', status: 'active' }], error: null }],
      project_join_requests: [{ data: [], error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await listDiscoverableProjects(fakeCtx('consultant'))

    expect(result).toEqual([
      {
        id: 'proj-1',
        name: 'Sandz — Organization Home',
        projectType: 'transformation',
        objective: 'Entry point',
        status: 'active',
        ownerEmail: 'owner@example.com',
        isOrganizationHome: true,
        viewerIsMember: true,
        viewerHasPendingJoinRequest: false,
      },
    ])
    // Never a content-shaped column (goal/details/starter_prompt/...).
    const projectsQuery = admin._calls.find((c) => c.table === 'projects' && c.method === 'eq')
    expect(projectsQuery).toBeDefined()
  })

  it('returns an empty list when nothing is discoverable', async () => {
    createAdminClientMock.mockReturnValue(createFakeSupabase({ projects: [{ data: [], error: null }] }))

    const result = await listDiscoverableProjects(fakeCtx('consultant'))
    expect(result).toEqual([])
  })
})
