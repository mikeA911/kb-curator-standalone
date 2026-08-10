import Link from 'next/link'
import type { AIModelRow, AIProviderRow } from '@/types/database'
import { HelpTip } from '@/components/wiki/HelpTip'

export function AIProvidersList({
  providers,
  models,
  configuredByProvider,
}: {
  providers: AIProviderRow[]
  models: AIModelRow[]
  configuredByProvider: Record<string, boolean>
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        AI providers
        <HelpTip slug="ai-agents" />
      </h2>
      <div className="flex flex-col gap-2">
        {providers.map((p) => {
          const modelCount = models.filter((m) => m.provider_id === p.id).length
          const configured = configuredByProvider[p.id]
          return (
            <Link
              key={p.id}
              href={`/admin/providers/${p.id}`}
              className="flex items-center justify-between rounded border border-zinc-200 bg-white p-4 text-sm hover:border-zinc-400"
            >
              <div>
                <div className="font-medium">{p.display_name}</div>
                <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                  <span>Status: {p.enabled ? 'Enabled' : 'Disabled'}</span>
                  <span>API key: {configured ? 'Configured' : 'Missing'}</span>
                  <span>Models: {modelCount}</span>
                </div>
              </div>
              <span className="text-xs underline">Manage</span>
            </Link>
          )
        })}
        {providers.length === 0 && <p className="text-sm text-zinc-500">No AI providers configured.</p>}
      </div>
    </section>
  )
}
