import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { reviewArtifact, createWorkstream } from './workstreams'

function ctx(supabase: unknown) {
  return { user: { id: 'user-1' }, profile: { role: 'curator' }, supabase } as never
}

function ctxWithProfile(supabase: unknown, profileRole: string) {
  return { user: { id: 'user-1' }, profile: { role: profileRole }, supabase } as never
}

const baseWorkstreamInput = {
  projectId: 'project-1',
  name: 'MCP Architecture',
  slug: 'mcp-architecture',
  repositoryScope: [],
  deliverables: [],
}

describe('reviewArtifact', () => {
  it('updates status/reviewer fields when the caller is authorized (RLS returns the updated row)', async () => {
    const fakeSupabase = createFakeSupabase({
      workstream_artifacts: [{ data: [{ id: 'artifact-1', workstream_id: 'ws-1' }], error: null }],
    })

    const result = await reviewArtifact(ctx(fakeSupabase), 'artifact-1', 'approved', 'Looks complete')

    expect(result).toEqual({ artifactId: 'artifact-1', workstreamId: 'ws-1', status: 'approved' })
    const update = fakeSupabase._calls.find((c) => c.table === 'workstream_artifacts' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'approved', validation_notes: 'Looks complete', reviewed_by: 'user-1' })
  })

  // RLS (workstream_artifacts_update_review_curator, can_curate_project) is
  // the real gate -- a caller who isn't the Project's owner/curator/admin
  // updates zero rows without an error, matching toggleDeliverable/
  // updateWorkstreamSummary's existing zero-rows-throws convention above in
  // this same file.
  it('throws when the caller is not authorized to review (zero rows updated)', async () => {
    const fakeSupabase = createFakeSupabase({
      workstream_artifacts: [{ data: [], error: null }],
    })

    await expect(reviewArtifact(ctx(fakeSupabase), 'artifact-1', 'rejected')).rejects.toThrow(
      'You do not have permission to review this artifact'
    )
  })

  it('stores null validation_notes when no review notes are given', async () => {
    const fakeSupabase = createFakeSupabase({
      workstream_artifacts: [{ data: [{ id: 'artifact-1', workstream_id: 'ws-1' }], error: null }],
    })

    await reviewArtifact(ctx(fakeSupabase), 'artifact-1', 'approved')

    const update = fakeSupabase._calls.find((c) => c.table === 'workstream_artifacts' && c.method === 'update')
    expect(update?.args).toMatchObject({ validation_notes: null })
  })
})

// OL-002 (2026-08-31 builder-journey report): a consultant-role project
// member offered this action by Ember got only a raw RLS policy-violation
// error. This preflight check gives a clear, specific message instead --
// RLS (project_workstreams_manage_curator) stays the real enforcement.
describe('createWorkstream -- permission preflight (OL-002 fix)', () => {
  it('rejects a caller with no active membership on the project, before attempting the insert', async () => {
    const fakeSupabase = createFakeSupabase({ project_members: [{ data: null, error: null }] })

    await expect(createWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), baseWorkstreamInput)).rejects.toThrow(
      "Creating a workstream needs this project's owner or curator role"
    )
    const insert = fakeSupabase._calls.find((c) => c.table === 'project_workstreams' && c.method === 'insert')
    expect(insert).toBeUndefined()
  })

  it('rejects a caller whose project role is consultant, naming their actual role in the message', async () => {
    const fakeSupabase = createFakeSupabase({ project_members: [{ data: { role: 'consultant' }, error: null }] })

    await expect(createWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), baseWorkstreamInput)).rejects.toThrow(
      "you're currently a consultant on this project"
    )
  })

  it('allows a project curator through to the insert', async () => {
    const fakeSupabase = createFakeSupabase({
      project_members: [{ data: { role: 'curator' }, error: null }],
      project_workstreams: [{ data: { id: 'ws-1' }, error: null }],
    })

    const result = await createWorkstream(ctxWithProfile(fakeSupabase, 'consultant'), baseWorkstreamInput)
    expect(result).toEqual({ workstreamId: 'ws-1', projectId: 'project-1' })
  })

  it('skips the project-membership lookup entirely for a platform admin', async () => {
    const fakeSupabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'ws-1' }, error: null }],
    })

    const result = await createWorkstream(ctxWithProfile(fakeSupabase, 'admin'), baseWorkstreamInput)
    expect(result).toEqual({ workstreamId: 'ws-1', projectId: 'project-1' })
    expect(fakeSupabase._calls.find((c) => c.table === 'project_members')).toBeUndefined()
  })
})
