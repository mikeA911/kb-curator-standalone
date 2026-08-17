'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAssessmentResponseAction } from '@/app/actions/assessments'
import type { AnswerClassification, SystemAssessmentQuestion } from '@/types/database'

interface DraftAnswer {
  answer: string
  classification: AnswerClassification | ''
  evidence: string
}

export interface InitialResponse {
  participantLabel: string
  externalTool: string
  model: string
  repositoryRef: string
  answersByQuestionId: Record<string, DraftAnswer>
}

export function AssessmentRespondForm({
  projectId,
  assessmentId,
  versionId,
  questions,
  initial,
}: {
  projectId: string
  assessmentId: string
  versionId: string
  questions: SystemAssessmentQuestion[]
  initial?: InitialResponse
}) {
  const router = useRouter()
  const [participantLabel, setParticipantLabel] = useState(initial?.participantLabel ?? '')
  const [externalTool, setExternalTool] = useState(initial?.externalTool ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [repositoryRef, setRepositoryRef] = useState(initial?.repositoryRef ?? '')
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>(
    initial?.answersByQuestionId ?? Object.fromEntries(questions.map((q) => [q.id, { answer: '', classification: '', evidence: '' }]))
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setAnswer(questionId: string, patch: Partial<DraftAnswer>) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }))
  }

  function handleSubmit(markCompleted: boolean) {
    setError(null)
    if (!participantLabel.trim()) {
      setError('Participant/method name is required (e.g. "Claude Code")')
      return
    }
    startTransition(async () => {
      try {
        await saveAssessmentResponseAction({
          assessmentVersionId: versionId,
          participantLabel,
          externalTool: externalTool || undefined,
          model: model || undefined,
          repositoryRef: repositoryRef || undefined,
          answers: questions.map((q) => ({
            questionId: q.id,
            answer: answers[q.id]?.answer ?? '',
            classification: answers[q.id]?.classification || undefined,
            evidence: answers[q.id]?.evidence || undefined,
          })),
          markCompleted,
        })
        router.push(`/projects/${projectId}/assessments/${assessmentId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save response')
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(true)
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Participant / method</span>
          <input
            required
            value={participantLabel}
            onChange={(e) => setParticipantLabel(e.target.value)}
            placeholder="e.g. Claude Code"
            disabled={!!initial}
            className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">External tool (optional)</span>
          <input value={externalTool} onChange={(e) => setExternalTool(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Model (optional)</span>
          <input value={model} onChange={(e) => setModel(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Repository ref / commit (optional)</span>
          <input value={repositoryRef} onChange={(e) => setRepositoryRef(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded border border-zinc-200 bg-white p-4">
            <h2 className="font-medium">
              {i + 1}. {q.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{q.question}</p>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Answer</span>
              <textarea
                rows={4}
                value={answers[q.id]?.answer ?? ''}
                onChange={(e) => setAnswer(q.id, { answer: e.target.value })}
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Classification</span>
                <select
                  value={answers[q.id]?.classification ?? ''}
                  onChange={(e) => setAnswer(q.id, { classification: e.target.value as AnswerClassification | '' })}
                  className="rounded border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="INFERRED">INFERRED</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Evidence (optional)</span>
                <input
                  value={answers[q.id]?.evidence ?? ''}
                  onChange={(e) => setAnswer(q.id, { evidence: e.target.value })}
                  placeholder="file:line references"
                  className="rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button disabled={isPending} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? 'Submitting…' : 'Submit response'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSubmit(false)}
          className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          Save draft
        </button>
      </div>
    </form>
  )
}
