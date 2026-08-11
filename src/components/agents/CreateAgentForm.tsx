'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AIModelRow, AIProviderRow, AIModelType, AgentTemplate } from '@/types/database'
import { createAgentFromTemplateAction } from '@/app/actions/agents'

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function ProviderModelPicker({
  label,
  providers,
  models,
  modelType,
  providerId,
  modelId,
  onChange,
}: {
  label: string
  providers: AIProviderRow[]
  models: AIModelRow[]
  modelType: AIModelType
  providerId: string
  modelId: string
  onChange: (providerId: string, modelId: string) => void
}) {
  const providersWithModel = providers.filter((p) => models.some((m) => m.provider_id === p.id && m.model_type === modelType))
  const modelsForProvider = models.filter((m) => m.provider_id === providerId && m.model_type === modelType)

  return (
    <div className="flex gap-3">
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium">{label} provider</span>
        <select
          value={providerId}
          onChange={(e) => {
            const nextProviderId = e.target.value
            const firstModel = models.find((m) => m.provider_id === nextProviderId && m.model_type === modelType)
            onChange(nextProviderId, firstModel?.id ?? '')
          }}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {providersWithModel.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium">{label} model</span>
        <select value={modelId} onChange={(e) => onChange(providerId, e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          {modelsForProvider.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
              {m.status === 'deprecated' ? ' (deprecated)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function defaultsFromTemplate(template: AgentTemplate | undefined) {
  return {
    purpose: template?.default_purpose ?? '',
    instructions: template?.default_instructions ?? '',
    generationProviderId: template?.default_generation_provider_id ?? '',
    generationModelId: template?.default_generation_model_id ?? '',
    embeddingProviderId: template?.default_embedding_provider_id ?? '',
    embeddingModelId: template?.default_embedding_model_id ?? '',
    evaluatorProviderId: template?.default_evaluator_provider_id ?? '',
    evaluatorModelId: template?.default_evaluator_model_id ?? '',
  }
}

export function CreateAgentForm({ templates, providers, models }: { templates: AgentTemplate[]; providers: AIProviderRow[]; models: AIModelRow[] }) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const selectedTemplate = templates.find((t) => t.id === templateId)

  const [name, setName] = useState('')
  const [fields, setFields] = useState(() => defaultsFromTemplate(selectedTemplate))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId)
    setFields(defaultsFromTemplate(templates.find((t) => t.id === nextTemplateId)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedTemplate) {
      setError('Choose a template')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!fields.generationProviderId || !fields.generationModelId || !fields.embeddingProviderId || !fields.embeddingModelId) {
      setError('A generation model and an embedding model are required')
      return
    }
    setSubmitting(true)
    try {
      await createAgentFromTemplateAction({
        templateId: selectedTemplate.id,
        name,
        slug: slugify(name),
        purpose: fields.purpose,
        instructions: fields.instructions,
        generationProviderId: fields.generationProviderId,
        generationModelId: fields.generationModelId,
        embeddingProviderId: fields.embeddingProviderId,
        embeddingModelId: fields.embeddingModelId,
        evaluatorProviderId: fields.evaluatorProviderId || undefined,
        evaluatorModelId: fields.evaluatorModelId || undefined,
      })
      router.push(`/agents/${slugify(name)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Template</span>
        <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {selectedTemplate?.description && <span className="text-xs text-zinc-500">{selectedTemplate.description}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Onboarding Modernization Agent" className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        {name && <span className="text-xs text-zinc-500">/agents/{slugify(name)}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Purpose</span>
        <textarea
          rows={2}
          value={fields.purpose}
          onChange={(e) => setFields((f) => ({ ...f, purpose: e.target.value }))}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Instructions</span>
        <textarea
          rows={4}
          value={fields.instructions}
          onChange={(e) => setFields((f) => ({ ...f, instructions: e.target.value }))}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <ProviderModelPicker
        label="Generation"
        providers={providers}
        models={models}
        modelType="generation"
        providerId={fields.generationProviderId}
        modelId={fields.generationModelId}
        onChange={(p, m) => setFields((f) => ({ ...f, generationProviderId: p, generationModelId: m }))}
      />

      <ProviderModelPicker
        label="Embedding"
        providers={providers}
        models={models}
        modelType="embedding"
        providerId={fields.embeddingProviderId}
        modelId={fields.embeddingModelId}
        onChange={(p, m) => setFields((f) => ({ ...f, embeddingProviderId: p, embeddingModelId: m }))}
      />

      <ProviderModelPicker
        label="Evaluator"
        providers={providers}
        models={models}
        modelType="generation"
        providerId={fields.evaluatorProviderId}
        modelId={fields.evaluatorModelId}
        onChange={(p, m) => setFields((f) => ({ ...f, evaluatorProviderId: p, evaluatorModelId: m }))}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Creating…' : 'Create Agent'}
      </button>
    </form>
  )
}
