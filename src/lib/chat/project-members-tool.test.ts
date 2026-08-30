import { describe, it, expect, vi } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// Reassigned per test before calling runListProjectMembers -- the mock
// factory below reads this closure at call time, so each test can point
// createAdminClient() at its own fake profiles table without needing
// vi.doMock/resetModules gymnastics.
let adminSupabase: ReturnType<typeof createFakeSupabase> = createFakeSupabase({})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminSupabase }))

const { runListProjectMembers } = await import('./project-members-tool')

function fakeCtx(supabase: unknown): WorkbenchCallerContext {
  return { user: { id: 'viewer-1' }, profile: { id: 'viewer-1', role: 'consultant' }, supabase } as unknown as WorkbenchCallerContext
}

// runListProjectMembers's own safety comes from querying project_members
// (ctx.supabase, RLS-scoped) first -- these tests exercise shaping/search,
// not authorization, which the RLS policy (project_members_select_member)
// covers, same convention as project-knowledge-tool.test.ts.

describe('runListProjectMembers', () => {
  it('returns [] without querying profiles/authorities when there are no active members', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: [], error: null }] })
    const result = await runListProjectMembers(fakeCtx(supabase), 'proj-1', {})
    expect(result).toEqual({ members: [] })
  })

  it('shapes each member with display label, role, owner status, business function, and approval responsibilities', async () => {
    const supabase = createFakeSupabase({
      project_members: [
        {
          data: [
            { user_id: 'u-1', role: 'owner', business_function: 'delivery_consulting' },
            { user_id: 'u-2', role: 'viewer', business_function: null },
          ],
          error: null,
        },
      ],
      project_authority_assignments: [
        {
          data: [{ user_id: 'u-1', approval_type: 'pricing', monetary_limit: 5000, discount_limit_percent: null }],
          error: null,
        },
      ],
    })
    adminSupabase = createFakeSupabase({
      profiles: [
        {
          data: [
            { id: 'u-1', email: 'owner@example.com', full_name: 'Owner Person' },
            { id: 'u-2', email: 'viewer@example.com', full_name: null },
          ],
          error: null,
        },
      ],
    })

    const result = await runListProjectMembers(fakeCtx(supabase), 'proj-1', {})

    expect(result.members).toEqual([
      {
        userId: 'u-1',
        displayLabel: 'Owner Person',
        role: 'owner',
        isOwner: true,
        businessFunction: 'delivery_consulting',
        approvalResponsibilities: [{ approvalType: 'pricing', monetaryLimit: 5000, discountLimitPercent: null }],
      },
      {
        userId: 'u-2',
        displayLabel: 'viewer@example.com',
        role: 'viewer',
        isOwner: false,
        businessFunction: null,
        approvalResponsibilities: [],
      },
    ])
  })

  it('filters by a bounded search string against display label, role, and business function', async () => {
    const supabase = createFakeSupabase({
      project_members: [
        {
          data: [
            { user_id: 'u-1', role: 'owner', business_function: 'delivery_consulting' },
            { user_id: 'u-2', role: 'viewer', business_function: 'finance_pricing' },
          ],
          error: null,
        },
      ],
      project_authority_assignments: [{ data: [], error: null }],
    })
    adminSupabase = createFakeSupabase({
      profiles: [
        {
          data: [
            { id: 'u-1', email: 'owner@example.com', full_name: 'Maria Owner' },
            { id: 'u-2', email: 'viewer@example.com', full_name: 'Someone Else' },
          ],
          error: null,
        },
      ],
    })

    const result = await runListProjectMembers(fakeCtx(supabase), 'proj-1', { search: 'maria' })

    expect(result.members).toHaveLength(1)
    expect(result.members[0].userId).toBe('u-1')
  })
})
