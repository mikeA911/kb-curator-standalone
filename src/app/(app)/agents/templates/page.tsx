import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listAgentTemplates } from '@/lib/agent/queries'

export default async function AgentTemplatesPage() {
  const supabase = await createClient()
  const templates = await listAgentTemplates(supabase)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/agents" className="text-sm underline">
          &larr; Agents
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Agent Templates</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Reusable defaults for creating a new Agent. Choosing a template prefills purpose, instructions, graph, and
          models -- all editable, and copied (not linked) into the Agent you create, so a later template edit never
          changes an Agent already created from it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{t.name}</h3>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{t.agent_type}</span>
            </div>
            {t.description && <p className="mt-1 text-sm text-zinc-600">{t.description}</p>}
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm text-zinc-500 sm:col-span-2">No templates yet.</p>}
      </div>
    </div>
  )
}
