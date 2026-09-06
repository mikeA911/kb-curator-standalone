import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from './context'

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: (...args: unknown[]) => createAdminClientMock(...args) }))

const {
  submitWorkstreamForPromotion,
  listPendingWorkstreamPromotions,
  listPendingWorkstreamPromotionsForProject,
  approveWorkstreamPromotion,
  rejectWorkstreamPromotion,
} = await import('./workstream-promotions')

beforeEach(() => {
  createAdminClientMock.mockReset()
})

function ctxWith(supabase: unknown, opts: { userId?: string; role?: string } = {}): WorkbenchCallerContext {
  return {
    user: { id: opts.userId ?? 'builder-1' },
    profile: { role: opts.role ?? 'consultant' },
    supabase,
  } as unknown as WorkbenchCallerContext
}

describe('submitWorkstreamForPromotion', () => {
  it('rejects a caller who is not an active member of this workstream\'s project', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1', project_id: 'proj-1', status: 'completed' }, error: null }],
      project_members: [{ data: null, error: null }],
    })
    await expect(submitWorkstreamForPromotion(ctxWith(supabase), 'ws-1')).rejects.toThrow('active member')
  })

  it('lets any active member submit, not just the Project owner (Enterprise team case)', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1', project_id: 'proj-1', status: 'completed' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
      workstream_artifacts: [{ data: [{ id: 'art-1' }], error: null }],
      workstream_promotions: [
        { data: null, error: null },
        { data: { id: 'promo-1' }, error: null },
      ],
    })
    const result = await submitWorkstreamForPromotion(ctxWith(supabase), 'ws-1')
    expect(result).toEqual({ promotionId: 'promo-1' })
  })

  it('rejects a workstream that is not completed', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1', project_id: 'proj-1', status: 'active' }, error: null }],
      project_members: [{ data: { role: 'owner' }, error: null }],
    })
    await expect(submitWorkstreamForPromotion(ctxWith(supabase), 'ws-1')).rejects.toThrow('Only a completed workstream')
  })

  it('rejects a workstream with no approved artifacts', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1', project_id: 'proj-1', status: 'completed' }, error: null }],
      project_members: [{ data: { role: 'owner' }, error: null }],
      workstream_artifacts: [{ data: [], error: null }],
    })
    await expect(submitWorkstreamForPromotion(ctxWith(supabase), 'ws-1')).rejects.toThrow('At least one approved artifact')
  })

  it('rejects a duplicate pending/approved promotion for the same workstream', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1', project_id: 'proj-1', status: 'completed' }, error: null }],
      project_members: [{ data: { role: 'owner' }, error: null }],
      workstream_artifacts: [{ data: [{ id: 'art-1' }], error: null }],
      workstream_promotions: [{ data: { id: 'existing-promo-1' }, error: null }],
    })
    await expect(submitWorkstreamForPromotion(ctxWith(supabase), 'ws-1')).rejects.toThrow('already has a pending or approved promotion')
  })

  it('accepts a valid submission from the Project owner (Builder solo-Project case)', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1', project_id: 'proj-1', status: 'completed' }, error: null }],
      project_members: [{ data: { role: 'owner' }, error: null }],
      workstream_artifacts: [{ data: [{ id: 'art-1' }], error: null }],
      workstream_promotions: [
        { data: null, error: null }, // no existing promotion
        { data: { id: 'promo-1' }, error: null }, // the insert
      ],
    })
    const result = await submitWorkstreamForPromotion(ctxWith(supabase), 'ws-1')
    expect(result).toEqual({ promotionId: 'promo-1' })
    const insert = supabase._calls.find((c) => c.table === 'workstream_promotions' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ workstream_id: 'ws-1', submitted_by: 'builder-1' })
  })
})

describe('listPendingWorkstreamPromotions', () => {
  it('returns an empty array when nothing is pending', async () => {
    const supabase = createFakeSupabase({ workstream_promotions: [{ data: [], error: null }] })
    const result = await listPendingWorkstreamPromotions(ctxWith(supabase))
    expect(result).toEqual([])
  })

  it('shapes pending promotions with workstream/project/submitter metadata via the admin client', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [{ data: [{ id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'builder-1', created_at: '2026-09-06' }], error: null }],
    })
    const admin = createFakeSupabase({
      project_workstreams: [{ data: [{ id: 'ws-1', name: 'Acme Order Automation', project_id: 'proj-1' }], error: null }],
      projects: [{ data: [{ id: 'proj-1', name: 'builder1 — Builder Workspace' }], error: null }],
      profiles: [{ data: [{ id: 'builder-1', email: 'builder1@example.com' }], error: null }],
      workstream_artifacts: [{ data: [{ workstream_id: 'ws-1' }, { workstream_id: 'ws-1' }], error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await listPendingWorkstreamPromotions(ctxWith(supabase))

    expect(result).toEqual([
      {
        id: 'promo-1',
        workstreamName: 'Acme Order Automation',
        projectName: 'builder1 — Builder Workspace',
        submitterEmail: 'builder1@example.com',
        approvedArtifactCount: 2,
        createdAt: '2026-09-06',
      },
    ])
  })
})

describe('listPendingWorkstreamPromotionsForProject', () => {
  it('returns an empty array when the project has no workstreams', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: [], error: null }] })
    const result = await listPendingWorkstreamPromotionsForProject(ctxWith(supabase), 'proj-1')
    expect(result).toEqual([])
  })

  it('scopes the promotion list to this project\'s own workstreams (RLS narrows the rest)', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: [{ id: 'ws-1' }, { id: 'ws-2' }], error: null }],
      workstream_promotions: [{ data: [{ id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'member-1', created_at: '2026-09-06' }], error: null }],
    })
    const admin = createFakeSupabase({
      project_workstreams: [{ data: [{ id: 'ws-1', name: 'VL Policy FAQ', project_id: 'proj-1' }], error: null }],
      projects: [{ data: [{ id: 'proj-1', name: 'HR Team Project' }], error: null }],
      profiles: [{ data: [{ id: 'member-1', email: 'member@example.com' }], error: null }],
      workstream_artifacts: [{ data: [{ workstream_id: 'ws-1' }], error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await listPendingWorkstreamPromotionsForProject(ctxWith(supabase), 'proj-1')

    expect(result).toEqual([
      {
        id: 'promo-1',
        workstreamName: 'VL Policy FAQ',
        projectName: 'HR Team Project',
        submitterEmail: 'member@example.com',
        approvedArtifactCount: 1,
        createdAt: '2026-09-06',
      },
    ])
    const inQuery = supabase._calls.find((c) => c.table === 'workstream_promotions' && c.method === 'eq')
    expect(inQuery).toBeDefined()
  })
})

describe('approveWorkstreamPromotion', () => {
  it('rejects the submitter deciding their own promotion, even if they hold owner/curator on that Project', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [{ data: { id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'builder-1', status: 'pending' }, error: null }],
    })
    await expect(approveWorkstreamPromotion(ctxWith(supabase, { userId: 'builder-1', role: 'consultant' }), 'promo-1')).rejects.toThrow(
      'cannot decide a promotion you submitted yourself'
    )
  })

  it('rejects a caller who is neither admin nor this Project\'s own owner/curator', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [{ data: { id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'member-1', status: 'pending' }, error: null }],
      project_workstreams: [{ data: { project_id: 'proj-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })
    await expect(approveWorkstreamPromotion(ctxWith(supabase, { userId: 'other-1', role: 'consultant' }), 'promo-1')).rejects.toThrow(
      'owner or curator role'
    )
  })

  it('is a no-op on a promotion that is no longer pending', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [{ data: { id: 'promo-1', submitted_by: 'someone-else', status: 'approved' }, error: null }],
    })
    await expect(approveWorkstreamPromotion(ctxWith(supabase, { role: 'admin' }), 'promo-1')).rejects.toThrow('already been decided')
  })

  it('lets a platform admin decide a Builder\'s solo-Project promotion (admin bypass, no extra project-role lookup)', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [
        { data: { id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'builder-1', status: 'pending' }, error: null },
        { data: [{ id: 'promo-1' }], error: null }, // decision update
      ],
    })
    const admin = createFakeSupabase({
      project_workstreams: [
        { data: { id: 'ws-1', name: 'Acme Order Automation' }, error: null },
        { data: { id: 'new-ws-1' }, error: null }, // new workstream insert
      ],
      workstream_artifacts: [
        { data: [{ artifact_type: 'design_note', title: 'Architecture', external_tool: null, content: 'text', external_url: null, notes: null, created_by: 'builder-1' }], error: null },
      ],
      projects: [{ data: { id: 'new-proj-1' }, error: null }],
      project_members: [{ data: null, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await approveWorkstreamPromotion(ctxWith(supabase, { userId: 'operator-1', role: 'admin' }), 'promo-1')

    expect(result).toEqual({ createdProjectId: 'new-proj-1' })
    const projectInsert = admin._calls.find((c) => c.table === 'projects' && c.method === 'insert')
    expect(projectInsert?.args).toMatchObject({ name: 'Acme Order Automation', project_type: 'consulting', owner_id: 'operator-1' })
    const memberInsert = admin._calls.find((c) => c.table === 'project_members' && c.method === 'insert')
    expect(memberInsert?.args).toMatchObject({ project_id: 'new-proj-1', user_id: 'builder-1', role: 'consultant', status: 'active' })
    const artifactInsert = admin._calls.find((c) => c.table === 'workstream_artifacts' && c.method === 'insert')
    expect(artifactInsert?.args).toMatchObject([expect.objectContaining({ workstream_id: 'new-ws-1', title: 'Architecture', status: 'approved' })])
    const decisionUpdate = supabase._calls.find((c) => c.table === 'workstream_promotions' && c.method === 'update')
    expect(decisionUpdate?.args).toMatchObject({ status: 'approved', decided_by: 'operator-1', created_project_id: 'new-proj-1' })
  })

  it('lets an ordinary team\'s own curator decide -- platform role merely consultant, project role curator (HR Manager case)', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [
        { data: { id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'member-1', status: 'pending' }, error: null },
        { data: [{ id: 'promo-1' }], error: null }, // decision update
      ],
      project_workstreams: [{ data: { project_id: 'proj-1' }, error: null }], // requireProjectCuratorForWorkstream's own lookup
      project_members: [{ data: { role: 'curator' }, error: null }], // getActiveProjectRole
    })
    const admin = createFakeSupabase({
      project_workstreams: [
        { data: { id: 'ws-1', name: 'VL Policy FAQ' }, error: null },
        { data: { id: 'new-ws-1' }, error: null },
      ],
      workstream_artifacts: [{ data: [], error: null }],
      projects: [{ data: { id: 'new-proj-1' }, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await approveWorkstreamPromotion(ctxWith(supabase, { userId: 'hr-manager-1', role: 'consultant' }), 'promo-1')

    expect(result).toEqual({ createdProjectId: 'new-proj-1' })
    const projectInsert = admin._calls.find((c) => c.table === 'projects' && c.method === 'insert')
    expect(projectInsert?.args).toMatchObject({ name: 'VL Policy FAQ', owner_id: 'hr-manager-1' })
  })
})

describe('rejectWorkstreamPromotion', () => {
  it('rejects the submitter deciding their own promotion', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [{ data: { id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'builder-1', status: 'pending' }, error: null }],
    })
    await expect(rejectWorkstreamPromotion(ctxWith(supabase, { userId: 'builder-1' }), 'promo-1')).rejects.toThrow(
      'cannot decide a promotion you submitted yourself'
    )
  })

  it('rejects a caller who is neither admin nor this Project\'s own owner/curator', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [{ data: { id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'member-1', status: 'pending' }, error: null }],
      project_workstreams: [{ data: { project_id: 'proj-1' }, error: null }],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })
    await expect(rejectWorkstreamPromotion(ctxWith(supabase, { userId: 'other-1', role: 'consultant' }), 'promo-1')).rejects.toThrow(
      'owner or curator role'
    )
  })

  it('flips status to rejected with no side effects on Projects/Workstreams', async () => {
    const supabase = createFakeSupabase({
      workstream_promotions: [
        { data: { id: 'promo-1', workstream_id: 'ws-1', submitted_by: 'member-1', status: 'pending' }, error: null },
        { data: [{ id: 'promo-1' }], error: null },
      ],
    })
    await rejectWorkstreamPromotion(ctxWith(supabase, { userId: 'operator-1', role: 'admin' }), 'promo-1', 'Not viable yet')
    const decisionUpdate = supabase._calls.find((c) => c.table === 'workstream_promotions' && c.method === 'update')
    expect(decisionUpdate?.args).toMatchObject({ status: 'rejected', decided_by: 'operator-1', decision_reason: 'Not viable yet' })
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})
