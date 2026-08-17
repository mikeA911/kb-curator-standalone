import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WorkstreamStatus, WorkstreamDeliverable, ArtifactType, SystemAssessmentVersionStatus, AssessmentResponseStatus, AnswerClassification } from '@/types/database'

// Narrow-select query layer for the "full data exposure" opt-in
// (public_full_detail on projects -- see 20260817120001_public_full_detail.sql
// and src/lib/projects/public.ts). Mirrors the discipline in
// src/lib/projects/public.ts and src/lib/wiki/public.ts: never select('*'),
// hand-declared Public*Row interfaces so `created_by` (a reviewer/curator
// identity on every one of these tables) never reaches an anon reader even
// though RLS now permits the row. These functions rely entirely on the new
// RLS policies to actually scope results to opted-in projects -- callers
// must not pass an arbitrary id without having already resolved the parent
// project through getPublicProjectBySlug first (matching the pattern the
// public pages already use for wiki/examples).

export interface PublicWorkstreamRow {
  id: string
  project_id: string
  name: string
  slug: string
  status: WorkstreamStatus
  repository_scope: string[]
  goal: string | null
  guardrail: string | null
  summary: string | null
  deliverables: WorkstreamDeliverable[]
}

const PUBLIC_WORKSTREAM_COLUMNS = 'id, project_id, name, slug, status, repository_scope, goal, guardrail, summary, deliverables'

export async function listPublicWorkstreams(supabase: SupabaseClient<Database>, projectId: string): Promise<PublicWorkstreamRow[]> {
  const { data, error } = await supabase
    .from('project_workstreams')
    .select(PUBLIC_WORKSTREAM_COLUMNS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PublicWorkstreamRow[]
}

export async function getPublicWorkstreamById(supabase: SupabaseClient<Database>, workstreamId: string): Promise<PublicWorkstreamRow | null> {
  const { data, error } = await supabase.from('project_workstreams').select(PUBLIC_WORKSTREAM_COLUMNS).eq('id', workstreamId).maybeSingle()
  if (error) throw error
  return data as unknown as PublicWorkstreamRow | null
}

export interface PublicArtifactRow {
  id: string
  workstream_id: string
  artifact_type: ArtifactType
  title: string
  external_tool: string | null
  content: string | null
  external_url: string | null
  notes: string | null
  created_at: string
}

const PUBLIC_ARTIFACT_COLUMNS = 'id, workstream_id, artifact_type, title, external_tool, content, external_url, notes, created_at'

export async function listPublicArtifacts(supabase: SupabaseClient<Database>, workstreamId: string): Promise<PublicArtifactRow[]> {
  const { data, error } = await supabase
    .from('workstream_artifacts')
    .select(PUBLIC_ARTIFACT_COLUMNS)
    .eq('workstream_id', workstreamId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as PublicArtifactRow[]
}

export interface PublicAssessmentRow {
  id: string
  project_id: string
  name: string
  description: string | null
  current_version_id: string | null
}

const PUBLIC_ASSESSMENT_COLUMNS = 'id, project_id, name, description, current_version_id'

export async function listPublicAssessmentsForProject(supabase: SupabaseClient<Database>, projectId: string): Promise<PublicAssessmentRow[]> {
  const { data, error } = await supabase.from('system_assessments').select(PUBLIC_ASSESSMENT_COLUMNS).eq('project_id', projectId).order('created_at')
  if (error) throw error
  return (data ?? []) as unknown as PublicAssessmentRow[]
}

export async function getPublicAssessmentById(supabase: SupabaseClient<Database>, assessmentId: string): Promise<PublicAssessmentRow | null> {
  const { data, error } = await supabase.from('system_assessments').select(PUBLIC_ASSESSMENT_COLUMNS).eq('id', assessmentId).maybeSingle()
  if (error) throw error
  return data as unknown as PublicAssessmentRow | null
}

export interface PublicVersionRow {
  id: string
  assessment_id: string
  version_number: number
  instructions: string
  status: SystemAssessmentVersionStatus
}

const PUBLIC_VERSION_COLUMNS = 'id, assessment_id, version_number, instructions, status'

export async function getPublicVersionById(supabase: SupabaseClient<Database>, versionId: string): Promise<PublicVersionRow | null> {
  const { data, error } = await supabase.from('system_assessment_versions').select(PUBLIC_VERSION_COLUMNS).eq('id', versionId).maybeSingle()
  if (error) throw error
  return data as unknown as PublicVersionRow | null
}

export async function listPublicVersions(supabase: SupabaseClient<Database>, assessmentId: string): Promise<PublicVersionRow[]> {
  const { data, error } = await supabase
    .from('system_assessment_versions')
    .select(PUBLIC_VERSION_COLUMNS)
    .eq('assessment_id', assessmentId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as PublicVersionRow[]
}

export interface PublicQuestionRow {
  id: string
  assessment_version_id: string
  sequence: number
  title: string
  question: string
  category: string | null
  guidance: string | null
}

const PUBLIC_QUESTION_COLUMNS = 'id, assessment_version_id, sequence, title, question, category, guidance'

export async function listPublicQuestions(supabase: SupabaseClient<Database>, versionId: string): Promise<PublicQuestionRow[]> {
  const { data, error } = await supabase
    .from('system_assessment_questions')
    .select(PUBLIC_QUESTION_COLUMNS)
    .eq('assessment_version_id', versionId)
    .order('sequence', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PublicQuestionRow[]
}

export interface PublicResponseRow {
  id: string
  assessment_version_id: string
  participant_label: string
  external_tool: string | null
  model: string | null
  repository_ref: string | null
  status: AssessmentResponseStatus
}

const PUBLIC_RESPONSE_COLUMNS = 'id, assessment_version_id, participant_label, external_tool, model, repository_ref, status'

export async function listPublicResponses(supabase: SupabaseClient<Database>, versionId: string): Promise<PublicResponseRow[]> {
  // RLS already restricts anon reads to status='completed' -- no .eq needed
  // here, but the type still reflects that a completed-only set comes back.
  const { data, error } = await supabase
    .from('assessment_responses')
    .select(PUBLIC_RESPONSE_COLUMNS)
    .eq('assessment_version_id', versionId)
    .order('participant_label', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PublicResponseRow[]
}

export interface PublicAnswerRow {
  id: string
  response_id: string
  question_id: string
  answer: string
  classification: AnswerClassification | null
  evidence: string | null
}

const PUBLIC_ANSWER_COLUMNS = 'id, response_id, question_id, answer, classification, evidence'

export async function listPublicAnswersForVersion(supabase: SupabaseClient<Database>, questionIds: string[]): Promise<PublicAnswerRow[]> {
  if (questionIds.length === 0) return []
  const { data, error } = await supabase.from('assessment_answers').select(PUBLIC_ANSWER_COLUMNS).in('question_id', questionIds)
  if (error) throw error
  return (data ?? []) as unknown as PublicAnswerRow[]
}

export interface PublicAssessmentSummary {
  assessment: PublicAssessmentRow
  activeVersion: PublicVersionRow | null
  questionCount: number
  responses: { participantLabel: string; answeredCount: number }[]
}

// Public sibling of listAssessmentSummariesForProject (src/lib/projects/assessments.ts)
// -- same fan-out shape, narrow columns, and completed-only responses (RLS
// already filters those; no separate status field needed on the summary
// since every response returned here IS completed by construction).
export async function listPublicAssessmentSummariesForProject(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<PublicAssessmentSummary[]> {
  const assessments = await listPublicAssessmentsForProject(supabase, projectId)
  return Promise.all(
    assessments.map(async (assessment) => {
      if (!assessment.current_version_id) {
        return { assessment, activeVersion: null, questionCount: 0, responses: [] }
      }
      const [activeVersion, questions, responses] = await Promise.all([
        getPublicVersionById(supabase, assessment.current_version_id),
        listPublicQuestions(supabase, assessment.current_version_id),
        listPublicResponses(supabase, assessment.current_version_id),
      ])
      if (!activeVersion) return { assessment, activeVersion: null, questionCount: 0, responses: [] }
      const answers = await listPublicAnswersForVersion(supabase, questions.map((q) => q.id))
      const answeredCountByResponse = new Map<string, number>()
      for (const a of answers) {
        answeredCountByResponse.set(a.response_id, (answeredCountByResponse.get(a.response_id) ?? 0) + 1)
      }
      return {
        assessment,
        activeVersion,
        questionCount: questions.length,
        responses: responses.map((r) => ({ participantLabel: r.participant_label, answeredCount: answeredCountByResponse.get(r.id) ?? 0 })),
      }
    })
  )
}

export interface PublicAssessmentMatrix {
  assessment: PublicAssessmentRow
  version: PublicVersionRow
  questions: PublicQuestionRow[]
  responses: PublicResponseRow[]
  answerByKey: Map<string, PublicAnswerRow>
}

// Public sibling of getAssessmentMatrixForVersion -- same
// `${questionId}:${responseId}` keying, restricted to whatever RLS already
// allows (active/retired versions, completed responses only).
export async function getPublicAssessmentMatrixForVersion(
  supabase: SupabaseClient<Database>,
  assessmentId: string,
  versionId: string
): Promise<PublicAssessmentMatrix | null> {
  const [assessment, version] = await Promise.all([getPublicAssessmentById(supabase, assessmentId), getPublicVersionById(supabase, versionId)])
  if (!assessment || !version || version.assessment_id !== assessmentId) return null

  const [questions, responses] = await Promise.all([listPublicQuestions(supabase, versionId), listPublicResponses(supabase, versionId)])
  const answers = await listPublicAnswersForVersion(supabase, questions.map((q) => q.id))
  const answerByKey = new Map(answers.map((a) => [`${a.question_id}:${a.response_id}`, a]))

  return { assessment, version, questions, responses, answerByKey }
}
