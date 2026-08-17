'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAssessmentAction } from '@/app/actions/assessments'

const DEFAULT_INSTRUCTIONS = `Answer each question based on evidence found in the supplied system/repository.

For each answer:

1. Answer the question directly.
2. Explain how the system implements the behavior.
3. Cite repository evidence using file:line references where possible.
4. Distinguish significant claims as:
   - CONFIRMED
   - INFERRED
   - UNKNOWN
5. Identify gaps, ambiguities or implementation concerns.
6. Do not assume functionality exists merely because it would normally be expected in an application of this type.
7. Do not use another participant's answers or artifacts.

Repository implementation evidence takes precedence over assumptions, documentation claims or expected product behavior.`

interface DraftQuestion {
  title: string
  question: string
  category: string
  guidance: string
}

const EMPTY_QUESTION: DraftQuestion = { title: '', question: '', category: '', guidance: '' }

export function AssessmentCreateForm({
  projectId,
  workstreams,
}: {
  projectId: string
  workstreams: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS)
  const [workstreamId, setWorkstreamId] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([])
  const [draft, setDraft] = useState<DraftQuestion>(EMPTY_QUESTION)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function addQuestion() {
    if (!draft.title.trim() || !draft.question.trim()) return
    setQuestions((prev) => [...prev, draft])
    setDraft(EMPTY_QUESTION)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (questions.length === 0) {
      setError('Add at least one question')
      return
    }
    setSubmitting(true)
    try {
      const result = await createAssessmentAction({
        projectId,
        workstreamId: workstreamId || null,
        name,
        description: description || undefined,
        instructions,
        questions: questions.map((q) => ({
          title: q.title,
          question: q.question,
          category: q.category || undefined,
          guidance: q.guidance || undefined,
        })),
      })
      router.push(`/projects/${projectId}/assessments/${result.assessmentId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CareCall System Understanding" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Purpose / description</span>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this assessment evaluate?"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      {workstreams.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Originating workstream (optional)</span>
          <select value={workstreamId} onChange={(e) => setWorkstreamId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            <option value="">None — spans the whole project</option>
            {workstreams.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Instructions (given to every participant)</span>
        <textarea
          rows={10}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Questions ({questions.length})</span>
        {questions.length > 0 && (
          <ul className="flex flex-col gap-1">
            {questions.map((q, i) => (
              <li key={`${q.title}-${i}`} className="flex items-start justify-between gap-2 rounded border border-zinc-200 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">
                    {i + 1}. {q.title}
                  </span>
                  <span className="block text-xs text-zinc-500">{q.question}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-xs text-red-600 underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-zinc-50 p-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Question title, e.g. Multi-client / Tenant Isolation"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <textarea
            rows={2}
            value={draft.question}
            onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
            placeholder="The full question text"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              placeholder="Category (optional)"
              className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            rows={2}
            value={draft.guidance}
            onChange={(e) => setDraft((d) => ({ ...d, guidance: e.target.value }))}
            placeholder="Guidance for the participant (optional)"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button type="button" onClick={addQuestion} className="self-start rounded border border-zinc-300 px-3 py-1.5 text-sm">
            + Add question
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-zinc-500">
        Creates a draft version — review it, then activate it from the assessment page before participants can respond.
      </p>

      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Creating…' : 'Create Assessment'}
      </button>
    </form>
  )
}
