'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setBuilderLlmCredentialAction, clearBuilderLlmCredentialAction } from '@/app/actions/builder-llm-credentials'
import type { BuilderLlmCredentialStatus, BuilderLlmProviderType } from '@/lib/workbench/builder-llm-credentials'

const PROVIDER_OPTIONS: { value: BuilderLlmProviderType; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'groq', label: 'Groq' },
  { value: 'openai_compatible', label: 'Custom (OpenAI-compatible -- e.g. a local Ollama/LM Studio server)' },
]

// Bring-Your-Own-LLM: opts a builder out of the platform's metered
// allowance (src/lib/ai/metering.ts) entirely for their own conversation --
// never displays a previously-saved key back, only a status line, since
// there's no legitimate reason to read it back once saved.
export function BuilderLlmCredentialForm({ initialStatus }: { initialStatus: BuilderLlmCredentialStatus | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [providerType, setProviderType] = useState<BuilderLlmProviderType>(initialStatus?.providerType ?? 'openai_compatible')
  const [baseUrl, setBaseUrl] = useState(initialStatus?.baseUrl ?? '')
  const [modelId, setModelId] = useState(initialStatus?.modelId ?? '')
  const [apiKey, setApiKey] = useState('')

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        await setBuilderLlmCredentialAction({
          providerType,
          baseUrl: providerType === 'openai_compatible' ? baseUrl : null,
          modelId,
          apiKey: apiKey || null,
        })
        setApiKey('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  function clear() {
    setError(null)
    startTransition(async () => {
      try {
        await clearBuilderLlmCredentialAction()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clear')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4 text-sm">
      <span className="font-medium">Bring your own LLM</span>
      <p className="text-xs text-zinc-500">
        Already have your own LLM -- a hosted API key, or a local server like Ollama or LM Studio? Use it instead of your
        platform allowance. Your key is encrypted and never shown again once saved.
      </p>

      <p className="text-xs text-zinc-600">
        {initialStatus
          ? `Configured -- ${PROVIDER_OPTIONS.find((p) => p.value === initialStatus.providerType)?.label ?? initialStatus.providerType}${
              initialStatus.baseUrl ? ` @ ${initialStatus.baseUrl}` : ''
            } (${initialStatus.modelId})`
          : 'Not configured -- using your platform allowance.'}
      </p>

      <select
        value={providerType}
        onChange={(e) => setProviderType(e.target.value as BuilderLlmProviderType)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      >
        {PROVIDER_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      {providerType === 'openai_compatible' && (
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Base URL (e.g. http://localhost:11434/v1)"
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
        />
      )}
      <input
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
        placeholder="Model (e.g. gpt-4o-mini, llama3.1)"
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Leave blank if your local server needs no key"
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !modelId.trim() || (providerType === 'openai_compatible' && !baseUrl.trim())}
          onClick={save}
          className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {initialStatus && (
          <button type="button" disabled={isPending} onClick={clear} className="text-xs text-zinc-500 underline disabled:opacity-50">
            Clear (go back to platform allowance)
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
