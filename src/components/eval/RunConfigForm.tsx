'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AIModelRow, AIProviderRow, AIModelType, EvidenceSource, EvaluatorType } from '@/types/database'
import { createAndRunEvalAction } from '@/app/actions/eval'

interface DatasetOption {
  id: string
  name: string
  status: string
  version: number
}

function ProviderModelPicker({
  label,
  providers,
  models,
  modelType,
  providerName,
  modelId,
  onChange,
}: {
  label: string
  providers: AIProviderRow[]
  models: AIModelRow[]
  modelType: AIModelType
  providerName: string
  modelId: string
  onChange: (providerName: string, modelId: string) => void
}) {
  const providersWithModel = providers.filter((p) => models.some((m) => m.provider_id === p.id && m.model_type === modelType))
  const modelsForProvider = models.filter((m) => {
    const provider = providers.find((p) => p.name === providerName)
    return provider && m.provider_id === provider.id && m.model_type === modelType
  })

  return (
    <div className="flex gap-3">
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium">{label} provider</span>
        <select
          value={providerName}
          onChange={(e) => {
            const nextProvider = e.target.value
            const firstModel = models.find((m) => {
              const provider = providers.find((p) => p.name === nextProvider)
              return provider && m.provider_id === provider.id && m.model_type === modelType
            })
            onChange(nextProvider, firstModel?.model_id ?? '')
          }}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {providersWithModel.map((p) => (
            <option key={p.id} value={p.name}>
              {p.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium">{label} model</span>
        <select value={modelId} onChange={(e) => onChange(providerName, e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          {modelsForProvider.map((m) => (
            <option key={m.id} value={m.model_id}>
              {m.display_name}
              {m.status === 'deprecated' ? ' (deprecated)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function firstModelFor(providers: AIProviderRow[], models: AIModelRow[], modelType: AIModelType) {
  const candidates = models.filter((m) => m.model_type === modelType)
  const model = candidates.find((m) => m.is_default) ?? candidates[0]
  const provider = providers.find((p) => p.id === model?.provider_id)
  return { provider: provider?.name ?? '', model: model?.model_id ?? '' }
}

export function RunConfigForm({
  datasets,
  preselectedDatasetId,
  providers,
  models,
}: {
  datasets: DatasetOption[]
  preselectedDatasetId?: string
  providers: AIProviderRow[]
  models: AIModelRow[]
}) {
  const router = useRouter()
  const [datasetId, setDatasetId] = useState(preselectedDatasetId ?? datasets[0]?.id ?? '')
  const [name, setName] = useState('')

  const defaultGeneration = firstModelFor(providers, models, 'generation')
  const defaultEmbedding = firstModelFor(providers, models, 'embedding')

  const [generationProvider, setGenerationProvider] = useState(defaultGeneration.provider)
  const [generationModel, setGenerationModel] = useState(defaultGeneration.model)
  const [embeddingProvider, setEmbeddingProvider] = useState(defaultEmbedding.provider)
  const [embeddingModel, setEmbeddingModel] = useState(defaultEmbedding.model)
  const [evidenceSource, setEvidenceSource] = useState<EvidenceSource>('chunks')
  const [topK, setTopK] = useState(5)
  const [evaluatorType, setEvaluatorType] = useState<EvaluatorType>('llm_judge')
  const [evaluatorProvider, setEvaluatorProvider] = useState(defaultGeneration.provider)
  const [evaluatorModel, setEvaluatorModel] = useState(defaultGeneration.model)
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
    if (!generationModel || !embeddingModel) {
      setError('No enabled models available -- ask an admin to configure one under Administration → AI Config')
      return
    }
    setSubmitting(true)
    setProgress('Running cases -- this can take a minute for the full dataset…')
    try {
      const result = await createAndRunEvalAction({
        datasetId,
        name,
        config: {
          generation: { provider: generationProvider, model: generationModel },
          embedding: { provider: embeddingProvider, model: embeddingModel },
          retrieval: { evidence_source: evidenceSource, top_k: topK },
          evaluator:
            evaluatorType === 'llm_judge' ? { type: 'llm_judge', provider: evaluatorProvider, model: evaluatorModel } : { type: 'none' },
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. groq + wiki-only" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      <ProviderModelPicker
        label="Generation"
        providers={providers}
        models={models}
        modelType="generation"
        providerName={generationProvider}
        modelId={generationModel}
        onChange={(p, m) => {
          setGenerationProvider(p)
          setGenerationModel(m)
        }}
      />

      <ProviderModelPicker
        label="Embedding"
        providers={providers}
        models={models}
        modelType="embedding"
        providerName={embeddingProvider}
        modelId={embeddingModel}
        onChange={(p, m) => {
          setEmbeddingProvider(p)
          setEmbeddingModel(m)
        }}
      />

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
        <ProviderModelPicker
          label="Evaluator"
          providers={providers}
          models={models}
          modelType="generation"
          providerName={evaluatorProvider}
          modelId={evaluatorModel}
          onChange={(p, m) => {
            setEvaluatorProvider(p)
            setEvaluatorModel(m)
          }}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {progress && <p className="text-sm text-zinc-600">{progress}</p>}

      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Running…' : 'Run evaluation'}
      </button>
    </form>
  )
}
