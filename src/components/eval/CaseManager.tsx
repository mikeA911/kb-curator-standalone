'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EvalCase, EvalDatasetStatus, EvalDifficulty } from '@/types/database'
import { createCaseAction, deleteCaseAction, type CaseInput } from '@/app/actions/eval'

interface ArticleOption {
  id: string
  title: string
  slug: string
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export function CaseManager({
  datasetId,
  datasetStatus,
  cases,
  articles,
  canAuthor,
}: {
  datasetId: string
  datasetStatus: EvalDatasetStatus
  cases: EvalCase[]
  articles: ArticleOption[]
  canAuthor: boolean
}) {
  const router = useRouter()
  const editable = canAuthor && datasetStatus === 'draft'

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Question</th>
              <th className="px-4 py-2 font-medium">Expected evidence</th>
              <th className="px-4 py-2 font-medium">Difficulty</th>
              {editable && <th className="px-4 py-2 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <CaseRow key={c.id} evalCase={c} datasetId={datasetId} editable={editable} />
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={editable ? 4 : 3} className="px-4 py-8 text-center text-zinc-500">
                  No cases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable ? (
        <AddCaseForm datasetId={datasetId} articles={articles} onAdded={() => router.refresh()} />
      ) : canAuthor ? (
        <p className="text-sm text-zinc-500">
          Cases are frozen because this dataset is {datasetStatus} -- editing them once active would make past runs
          incomparable to future ones. Create a new dataset to change the benchmark.
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Cases in this benchmark are managed by curators.</p>
      )}
    </div>
  )
}

function CaseRow({ evalCase, datasetId, editable }: { evalCase: EvalCase; datasetId: string; editable: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const evidenceCount = (evalCase.expected_article_ids?.length ?? 0) + (evalCase.expected_chunk_ids?.length ?? 0)

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="max-w-md px-4 py-3">{evalCase.question}</td>
      <td className="px-4 py-3 text-zinc-600">{evidenceCount || '—'}</td>
      <td className="px-4 py-3 text-zinc-600">{evalCase.difficulty ?? '—'}</td>
      {editable && (
        <td className="px-4 py-3 text-right">
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await deleteCaseAction(evalCase.id, datasetId)
                router.refresh()
              })
            }
            className="text-xs text-red-600 underline disabled:opacity-50"
          >
            Delete
          </button>
        </td>
      )}
    </tr>
  )
}

function AddCaseForm({
  datasetId,
  articles,
  onAdded,
}: {
  datasetId: string
  articles: ArticleOption[]
  onAdded: () => void
}) {
  const [question, setQuestion] = useState('')
  const [expectedAnswer, setExpectedAnswer] = useState('')
  const [expectedConcepts, setExpectedConcepts] = useState('')
  const [expectedArticleIds, setExpectedArticleIds] = useState<Set<string>>(new Set())
  const [expectedChunkIds, setExpectedChunkIds] = useState('')
  const [scoringCriteria, setScoringCriteria] = useState('')
  const [tags, setTags] = useState('')
  const [difficulty, setDifficulty] = useState<EvalDifficulty | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleArticle(id: string) {
    setExpectedArticleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const input: CaseInput = {
        question,
        expectedAnswer,
        expectedConcepts: splitList(expectedConcepts),
        expectedArticleIds: [...expectedArticleIds],
        expectedChunkIds: splitList(expectedChunkIds),
        scoringCriteria,
        tags: splitList(tags),
        difficulty: difficulty || null,
      }
      await createCaseAction(datasetId, input)
      setQuestion('')
      setExpectedAnswer('')
      setExpectedConcepts('')
      setExpectedArticleIds(new Set())
      setExpectedChunkIds('')
      setScoringCriteria('')
      setTags('')
      setDifficulty('')
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add case')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add case</h3>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Question</span>
        <textarea required rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Expected answer characteristics (optional)</span>
        <textarea rows={2} value={expectedAnswer} onChange={(e) => setExpectedAnswer(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Expected concepts (comma-separated)</span>
        <input value={expectedConcepts} onChange={(e) => setExpectedConcepts(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Expected Wiki articles</span>
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded border border-zinc-300 p-2">
          {articles.map((a) => (
            <label key={a.id} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={expectedArticleIds.has(a.id)} onChange={() => toggleArticle(a.id)} />
              {a.title}
            </label>
          ))}
          {articles.length === 0 && <span className="text-xs text-zinc-500">No approved articles yet.</span>}
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Expected chunk ids (comma-separated, optional)</span>
        <input value={expectedChunkIds} onChange={(e) => setExpectedChunkIds(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Scoring criteria (optional)</span>
        <textarea rows={2} value={scoringCriteria} onChange={(e) => setScoringCriteria(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as EvalDifficulty | '')} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            <option value="">—</option>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Adding…' : 'Add case'}
      </button>
    </form>
  )
}
