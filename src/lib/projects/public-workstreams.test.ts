import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import {
  listPublicWorkstreams,
  getPublicWorkstreamById,
  listPublicArtifacts,
  listPublicAnswersForVersion,
  listPublicAssessmentSummariesForProject,
  getPublicAssessmentMatrixForVersion,
} from './public-workstreams'

describe('listPublicWorkstreams / getPublicWorkstreamById', () => {
  it('returns [] rather than null when there are no rows', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: null, error: null }] })
    expect(await listPublicWorkstreams(supabase as never, 'p-1')).toEqual([])
  })

  it('returns null (not throw) when nothing matches -- maybeSingle semantics', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: null, error: null }] })
    expect(await getPublicWorkstreamById(supabase as never, 'missing')).toBeNull()
  })
})

describe('listPublicArtifacts', () => {
  it('returns [] rather than null when there are no rows', async () => {
    const supabase = createFakeSupabase({ workstream_artifacts: [{ data: null, error: null }] })
    expect(await listPublicArtifacts(supabase as never, 'w-1')).toEqual([])
  })
})

describe('listPublicAnswersForVersion', () => {
  it('short-circuits to [] without querying when there are no questions', async () => {
    const supabase = createFakeSupabase({})
    expect(await listPublicAnswersForVersion(supabase as never, [])).toEqual([])
  })
})

describe('listPublicAssessmentSummariesForProject', () => {
  it('reports zero questions/responses for an assessment with no active version yet', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: [{ id: 'a-1', current_version_id: null }], error: null }],
    })
    const summaries = await listPublicAssessmentSummariesForProject(supabase as never, 'p-1')
    expect(summaries).toEqual([{ assessment: { id: 'a-1', current_version_id: null }, activeVersion: null, questionCount: 0, responses: [] }])
  })

  it('computes answered-count per response -- every response returned here is already completed-only per RLS', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: [{ id: 'a-1', current_version_id: 'v-1' }], error: null }],
      system_assessment_versions: [{ data: { id: 'v-1', version_number: 1, status: 'active' }, error: null }],
      system_assessment_questions: [
        {
          data: [
            { id: 'q-1', sequence: 1 },
            { id: 'q-2', sequence: 2 },
          ],
          error: null,
        },
      ],
      assessment_responses: [{ data: [{ id: 'r-1', participant_label: 'Claude Code' }], error: null }],
      assessment_answers: [{ data: [{ response_id: 'r-1', question_id: 'q-1' }], error: null }],
    })

    const [summary] = await listPublicAssessmentSummariesForProject(supabase as never, 'p-1')

    expect(summary.questionCount).toBe(2)
    expect(summary.responses).toEqual([{ participantLabel: 'Claude Code', answeredCount: 1 }])
  })
})

describe('getPublicAssessmentMatrixForVersion', () => {
  it('returns null when the version does not belong to the given assessment', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1' }, error: null }],
      system_assessment_versions: [{ data: { id: 'v-1', assessment_id: 'a-OTHER' }, error: null }],
    })
    expect(await getPublicAssessmentMatrixForVersion(supabase as never, 'a-1', 'v-1')).toBeNull()
  })

  it('keys answers by "questionId:responseId" so a specific cell is O(1) to look up', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1' }, error: null }],
      system_assessment_versions: [{ data: { id: 'v-1', assessment_id: 'a-1' }, error: null }],
      system_assessment_questions: [{ data: [{ id: 'q-1' }], error: null }],
      assessment_responses: [{ data: [{ id: 'r-1' }], error: null }],
      assessment_answers: [{ data: [{ id: 'ans-1', question_id: 'q-1', response_id: 'r-1', answer: 'Yes' }], error: null }],
    })

    const matrix = await getPublicAssessmentMatrixForVersion(supabase as never, 'a-1', 'v-1')

    expect(matrix?.answerByKey.get('q-1:r-1')).toEqual({ id: 'ans-1', question_id: 'q-1', response_id: 'r-1', answer: 'Yes' })
  })
})
