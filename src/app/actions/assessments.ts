'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, AuthError } from '@/lib/auth'
import { ProjectValidationError } from '@/lib/projects/errors'
import type { AnswerClassification } from '@/types/database'

interface QuestionInput {
  title: string
  question: string
  category?: string
  guidance?: string
}

// requireUser() + an anonymous check, then RLS (system_assessments_manage_curator
// / system_assessment_versions_manage_curator / system_assessment_questions_manage_curator
// -- all can_curate_project) is the real gate, same reasoning as
// createWorkstreamAction. Creates the assessment as a fresh v1 draft --
// curator reviews it, then calls activateAssessmentVersionAction.
export async function createAssessmentAction(input: {
  projectId: string
  workstreamId?: string | null
  name: string
  description?: string
  instructions: string
  questions: QuestionInput[]
}) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to create an assessment')
  if (input.questions.length === 0) throw new ProjectValidationError('An assessment needs at least one question')

  const { data: assessment, error: assessmentError } = await supabase
    .from('system_assessments')
    .insert({
      project_id: input.projectId,
      workstream_id: input.workstreamId || null,
      name: input.name,
      description: input.description || null,
      created_by: profile.id,
    })
    .select('id')
    .single()
  if (assessmentError || !assessment) throw assessmentError ?? new ProjectValidationError('Failed to create assessment')

  const { data: version, error: versionError } = await supabase
    .from('system_assessment_versions')
    .insert({
      assessment_id: assessment.id,
      project_id: input.projectId,
      version_number: 1,
      instructions: input.instructions,
      created_by: profile.id,
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new ProjectValidationError('Failed to create assessment version')

  const { error: questionsError } = await supabase.from('system_assessment_questions').insert(
    input.questions.map((q, i) => ({
      assessment_version_id: version.id,
      project_id: input.projectId,
      sequence: i + 1,
      title: q.title,
      question: q.question,
      category: q.category || null,
      guidance: q.guidance || null,
    }))
  )
  if (questionsError) throw questionsError

  revalidatePath(`/projects/${input.projectId}`)
  return { assessmentId: assessment.id, versionId: version.id }
}

// Draft -> active. If the assessment already points at a different active
// version, that one is retired first -- an assessment has at most one
// version accepting responses at a time (design note section 5).
export async function activateAssessmentVersionAction(assessmentId: string, versionId: string) {
  const { supabase } = await requireUser()

  const { data: assessment, error: assessmentError } = await supabase
    .from('system_assessments')
    .select('id, project_id, current_version_id')
    .eq('id', assessmentId)
    .single()
  if (assessmentError || !assessment) throw assessmentError ?? new ProjectValidationError('Assessment not found')

  if (assessment.current_version_id && assessment.current_version_id !== versionId) {
    const { error: retireError } = await supabase
      .from('system_assessment_versions')
      .update({ status: 'retired' })
      .eq('id', assessment.current_version_id)
      .eq('status', 'active')
    if (retireError) throw retireError
  }

  const { data: activated, error: activateError } = await supabase
    .from('system_assessment_versions')
    .update({ status: 'active' })
    .eq('id', versionId)
    .select('id')
  if (activateError) throw activateError
  if (!activated || activated.length === 0) throw new ProjectValidationError('You do not have permission to activate this version')

  const { error: pointerError } = await supabase.from('system_assessments').update({ current_version_id: versionId }).eq('id', assessmentId)
  if (pointerError) throw pointerError

  revalidatePath(`/projects/${assessment.project_id}`)
}

// Creates the next draft version (questions/instructions can differ from
// v1) -- curator still has to call activateAssessmentVersionAction
// separately to put it into use, same review step as v1.
export async function createNewAssessmentVersionAction(input: {
  assessmentId: string
  projectId: string
  instructions: string
  questions: QuestionInput[]
}) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to create an assessment version')
  if (input.questions.length === 0) throw new ProjectValidationError('An assessment needs at least one question')

  const { data: existing, error: existingError } = await supabase
    .from('system_assessment_versions')
    .select('version_number')
    .eq('assessment_id', input.assessmentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError
  const nextVersionNumber = (existing?.version_number ?? 0) + 1

  const { data: version, error: versionError } = await supabase
    .from('system_assessment_versions')
    .insert({
      assessment_id: input.assessmentId,
      project_id: input.projectId,
      version_number: nextVersionNumber,
      instructions: input.instructions,
      created_by: profile.id,
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new ProjectValidationError('Failed to create assessment version')

  const { error: questionsError } = await supabase.from('system_assessment_questions').insert(
    input.questions.map((q, i) => ({
      assessment_version_id: version.id,
      project_id: input.projectId,
      sequence: i + 1,
      title: q.title,
      question: q.question,
      category: q.category || null,
      guidance: q.guidance || null,
    }))
  )
  if (questionsError) throw questionsError

  revalidatePath(`/projects/${input.projectId}`)
  return { versionId: version.id }
}

// Retires without a replacement -- deprecates a version so it stops
// accepting responses. current_version_id is left pointing at it; a
// subsequent activateAssessmentVersionAction call on a different version
// is what actually moves the assessment forward.
export async function retireAssessmentVersionAction(versionId: string, projectId: string) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('system_assessment_versions')
    .update({ status: 'retired' })
    .eq('id', versionId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new ProjectValidationError('You do not have permission to retire this version')

  revalidatePath(`/projects/${projectId}`)
}

// Broader than curator -- can_run_project_evals-gated (owner/curator/
// consultant, excludes viewer) via RLS, matching the design note's
// permission table. Upserts the response row plus one row per answer;
// "edit until submitted" is just calling this again with the same
// participantLabel before markCompleted is set.
export async function saveAssessmentResponseAction(input: {
  assessmentVersionId: string
  participantLabel: string
  externalTool?: string
  model?: string
  repositoryRef?: string
  answers: { questionId: string; answer: string; classification?: AnswerClassification; evidence?: string }[]
  markCompleted: boolean
}) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to submit a response')
  if (!input.participantLabel.trim()) throw new ProjectValidationError('Participant/method name is required')

  const { data: version, error: versionError } = await supabase
    .from('system_assessment_versions')
    .select('project_id')
    .eq('id', input.assessmentVersionId)
    .single()
  if (versionError || !version) throw versionError ?? new ProjectValidationError('Assessment version not found')

  const { data: response, error: responseError } = await supabase
    .from('assessment_responses')
    .upsert(
      {
        assessment_version_id: input.assessmentVersionId,
        project_id: version.project_id,
        participant_label: input.participantLabel.trim(),
        external_tool: input.externalTool || null,
        model: input.model || null,
        repository_ref: input.repositoryRef || null,
        status: input.markCompleted ? 'completed' : 'in_progress',
        created_by: profile.id,
      },
      { onConflict: 'assessment_version_id,participant_label' }
    )
    .select('id')
    .single()
  if (responseError || !response) throw responseError ?? new ProjectValidationError('Failed to save response')

  if (input.answers.length > 0) {
    const { error: answersError } = await supabase.from('assessment_answers').upsert(
      input.answers.map((a) => ({
        response_id: response.id,
        question_id: a.questionId,
        project_id: version.project_id,
        answer: a.answer,
        classification: a.classification || null,
        evidence: a.evidence || null,
      })),
      { onConflict: 'response_id,question_id' }
    )
    if (answersError) throw answersError
  }

  revalidatePath(`/projects/${version.project_id}`)
  return { responseId: response.id }
}
