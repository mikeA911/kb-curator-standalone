import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireUserMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireUser: (...args: unknown[]) => requireUserMock(...args),
  }
})

const {
  createAssessmentAction,
  activateAssessmentVersionAction,
  createNewAssessmentVersionAction,
  retireAssessmentVersionAction,
  saveAssessmentResponseAction,
} = await import('./assessments')

beforeEach(() => {
  requireUserMock.mockReset()
})

describe('createAssessmentAction', () => {
  it('rejects an anonymous visitor', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(
      createAssessmentAction({ projectId: 'p-1', name: 'X', instructions: 'Answer honestly.', questions: [{ title: 'T', question: 'Q?' }] })
    ).rejects.toThrow('Create an account')
  })

  it('requires at least one question', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'curator' } })
    await expect(
      createAssessmentAction({ projectId: 'p-1', name: 'X', instructions: 'Answer honestly.', questions: [] })
    ).rejects.toThrow('at least one question')
  })

  it('creates the assessment, a v1 draft version, and numbered questions -- RLS (can_curate_project) is the real permission gate', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1' }, error: null }],
      system_assessment_versions: [{ data: { id: 'v-1' }, error: null }],
      system_assessment_questions: [{ data: null, error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator', id: 'user-1' }, supabase })

    const result = await createAssessmentAction({
      projectId: 'p-1',
      name: 'CareCall System Understanding',
      instructions: 'Answer honestly.',
      questions: [
        { title: 'Tenant Isolation', question: 'Does it support multiple clients?' },
        { title: 'PII/PHI', question: 'What controls exist?' },
      ],
    })

    expect(result).toEqual({ assessmentId: 'a-1', versionId: 'v-1' })
    const versionInsert = supabase._calls.find((c) => c.table === 'system_assessment_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({ assessment_id: 'a-1', version_number: 1 })
    const questionsInsert = supabase._calls.find((c) => c.table === 'system_assessment_questions' && c.method === 'insert')
    expect(questionsInsert?.args).toEqual([
      expect.objectContaining({ assessment_version_id: 'v-1', sequence: 1, title: 'Tenant Isolation' }),
      expect.objectContaining({ assessment_version_id: 'v-1', sequence: 2, title: 'PII/PHI' }),
    ])
  })
})

describe('activateAssessmentVersionAction', () => {
  it('retires the previously active version before activating the new one', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1', project_id: 'p-1', current_version_id: 'v-1' }, error: null }],
      system_assessment_versions: [
        { data: null, error: null }, // retire v-1
        { data: [{ id: 'v-2' }], error: null }, // activate v-2
      ],
    })
    requireUserMock.mockResolvedValue({ supabase })

    await activateAssessmentVersionAction('a-1', 'v-2')

    const updates = supabase._calls.filter((c) => c.table === 'system_assessment_versions' && c.method === 'update')
    expect(updates[0].args).toEqual({ status: 'retired' })
    expect(updates[1].args).toEqual({ status: 'active' })
    const pointerUpdate = supabase._calls.find((c) => c.table === 'system_assessments' && c.method === 'update')
    expect(pointerUpdate?.args).toEqual({ current_version_id: 'v-2' })
  })

  it('does not try to retire anything when activating the first version', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1', project_id: 'p-1', current_version_id: null }, error: null }],
      system_assessment_versions: [{ data: [{ id: 'v-1' }], error: null }],
    })
    requireUserMock.mockResolvedValue({ supabase })

    await activateAssessmentVersionAction('a-1', 'v-1')

    const updates = supabase._calls.filter((c) => c.table === 'system_assessment_versions' && c.method === 'update')
    expect(updates).toHaveLength(1)
    expect(updates[0].args).toEqual({ status: 'active' })
  })

  it('throws a clear error when RLS silently rejects the activation (zero rows matched)', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'a-1', project_id: 'p-1', current_version_id: null }, error: null }],
      system_assessment_versions: [{ data: [], error: null }],
    })
    requireUserMock.mockResolvedValue({ supabase })

    await expect(activateAssessmentVersionAction('a-1', 'v-1')).rejects.toThrow('permission')
  })
})

describe('createNewAssessmentVersionAction', () => {
  it('numbers the new version one past the current highest', async () => {
    const supabase = createFakeSupabase({
      system_assessment_versions: [{ data: { version_number: 1 }, error: null }, { data: { id: 'v-2' }, error: null }],
      system_assessment_questions: [{ data: null, error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator', id: 'user-1' }, supabase })

    const result = await createNewAssessmentVersionAction({
      assessmentId: 'a-1',
      projectId: 'p-1',
      instructions: 'Updated instructions.',
      questions: [{ title: 'New question', question: 'Q?' }],
    })

    expect(result).toEqual({ versionId: 'v-2' })
    const versionInsert = supabase._calls.find((c) => c.table === 'system_assessment_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({ version_number: 2 })
  })

  it('starts at version 1 when the assessment has no prior version', async () => {
    const supabase = createFakeSupabase({
      system_assessment_versions: [{ data: null, error: null }, { data: { id: 'v-1' }, error: null }],
      system_assessment_questions: [{ data: null, error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator', id: 'user-1' }, supabase })

    await createNewAssessmentVersionAction({ assessmentId: 'a-1', projectId: 'p-1', instructions: 'X', questions: [{ title: 'T', question: 'Q?' }] })

    const versionInsert = supabase._calls.find((c) => c.table === 'system_assessment_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({ version_number: 1 })
  })
})

describe('retireAssessmentVersionAction', () => {
  it('throws a clear error when RLS silently rejects the update (zero rows matched)', async () => {
    const supabase = createFakeSupabase({ system_assessment_versions: [{ data: [], error: null }] })
    requireUserMock.mockResolvedValue({ supabase })

    await expect(retireAssessmentVersionAction('v-1', 'p-1')).rejects.toThrow('permission')
  })
})

describe('saveAssessmentResponseAction', () => {
  it('rejects an anonymous visitor', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(
      saveAssessmentResponseAction({ assessmentVersionId: 'v-1', participantLabel: 'Claude Code', answers: [], markCompleted: false })
    ).rejects.toThrow('Create an account')
  })

  it('rejects a blank participant label', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant' } })
    await expect(
      saveAssessmentResponseAction({ assessmentVersionId: 'v-1', participantLabel: '   ', answers: [], markCompleted: false })
    ).rejects.toThrow('Participant')
  })

  it('upserts the response as in_progress when not marking complete, and upserts every answer', async () => {
    const supabase = createFakeSupabase({
      system_assessment_versions: [{ data: { project_id: 'p-1' }, error: null }],
      assessment_responses: [{ data: { id: 'r-1' }, error: null }],
      assessment_answers: [{ data: null, error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    const result = await saveAssessmentResponseAction({
      assessmentVersionId: 'v-1',
      participantLabel: 'Claude Code',
      answers: [{ questionId: 'q-1', answer: 'Yes, via RLS.', classification: 'CONFIRMED', evidence: 'lib.ts:10' }],
      markCompleted: false,
    })

    expect(result).toEqual({ responseId: 'r-1' })
    const responseUpsert = supabase._calls.find((c) => c.table === 'assessment_responses' && c.method === 'upsert')
    expect(responseUpsert?.args).toMatchObject({ status: 'in_progress', participant_label: 'Claude Code', created_by: 'user-1' })
    const answersUpsert = supabase._calls.find((c) => c.table === 'assessment_answers' && c.method === 'upsert')
    expect(answersUpsert?.args).toEqual([
      { response_id: 'r-1', question_id: 'q-1', project_id: 'p-1', answer: 'Yes, via RLS.', classification: 'CONFIRMED', evidence: 'lib.ts:10' },
    ])
  })

  it('marks the response completed when markCompleted is true', async () => {
    const supabase = createFakeSupabase({
      system_assessment_versions: [{ data: { project_id: 'p-1' }, error: null }],
      assessment_responses: [{ data: { id: 'r-1' }, error: null }],
    })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant', id: 'user-1' }, supabase })

    await saveAssessmentResponseAction({ assessmentVersionId: 'v-1', participantLabel: 'Claude Code', answers: [], markCompleted: true })

    const responseUpsert = supabase._calls.find((c) => c.table === 'assessment_responses' && c.method === 'upsert')
    expect(responseUpsert?.args).toMatchObject({ status: 'completed' })
  })
})
