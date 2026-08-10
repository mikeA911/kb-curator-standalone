'use client'

import { useState, useTransition } from 'react'
import type { AIModelType } from '@/types/database'
import { createModelAction } from '@/app/actions/ai-providers'

export function AddModelForm({ providerId, prefillModelId }: { providerId: string; prefillModelId?: string }) {
  const [modelId, setModelId] = useState(prefillModelId ?? '')
  const [displayName, setDisplayName] = useState('')
  const [modelType, setModelType] = useState<AIModelType>('generation')
  const [contextWindow, setContextWindow] = useState('')
  const [maxOutputTokens, setMaxOutputTokens] = useState('')
  const [embeddingDimensions, setEmbeddingDimensions] = useState('')
  const [supportsStructuredOutput, setSupportsStructuredOutput] = useState(true)
  const [supportsTools, setSupportsTools] = useState(true)
  const [supportsReasoning, setSupportsReasoning] = useState(false)
  const [supportsVision, setSupportsVision] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createModelAction({
          providerId,
          modelId,
          displayName,
          modelType,
          contextWindow: contextWindow ? Number(contextWindow) : null,
          maxOutputTokens: maxOutputTokens ? Number(maxOutputTokens) : null,
          embeddingDimensions: embeddingDimensions ? Number(embeddingDimensions) : null,
          supportsStructuredOutput,
          supportsTools,
          supportsReasoning,
          supportsVision,
        })
        setModelId('')
        setDisplayName('')
        setContextWindow('')
        setMaxOutputTokens('')
        setEmbeddingDimensions('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add model')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add model</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Model ID</span>
          <input required value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="e.g. openai/gpt-oss-20b" className="rounded border border-zinc-300 px-3 py-2 text-sm font-mono" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Defaults to model ID" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Type</span>
          <select value={modelType} onChange={(e) => setModelType(e.target.value as AIModelType)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            <option value="generation">Generation</option>
            <option value="embedding">Embedding</option>
            <option value="speech">Speech</option>
            <option value="multimodal">Multimodal</option>
          </select>
        </label>
        {modelType === 'embedding' ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Embedding dimensions</span>
            <input type="number" value={embeddingDimensions} onChange={(e) => setEmbeddingDimensions(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Context window</span>
            <input type="number" value={contextWindow} onChange={(e) => setContextWindow(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>
        )}
        {modelType !== 'embedding' && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Max output tokens</span>
            <input type="number" value={maxOutputTokens} onChange={(e) => setMaxOutputTokens(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>
        )}
      </div>

      {modelType !== 'embedding' && (
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={supportsStructuredOutput} onChange={(e) => setSupportsStructuredOutput(e.target.checked)} />
            Structured output
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={supportsTools} onChange={(e) => setSupportsTools(e.target.checked)} />
            Tools
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={supportsReasoning} onChange={(e) => setSupportsReasoning(e.target.checked)} />
            Reasoning
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={supportsVision} onChange={(e) => setSupportsVision(e.target.checked)} />
            Vision
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={isPending} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {isPending ? 'Adding…' : 'Add model'}
      </button>
    </form>
  )
}
