import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  SystemAssessment,
  SystemAssessmentVersion,
  SystemAssessmentQuestion,
  AssessmentResponse,
  AssessmentAnswer,
} from '@/types/database'

export async function listAssessmentsForProject(supabase: SupabaseClient<Database>, projectId: string): Promise<SystemAssessment[]> {
  const { data, error } = await supabase.from('system_assessments').select('*').eq('project_id', projectId).order('created_at')
  if (error) throw error
  return data ?? []
}

export async function getAssessmentById(supabase: SupabaseClient<Database>, assessmentId: string): Promise<SystemAssessment | null> {
  const { data, error } = await supabase.from('system_assessments').select('*').eq('id', assessmentId).maybeSingle()
  if (error) throw error
  return data
}

export async function getVersionById(supabase: SupabaseClient<Database>, versionId: string): Promise<SystemAssessmentVersion | null> {
  const { data, error } = await supabase.from('system_assessment_versions').select('*').eq('id', versionId).maybeSingle()
  if (error) throw error
  return data
}

export async function listVersions(supabase: SupabaseClient<Database>, assessmentId: string): Promise<SystemAssessmentVersion[]> {
  const { data, error } = await supabase
    .from('system_assessment_versions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listQuestions(supabase: SupabaseClient<Database>, versionId: string): Promise<SystemAssessmentQuestion[]> {
  const { data, error } = await supabase
    .from('system_assessment_questions')
    .select('*')
    .eq('assessment_version_id', versionId)
    .order('sequence', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listResponses(supabase: SupabaseClient<Database>, versionId: string): Promise<AssessmentResponse[]> {
  const { data, error } = await supabase
    .from('assessment_responses')
    .select('*')
    .eq('assessment_version_id', versionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getResponseByParticipant(
  supabase: SupabaseClient<Database>,
  versionId: string,
  participantLabel: string
): Promise<AssessmentResponse | null> {
  const { data, error } = await supabase
    .from('assessment_responses')
    .select('*')
    .eq('assessment_version_id', versionId)
    .eq('participant_label', participantLabel)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listAnswersForResponse(supabase: SupabaseClient<Database>, responseId: string): Promise<AssessmentAnswer[]> {
  const { data, error } = await supabase.from('assessment_answers').select('*').eq('response_id', responseId)
  if (error) throw error
  return data ?? []
}

// Every answer across every response for a version's question set -- one
// query (filtered by question_id, which is already scoped to the version)
// rather than N+1 per response. Callers key into it by
// `${questionId}:${responseId}`.
export async function listAnswersForVersion(
  supabase: SupabaseClient<Database>,
  questionIds: string[]
): Promise<AssessmentAnswer[]> {
  if (questionIds.length === 0) return []
  const { data, error } = await supabase.from('assessment_answers').select('*').in('question_id', questionIds)
  if (error) throw error
  return data ?? []
}

export interface AssessmentSummary {
  assessment: SystemAssessment
  activeVersion: SystemAssessmentVersion | null
  questionCount: number
  responses: { participantLabel: string; status: AssessmentResponse['status']; answeredCount: number }[]
}

// One summary per assessment in a project -- everything the workstream
// page's collapsed "System Understanding" card needs, without the page
// having to hand-assemble three levels of joins itself.
export async function listAssessmentSummariesForProject(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<AssessmentSummary[]> {
  const assessments = await listAssessmentsForProject(supabase, projectId)
  return Promise.all(
    assessments.map(async (assessment) => {
      if (!assessment.current_version_id) {
        return { assessment, activeVersion: null, questionCount: 0, responses: [] }
      }
      const [activeVersion, questions, responses] = await Promise.all([
        getVersionById(supabase, assessment.current_version_id),
        listQuestions(supabase, assessment.current_version_id),
        listResponses(supabase, assessment.current_version_id),
      ])
      const answers = await listAnswersForVersion(supabase, questions.map((q) => q.id))
      const answeredCountByResponse = new Map<string, number>()
      for (const a of answers) {
        answeredCountByResponse.set(a.response_id, (answeredCountByResponse.get(a.response_id) ?? 0) + 1)
      }
      return {
        assessment,
        activeVersion,
        questionCount: questions.length,
        responses: responses.map((r) => ({
          participantLabel: r.participant_label,
          status: r.status,
          answeredCount: answeredCountByResponse.get(r.id) ?? 0,
        })),
      }
    })
  )
}

export interface AssessmentMatrix {
  assessment: SystemAssessment
  version: SystemAssessmentVersion
  questions: SystemAssessmentQuestion[]
  responses: AssessmentResponse[]
  // answer for (questionId, responseId), or undefined if not yet answered.
  answerByKey: Map<string, AssessmentAnswer>
}

// The full question-by-question, participant-by-participant view backing
// the dedicated assessment page (design note section 11). Takes an
// explicit versionId (not just "the current one") so a curator can review
// a freshly created draft before activating it, or look at a retired
// version's history.
export async function getAssessmentMatrixForVersion(
  supabase: SupabaseClient<Database>,
  assessmentId: string,
  versionId: string
): Promise<AssessmentMatrix | null> {
  const [assessment, version] = await Promise.all([getAssessmentById(supabase, assessmentId), getVersionById(supabase, versionId)])
  if (!assessment || !version || version.assessment_id !== assessmentId) return null

  const [questions, responses] = await Promise.all([listQuestions(supabase, versionId), listResponses(supabase, versionId)])
  const answers = await listAnswersForVersion(supabase, questions.map((q) => q.id))
  const answerByKey = new Map(answers.map((a) => [`${a.question_id}:${a.response_id}`, a]))

  return { assessment, version, questions, responses, answerByKey }
}
