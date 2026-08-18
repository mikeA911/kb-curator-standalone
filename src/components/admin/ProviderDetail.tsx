'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AIModelRow, AIModelStatus, AIProviderRow } from '@/types/database'
import {
  discoverModelsAction,
  setDefaultModelAction,
  setDefaultStructuredOutputModelAction,
  updateModelEnabledAction,
  updateModelStatusAction,
  updateProviderEnabledAction,
} from '@/app/actions/ai-providers'
import { AddModelForm } from './AddModelForm'

const STATUS_OPTIONS: AIModelStatus[] = ['active', 'deprecated', 'disabled', 'unavailable']

export function ProviderDetail({
  provider,
  models,
  configured,
}: {
  provider: AIProviderRow
  models: AIModelRow[]
  configured: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [discovered, setDiscovered] = useState<{ id: string }[] | null>(null)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState(false)

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action()
      router.refresh()
    })
  }

  async function handleRefreshModels() {
    setDiscovering(true)
    setDiscoverError(null)
    try {
      const result = await discoverModelsAction(provider.id)
      setDiscovered(result)
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : 'Discovery failed')
    } finally {
      setDiscovering(false)
    }
  }

  const knownModelIds = new Set(models.map((m) => m.model_id))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Provider: {provider.display_name}</h1>
        <div className="mt-3 flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Status</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={provider.enabled}
                disabled={isPending}
                onChange={(e) => run(() => updateProviderEnabledAction(provider.id, e.target.checked))}
              />
              {provider.enabled ? 'Enabled' : 'Disabled'}
            </label>
          </div>
          {provider.base_url && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Base URL</span>
              <span className="font-mono text-xs">{provider.base_url}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-500">Credentials</span>
            <span>{configured ? 'Configured ✓' : `Missing (set ${provider.api_key_env_var})`}</span>
          </div>
        </div>
      </div>

      {provider.supports_model_discovery && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleRefreshModels}
            disabled={discovering}
            className="self-start rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {discovering ? 'Refreshing…' : 'Refresh Models'}
          </button>
          {discoverError && <p className="text-sm text-red-600">{discoverError}</p>}
          {discovered && (
            <div className="rounded border border-zinc-200 bg-white p-4">
              <p className="mb-2 text-sm text-zinc-600">
                Discovered {discovered.length} model{discovered.length === 1 ? '' : 's'}. Adding a model does not enable it automatically
                for anything -- use Add Model below to register any you want available.
              </p>
              <ul className="flex flex-wrap gap-2 text-xs">
                {discovered.map((m) => (
                  <li key={m.id} className={`rounded px-2 py-1 ${knownModelIds.has(m.id) ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-100'}`}>
                    {m.id} {knownModelIds.has(m.id) && '(already registered)'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Models</h2>
        <div className="flex flex-col gap-2">
          {models.map((m) => (
            <div key={m.id} className="rounded border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {m.display_name}
                    {m.is_default && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">default</span>}
                    {m.is_default_structured_output && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">default (structured)</span>
                    )}
                    {m.status === 'deprecated' && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                        deprecated{m.deprecation_date ? ` (${m.deprecation_date})` : ''}
                      </span>
                    )}
                    {(m.status === 'disabled' || m.status === 'unavailable') && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">{m.status}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {m.model_id} · {m.model_type}
                    {m.context_window ? ` · ${m.context_window.toLocaleString()} ctx` : ''}
                    {m.embedding_dimensions ? ` · ${m.embedding_dimensions} dims` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      disabled={isPending}
                      onChange={(e) => run(() => updateModelEnabledAction(m.id, provider.id, e.target.checked))}
                    />
                    Enabled
                  </label>
                  {!m.is_default && (
                    <button
                      disabled={isPending}
                      onClick={() => run(() => setDefaultModelAction(m.id, provider.id, m.model_type))}
                      className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-50"
                    >
                      Set as default
                    </button>
                  )}
                  {m.supports_structured_output && !m.is_default_structured_output && (
                    <button
                      disabled={isPending}
                      onClick={() => run(() => setDefaultStructuredOutputModelAction(m.id, provider.id))}
                      className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-50"
                    >
                      Set as default (structured)
                    </button>
                  )}
                  <select
                    value={m.status}
                    disabled={isPending}
                    onChange={(e) =>
                      run(() =>
                        updateModelStatusAction(m.id, provider.id, e.target.value as AIModelStatus, m.deprecation_date)
                      )
                    }
                    className="rounded border border-zinc-300 px-1.5 py-1"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
          {models.length === 0 && <p className="text-sm text-zinc-500">No models registered for this provider yet.</p>}
        </div>
      </section>

      <AddModelForm providerId={provider.id} />
    </div>
  )
}
