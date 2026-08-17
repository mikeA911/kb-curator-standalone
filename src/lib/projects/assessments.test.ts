import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import {
  listAssessmentsForProject,
  getAssessmentById,
  listQuestions,
  listResponses,
  listAnswersForVersion,
  listAssessmentSummariesForProject,
  getAssessmentMatrixForVersion,
} from './assessments'

describe('listAssessmentsForProject', () => {
  it('returns whatever the RLS-scoped query resolves to', async () => {
    const supabase = createFakeSupabase({ system_assessments: [{ data: [{ id: 'a-1' }], error: null }] })
    expect(await listAssessmentsForProject(supabase as never, 'p-1')).toEqual([{ id: 'a-1' }])
  })

  it('returns [] rather than null when there are no rows', async () => {
    const supabase = createFakeSupabase({ system_assessments: [{ data: null, error: null }] })
    expect(await listAssessmentsForProject(supabase as never, 'p-1')).toEqual([])
  })
})

describe('getAssessmentById', () => {
  it('returns null (not throw) when nothing matches -- maybeSingle semantics', async () => {
    const supabase = createFakeSupabase({ system_assessments: [{ data: null, error: null }] })
    expect(await getAssessmentById(supabase as never, 'missing')).toBeNull()
  })
})

describe('listAnswersForVersion', () => {
  it('short-circuits to [] without querying when there are no questions', async () => {
    const supabase = createFakeSupabase({})
    expect(await listAnswersForVersion(supabase as never, [])).toEqual([])
  })
})

describe('listAssessmentSummariesForProject', () => {
  it('reports zero questions/responses for an assessment with no active version yet', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: [{ id: 'a-1', current_version_id: null }], error: null }],
    })
    const summaries = await listAssessmentSummariesForProject(supabase as never, 'p-1')
    expect(summaries).toEqual([{ assessment: { id: 'a-1', current_version_id: null }, activeVersion: null, questionCount: 0, responses: [] }])
  })

  it('computes answered-count per response from the answers table', async () => {
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
      assessment_responses: [{ data: [{ id: 'r-1', participant_label: 'Claude Code', status: 'in_progress' }], error: null }],
      assessment_answers: [{ data: [{ response_id: 'r-1', question_id: 'q-1' }], error: null }],
    })

    const [summary] = await listAssessmentSummariesForProject(supabase as never, 'p-1')

    expect(summary.questionCount).toBe(2)
    expect(summary.responses).toEqual([{ participantLabel: 'Claude Code', status: 'in_progress', answeredCount: 1 }])
  })
})

describe('getAssessmentMatrixForVersion', () => {
  it('returns null when the version does not belong to the given assessment', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1' }, error: null }],
      system_assessment_versions: [{ data: { id: 'v-1', assessment_id: 'a-OTHER' }, error: null }],
    })
    expect(await getAssessmentMatrixForVersion(supabase as never, 'a-1', 'v-1')).toBeNull()
  })

  it('keys answers by "questionId:responseId" so a specific cell is O(1) to look up', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1' }, error: null }],
      system_assessment_versions: [{ data: { id: 'v-1', assessment_id: 'a-1' }, error: null }],
      system_assessment_questions: [{ data: [{ id: 'q-1' }], error: null }],
      assessment_responses: [{ data: [{ id: 'r-1' }], error: null }],
      assessment_answers: [{ data: [{ id: 'ans-1', question_id: 'q-1', response_id: 'r-1', answer: 'Yes' }], error: null }],
    })

    const matrix = await getAssessmentMatrixForVersion(supabase as never, 'a-1', 'v-1')

    expect(matrix?.answerByKey.get('q-1:r-1')).toEqual({ id: 'ans-1', question_id: 'q-1', response_id: 'r-1', answer: 'Yes' })
  })
})

describe('listQuestions / listResponses', () => {
  it('return [] rather than null when there are no rows', async () => {
    const supabase = createFakeSupabase({
      system_assessment_questions: [{ data: null, error: null }],
      assessment_responses: [{ data: null, error: null }],
    })
    expect(await listQuestions(supabase as never, 'v-1')).toEqual([])
    expect(await listResponses(supabase as never, 'v-1')).toEqual([])
  })
})
