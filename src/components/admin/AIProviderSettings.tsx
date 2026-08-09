'use client'

import { useTransition } from 'react'
import { updateAIProviderSetting } from '@/app/actions/admin'

export function AIProviderSettings({ current }: { current: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">AI provider</h2>
      <div className="flex gap-4 text-sm">
        {(['openai', 'gemini'] as const).map((provider) => (
          <label key={provider} className="flex items-center gap-2">
            <input
              type="radio"
              name="ai_provider"
              value={provider}
              defaultChecked={current === provider}
              disabled={isPending}
              onChange={() => startTransition(() => updateAIProviderSetting(provider))}
            />
            {provider}
          </label>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Controls which AIProvider implementation handles chunk enrichment and embedding for new uploads.
      </p>
    </section>
  )
}
