import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { reviewArtifact } from './workstreams'

function ctx(supabase: unknown) {
  return { user: { id: 'user-1' }, profile: { role: 'curator' }, supabase } as never
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
