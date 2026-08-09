'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AIProviderName, EvidenceSource, EvaluatorType } from '@/types/database'
import { createAndRunEvalAction } from '@/app/actions/eval'

interface DatasetOption {
  id: string
  name: string
  status: string
  version: number
}

export function RunConfigForm({
  datasets,
  preselectedDatasetId,
}: {
  datasets: DatasetOption[]
  preselectedDatasetId?: string
}) {
  const router = useRouter()
  const [datasetId, setDatasetId] = useState(preselectedDatasetId ?? datasets[0]?.id ?? '')
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<AIProviderName>('openai')
  const [evidenceSource, setEvidenceSource] = useState<EvidenceSource>('chunks')
  const [topK, setTopK] = useState(5)
  const [evaluatorType, setEvaluatorType] = useState<EvaluatorType>('llm_judge')
  const [evaluatorProvider, setEvaluatorProvider] = useState<AIProviderName>('openai')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!datasetId) {
      setError('Select a dataset')
      return
    }
    setSubmitting(true)
    setProgress('Running cases -- this can take a minute for the full dataset…')
    try {
      const result = await createAndRunEvalAction({
        datasetId,
        name,
        config: {
          generation: { provider },
          embedding: { provider },
          retrieval: { evidence_source: evidenceSource, top_k: topK },
          evaluator: evaluatorType === 'llm_judge' ? { type: 'llm_judge', provider: evaluatorProvider } : { type: 'none' },
        },
      })
      router.push(`/evals/runs/${result.runId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed')
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Dataset</span>
        <select required value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.status}, v{d.version})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Run name (optional)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. gemini + wiki-only" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Generation / embedding provider</span>
        <select value={provider} onChange={(e) => setProvider(e.target.value as AIProviderName)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Retrieval source</span>
        <select value={evidenceSource} onChange={(e) => setEvidenceSource(e.target.value as EvidenceSource)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          <option value="chunks">Source chunks only</option>
          <option value="wiki">Wiki only</option>
          <option value="both">Wiki + source chunks</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Top-K</span>
        <input type="number" min={1} max={20} value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="w-24 rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Evaluator</span>
        <select value={evaluatorType} onChange={(e) => setEvaluatorType(e.target.value as EvaluatorType)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          <option value="llm_judge">LLM judge</option>
          <option value="none">None (retrieval metrics only)</option>
        </select>
      </label>

      {evaluatorType === 'llm_judge' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Judge provider</span>
          <select value={evaluatorProvider} onChange={(e) => setEvaluatorProvider(e.target.value as AIProviderName)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {progress && <p className="text-sm text-zinc-600">{progress}</p>}

      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Running…' : 'Run evaluation'}
      </button>
    </form>
  )
}
