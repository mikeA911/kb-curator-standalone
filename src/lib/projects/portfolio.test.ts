import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getOrganizationPortfolio } from './portfolio'

// getOrganizationPortfolio's own safety comes from the columns it selects
// (never source/document/chat content) -- these tests exercise the
// aggregation/shaping logic (counts, authority-gap diff, unpublished-draft
// flag, viewer-membership), not authorization, which is the caller's
// responsibility (the page gates on the viewer's platform role before
// choosing which client to pass in).

describe('getOrganizationPortfolio', () => {
  it('returns an empty portfolio when there are no projects', async () => {
    const supabase = createFakeSupabase({ projects: [{ data: [], error: null }] })
    const result = await getOrganizationPortfolio(supabase as never, 'viewer-1')
    expect(result).toEqual([])
  })

  it('aggregates member count, KB count, authority gaps, unpublished draft, and viewer membership', async () => {
    const supabase = createFakeSupabase({
      projects: [
        {
          data: [
            {
              id: 'proj-1',
              name: 'Sandz Pilot',
              project_type: 'consulting',
              objective: 'Pilot rollout',
              status: 'active',
              owner_id: 'owner-1',
              visibility: 'private',
              public_profile: { summary: 'draft' },
              updated_at: '2026-08-30T00:00:00Z',
            },
            {
              id: 'proj-2',
              name: 'Internal Learning',
              project_type: 'learning',
              objective: null,
              status: 'draft',
              owner_id: null,
              visibility: 'private',
              public_profile: null,
              updated_at: '2026-08-20T00:00:00Z',
            },
          ],
          error: null,
        },
      ],
      profiles: [{ data: [{ id: 'owner-1', email: 'owner@example.com' }], error: null }],
      project_members: [
        {
          data: [
            { project_id: 'proj-1', user_id: 'owner-1', status: 'active' },
            { project_id: 'proj-1', user_id: 'viewer-1', status: 'active' },
            { project_id: 'proj-1', user_id: 'inactive-1', status: 'inactive' },
          ],
          error: null,
        },
      ],
      project_knowledge_bases: [
        { data: [{ project_id: 'proj-1' }, { project_id: 'proj-1' }], error: null },
      ],
      project_approval_policies: [
        {
          data: [
            { project_id: 'proj-1', approval_type: 'pricing', requirement_status: 'required' },
            { project_id: 'proj-1', approval_type: 'technical', requirement_status: 'required' },
            { project_id: 'proj-1', approval_type: 'commercial', requirement_status: 'optional' },
          ],
          error: null,
        },
      ],
      project_authority_assignments: [
        { data: [{ project_id: 'proj-1', approval_type: 'pricing', status: 'active' }], error: null },
      ],
    })

    const result = await getOrganizationPortfolio(supabase as never, 'viewer-1')

    const proj1 = result.find((p) => p.id === 'proj-1')!
    const proj2 = result.find((p) => p.id === 'proj-2')!

    expect(proj1).toEqual({
      id: 'proj-1',
      name: 'Sandz Pilot',
      projectType: 'consulting',
      objective: 'Pilot rollout',
      status: 'active',
      ownerEmail: 'owner@example.com',
      activeMemberCount: 2,
      knowledgeBaseCount: 2,
      authorityGapCount: 1, // 'technical' required but unassigned; 'pricing' is covered
      hasUnpublishedDraft: true,
      updatedAt: '2026-08-30T00:00:00Z',
      viewerIsMember: true,
    })

    expect(proj2).toEqual({
      id: 'proj-2',
      name: 'Internal Learning',
      projectType: 'learning',
      objective: null,
      status: 'draft',
      ownerEmail: null,
      activeMemberCount: 0,
      knowledgeBaseCount: 0,
      authorityGapCount: 0,
      hasUnpublishedDraft: false,
      updatedAt: '2026-08-20T00:00:00Z',
      viewerIsMember: false,
    })
  })
})
