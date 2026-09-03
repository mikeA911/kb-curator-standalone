import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

vi.mock('@/lib/knowledge-bases', () => ({ requireActiveKnowledgeBase: vi.fn() }))
const createUserMock = vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null })
const adminInsertMock = vi.fn().mockResolvedValue({ data: null, error: null })
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: (...args: unknown[]) => createUserMock(...args) } },
    from: () => ({
      select: () => ({
        in: async () => ({ data: [{ id: 'user-2', email: 'teammate@example.com' }], error: null }),
      }),
      // createProject's best-effort project_status_history log (see
      // logStatusChange in ./projects) also goes through this admin
      // client -- a no-op insert here keeps that logging silent in tests
      // that don't care about it, rather than a swallowed-but-noisy error.
      insert: (...args: unknown[]) => adminInsertMock(...args),
    }),
  }),
}))

const { createProject, detachKnowledgeBase, searchProjects, createAndAddProjectMember } = await import('./projects')

function ctxWith(supabase: unknown) {
  return { user: { id: 'user-1', email: 'owner@example.com' }, profile: { role: 'consultant' }, supabase } as never
}

describe('createProject -- Governance & Approvals staging (Stage 1)', () => {
  it('inserts a policy row and no assignment row for an unassigned "Authority needed" approval', async () => {
    const supabase = createFakeSupabase({
      projects: [{ data: { id: 'project-1' }, error: null }],
      project_approval_policies: [{ data: null, error: null }],
    })

    await createProject(ctxWith(supabase), {
      name: 'Client Engagement',
      projectType: 'consulting',
      objective: '',
      details: {},
      knowledgeBaseId: null,
      evalDatasetId: null,
      members: [],
      approvals: [{ approvalType: 'commercial', requirementStatus: 'required', assigneeEmail: null }],
    })

    const policyInsert = supabase._calls.find((c) => c.table === 'project_approval_policies' && c.method === 'insert')
    expect(policyInsert?.args).toEqual([expect.objectContaining({ approval_type: 'commercial', requirement_status: 'required' })])
    const assignmentInsert = supabase._calls.find((c) => c.table === 'project_authority_assignments')
    expect(assignmentInsert).toBeUndefined()
  })

  it("resolves the '__self__' sentinel to the creator's own user id", async () => {
    const supabase = createFakeSupabase({
      projects: [{ data: { id: 'project-1' }, error: null }],
      project_approval_policies: [{ data: null, error: null }],
      project_authority_assignments: [{ data: null, error: null }],
    })

    await createProject(ctxWith(supabase), {
      name: 'Client Engagement',
      projectType: 'consulting',
      objective: '',
      details: {},
      knowledgeBaseId: null,
      evalDatasetId: null,
      members: [],
      approvals: [{ approvalType: 'technical', requirementStatus: 'required', assigneeEmail: '__self__' }],
    })

    const assignmentInsert = supabase._calls.find((c) => c.table === 'project_authority_assignments' && c.method === 'insert')
    expect((assignmentInsert?.args as { user_id: string }[])[0].user_id).toBe('user-1')
  })

  it('resolves a staged member email to their user id for the authority assignment', async () => {
    const supabase = createFakeSupabase({
      projects: [{ data: { id: 'project-1' }, error: null }],
      project_approval_policies: [{ data: null, error: null }],
      project_authority_assignments: [{ data: null, error: null }],
    })

    await createProject(ctxWith(supabase), {
      name: 'Client Engagement',
      projectType: 'consulting',
      objective: '',
      details: {},
      knowledgeBaseId: null,
      evalDatasetId: null,
      members: [{ email: 'teammate@example.com', role: 'consultant' }],
      approvals: [{ approvalType: 'proposal_release', requirementStatus: 'required', assigneeEmail: 'teammate@example.com' }],
    })

    const assignmentInsert = supabase._calls.find((c) => c.table === 'project_authority_assignments' && c.method === 'insert')
    expect((assignmentInsert?.args as { user_id: string }[])[0].user_id).toBe('user-2')
  })
})

// docs/dev-request-ember-onboarding-capability-gaps.md, item 1 -- backs the
// Ember search_projects tool.
describe('searchProjects', () => {
  it('returns an empty array without querying for a too-short query', async () => {
    const supabase = createFakeSupabase({ projects: [{ data: [{ id: 'x', name: 'Should not be reached' }], error: null }] })
    const result = await searchProjects(ctxWith(supabase), 'a')
    expect(result).toEqual([])
  })

  it('maps matching rows to the tool-facing shape, using the caller\'s own RLS-scoped client', async () => {
    const supabase = createFakeSupabase({
      projects: [
        {
          data: [{ id: 'proj-1', name: 'Sandz–Zadara Pilot', project_type: 'consulting', status: 'draft', objective: 'Pilot proposals' }],
          error: null,
        },
      ],
    })

    const result = await searchProjects(ctxWith(supabase), 'Sandz')

    expect(result).toEqual([
      { id: 'proj-1', name: 'Sandz–Zadara Pilot', projectType: 'consulting', status: 'draft', objective: 'Pilot proposals' },
    ])
  })
})

describe('detachKnowledgeBase -- Project-Aware Knowledge and Assistant Context (Stage 1)', () => {
  it('removes only this project\'s link row, not the knowledge base itself', async () => {
    const supabase = createFakeSupabase({ project_knowledge_bases: [{ data: null, error: null }] })
    await detachKnowledgeBase(ctxWith(supabase), 'project-1', 'kb-1')

    const del = supabase._calls.find((c) => c.table === 'project_knowledge_bases' && c.method === 'delete')
    expect(del).toBeDefined()
  })
})

// Collapses "create the account on /admin, then go add them to the
// project" into one admin-only action -- addProjectMember's own "No account
// found" error was the real remaining Phase-5 onboarding gap for the Sandz
// pilot.
describe('createAndAddProjectMember', () => {
  beforeEach(() => {
    createUserMock.mockClear()
    adminInsertMock.mockClear()
  })

  function adminCtxWith(supabase: unknown) {
    return { user: { id: 'admin-1', email: 'admin@example.com' }, profile: { role: 'admin' }, supabase } as never
  }

  it('rejects a non-admin caller before creating anything', async () => {
    const supabase = createFakeSupabase({})
    await expect(
      createAndAddProjectMember(ctxWith(supabase), {
        projectId: 'project-1',
        email: 'new-hire@sandz.example',
        password: 'a-real-password',
        projectRole: 'consultant',
        platformRole: 'member',
      })
    ).rejects.toThrow('Requires admin role')
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('rejects a password under 8 characters before creating anything', async () => {
    const supabase = createFakeSupabase({})
    await expect(
      createAndAddProjectMember(adminCtxWith(supabase), {
        projectId: 'project-1',
        email: 'new-hire@sandz.example',
        password: 'short',
        projectRole: 'consultant',
        platformRole: 'member',
      })
    ).rejects.toThrow('Password must be at least 8 characters')
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('creates the auth user, the profile with the requested platform role, and the project membership', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: null, error: null }] })

    await createAndAddProjectMember(adminCtxWith(supabase), {
      projectId: 'project-1',
      email: 'new-hire@sandz.example',
      password: 'a-real-password',
      projectRole: 'curator',
      platformRole: 'member',
    })

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new-hire@sandz.example', password: 'a-real-password', email_confirm: true })
    )
    expect(adminInsertMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-user-1', email: 'new-hire@sandz.example', role: 'member' }))
    const memberInsert = supabase._calls.find((c) => c.table === 'project_members' && c.method === 'insert')
    expect(memberInsert?.args).toEqual({ project_id: 'project-1', user_id: 'new-user-1', role: 'curator', status: 'active' })
  })
})
