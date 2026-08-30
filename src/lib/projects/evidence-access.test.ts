import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

const { classifyResource, EvidenceAccessValidationError, grantGroupMembership, revokeGroupMembership, setProjectInformationSensitivity } =
  await import('./evidence-access')

beforeEach(() => {
  createAdminClientMock.mockReset()
})

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>): WorkbenchCallerContext {
  return { user: { id: 'owner-1' }, profile: {}, supabase } as unknown as WorkbenchCallerContext
}

function fakeAdmin() {
  const admin = createFakeSupabase({ resource_access_audit_log: [{ data: {}, error: null }, { data: {}, error: null }, { data: {}, error: null }] })
  createAdminClientMock.mockReturnValue(admin)
  return admin
}

describe('classifyResource', () => {
  it('refuses to restrict a resource with no group or named-user grant in the same call -- would be unreadable by anyone, including the classifier', async () => {
    const supabase = createFakeSupabase({})
    fakeAdmin()

    await expect(
      classifyResource(fakeCtx(supabase), 'proj-1', {
        resourceType: 'knowledge_source',
        resourceId: 'src-1',
        classification: 'commercial_confidential',
      })
    ).rejects.toBeInstanceOf(EvidenceAccessValidationError)

    // No policy row should have been written before the guard rejected it.
    expect(supabase._calls.find((c) => c.table === 'resource_access_policies')).toBeUndefined()
  })

  it('allows project_general with no grants -- an explicit "no restriction" classification', async () => {
    const supabase = createFakeSupabase({
      resource_access_policies: [
        { data: null, error: null }, // existing-policy lookup: none yet
        { data: { id: 'policy-1' }, error: null }, // upsert result
      ],
    })
    const admin = fakeAdmin()

    await classifyResource(fakeCtx(supabase), 'proj-1', {
      resourceType: 'knowledge_source',
      resourceId: 'src-1',
      classification: 'project_general',
    })

    const upsertCall = supabase._calls.find((c) => c.table === 'resource_access_policies' && c.method === 'upsert')
    expect(upsertCall?.args).toMatchObject({ resource_type: 'knowledge_source', resource_id: 'src-1', classification: 'project_general' })

    const auditCall = admin._calls.find((c) => c.table === 'resource_access_audit_log' && c.method === 'insert')
    expect(auditCall?.args).toMatchObject({ event_type: 'resource_classified', to_classification: 'project_general' })
  })

  it('restricting with a group grant writes the grant row and both a resource_grant_granted and a resource_classified audit entry', async () => {
    const supabase = createFakeSupabase({
      resource_access_policies: [
        { data: null, error: null },
        { data: { id: 'policy-1' }, error: null },
      ],
      resource_access_grants: [{ data: { id: 'grant-1' }, error: null }],
    })
    const admin = fakeAdmin()

    await classifyResource(fakeCtx(supabase), 'proj-1', {
      resourceType: 'knowledge_source',
      resourceId: 'src-1',
      classification: 'commercial_confidential',
      groupIds: ['group-1'],
    })

    const grantCall = supabase._calls.find((c) => c.table === 'resource_access_grants' && c.method === 'insert')
    expect(grantCall?.args).toMatchObject({ resource_access_policy_id: 'policy-1', project_access_group_id: 'group-1', project_member_id: null, status: 'active' })

    const auditInserts = admin._calls.filter((c) => c.table === 'resource_access_audit_log' && c.method === 'insert')
    expect(auditInserts.map((c) => (c.args as { event_type: string }).event_type)).toEqual(
      expect.arrayContaining(['resource_grant_granted', 'resource_classified'])
    )
  })

  it('reclassifying an already-classified resource logs resource_reclassified with the prior classification', async () => {
    const supabase = createFakeSupabase({
      resource_access_policies: [
        { data: { id: 'policy-1', classification: 'internal_confidential' }, error: null }, // already classified
        { data: { id: 'policy-1' }, error: null },
      ],
      resource_access_grants: [{ data: { id: 'grant-1' }, error: null }],
    })
    const admin = fakeAdmin()

    await classifyResource(fakeCtx(supabase), 'proj-1', {
      resourceType: 'knowledge_source',
      resourceId: 'src-1',
      classification: 'commercial_confidential',
      memberIds: ['member-1'],
    })

    const auditInserts = admin._calls.filter((c) => c.table === 'resource_access_audit_log' && c.method === 'insert')
    const reclassifyEntry = auditInserts.map((c) => c.args as { event_type: string; from_classification: string; to_classification: string }).find((a) => a.event_type === 'resource_reclassified')
    expect(reclassifyEntry).toMatchObject({ from_classification: 'internal_confidential', to_classification: 'commercial_confidential' })
  })
})

describe('grantGroupMembership / revokeGroupMembership', () => {
  it('grants insert an active row and log group_member_granted', async () => {
    const supabase = createFakeSupabase({ project_access_group_members: [{ data: {}, error: null }] })
    const admin = fakeAdmin()

    await grantGroupMembership(fakeCtx(supabase), 'proj-1', 'group-1', 'member-1')

    const insertCall = supabase._calls.find((c) => c.table === 'project_access_group_members' && c.method === 'insert')
    expect(insertCall?.args).toMatchObject({ project_access_group_id: 'group-1', project_member_id: 'member-1', status: 'active' })
    const auditCall = admin._calls.find((c) => c.table === 'resource_access_audit_log' && c.method === 'insert')
    expect(auditCall?.args).toMatchObject({ event_type: 'group_member_granted', target_group_id: 'group-1', target_member_id: 'member-1' })
  })

  it('revoking updates status to revoked with the reason, rather than deleting the row', async () => {
    const supabase = createFakeSupabase({
      project_access_group_members: [{ data: { project_access_group_id: 'group-1', project_member_id: 'member-1' }, error: null }],
    })
    const admin = fakeAdmin()

    await revokeGroupMembership(fakeCtx(supabase), 'proj-1', 'gm-1', 'no longer on the account')

    const updateCall = supabase._calls.find((c) => c.table === 'project_access_group_members' && c.method === 'update')
    expect(updateCall?.args).toMatchObject({ status: 'revoked', revocation_reason: 'no longer on the account' })
    const auditCall = admin._calls.find((c) => c.table === 'resource_access_audit_log' && c.method === 'insert')
    expect(auditCall?.args).toMatchObject({ event_type: 'group_member_revoked' })
  })
})

// docs/dev-request-ember-onboarding-capability-gaps.md, item 2 -- the
// select().single() addition closes a false-success gap the Ember
// classify_project tool would otherwise be exposed to (no page-level "can
// you even see this control" gate the way the human UI has).
describe('setProjectInformationSensitivity', () => {
  it('updates the project row when the caller is its manager', async () => {
    const supabase = createFakeSupabase({ projects: [{ data: { id: 'proj-1' }, error: null }] })

    await setProjectInformationSensitivity(fakeCtx(supabase), 'proj-1', 'restricted')

    const updateCall = supabase._calls.find((c) => c.table === 'projects' && c.method === 'update')
    expect(updateCall?.args).toEqual({ information_sensitivity: 'restricted' })
  })

  it('throws rather than silently no-oping when RLS blocks the update (caller is not this project\'s manager)', async () => {
    const supabase = createFakeSupabase({ projects: [{ data: null, error: new Error('no rows matched') }] })

    await expect(setProjectInformationSensitivity(fakeCtx(supabase), 'proj-1', 'restricted')).rejects.toThrow('no rows matched')
  })
})
