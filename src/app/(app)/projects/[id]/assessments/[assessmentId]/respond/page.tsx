import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getAssessmentById,
  listQuestions,
  getResponseByParticipant,
  listAnswersForResponse,
} from '@/lib/projects/assessments'
import { AssessmentRespondForm, type InitialResponse } from '@/components/projects/AssessmentRespondForm'
import type { AnswerClassification } from '@/types/database'

export default async function RespondToAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assessmentId: string }>
  searchParams: Promise<{ participant?: string }>
}) {
  const { id, assessmentId } = await params
  const { participant } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  const assessment = await getAssessmentById(supabase, assessmentId)
  if (!project || !assessment) notFound()
  if (!assessment.current_version_id) redirect(`/projects/${id}/assessments/${assessmentId}`)

  const questions = await listQuestions(supabase, assessment.current_version_id)

  let initial: InitialResponse | undefined
  if (participant) {
    const existing = await getResponseByParticipant(supabase, assessment.current_version_id, participant)
    if (existing) {
      const answers = await listAnswersForResponse(supabase, existing.id)
      const answersByQuestionId = Object.fromEntries(
        answers.map((a) => [
          a.question_id,
          { answer: a.answer, classification: (a.classification ?? '') as AnswerClassification | '', evidence: a.evidence ?? '' },
        ])
      )
      initial = {
        participantLabel: existing.participant_label,
        externalTool: existing.external_tool ?? '',
        model: existing.model ?? '',
        repositoryRef: existing.repository_ref ?? '',
        answersByQuestionId,
      }
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/projects/${id}/assessments/${assessmentId}`} className="text-sm underline">
          &larr; {assessment.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Submit a response</h1>
      </div>
      <AssessmentRespondForm
        projectId={id}
        assessmentId={assessmentId}
        versionId={assessment.current_version_id}
        questions={questions}
        initial={initial}
      />
    </div>
  )
}
