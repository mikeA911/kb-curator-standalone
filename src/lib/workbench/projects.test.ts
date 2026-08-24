import { describe, it, expect, vi } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

vi.mock('@/lib/knowledge-bases', () => ({ requireActiveKnowledgeBase: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        in: async () => ({ data: [{ id: 'user-2', email: 'teammate@example.com' }], error: null }),
      }),
    }),
  }),
}))

const { createProject, detachKnowledgeBase } = await import('./projects')

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

describe('detachKnowledgeBase -- Project-Aware Knowledge and Assistant Context (Stage 1)', () => {
  it('removes only this project\'s link row, not the knowledge base itself', async () => {
    const supabase = createFakeSupabase({ project_knowledge_bases: [{ data: null, error: null }] })
    await detachKnowledgeBase(ctxWith(supabase), 'project-1', 'kb-1')

    const del = supabase._calls.find((c) => c.table === 'project_knowledge_bases' && c.method === 'delete')
    expect(del).toBeDefined()
  })
})
