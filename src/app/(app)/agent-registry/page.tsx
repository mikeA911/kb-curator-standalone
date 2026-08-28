import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const CERTIFICATION_LABELS: Record<string, string> = {
  experimental: 'Experimental',
  sandbox_tested: 'Sandbox Tested',
  security_reviewed: 'Security Reviewed',
  outlet_accepted: 'Outlet Accepted',
  production_approved: 'Production Approved',
  deprecated: 'Deprecated',
  suspended: 'Suspended',
}

const CERTIFICATION_STYLES: Record<string, string> = {
  experimental: 'bg-zinc-100 text-zinc-700',
  sandbox_tested: 'bg-amber-100 text-amber-800',
  security_reviewed: 'bg-blue-100 text-blue-700',
  outlet_accepted: 'bg-indigo-100 text-indigo-700',
  production_approved: 'bg-green-100 text-green-800',
  deprecated: 'bg-zinc-200 text-zinc-500',
  suspended: 'bg-red-100 text-red-800',
}

const PROTOCOL_LABELS: Record<string, string> = { mcp: 'MCP', https: 'HTTPS' }

export default async function AgentRegistryPage() {
  const supabase = await createClient()

  const { data: agents } = await supabase
    .from('external_agents')
    .select('id, name, purpose, protocol, endpoint_url, status, project_id, active_version_id')
    .order('created_at', { ascending: false })

  const versionIds = (agents ?? []).map((a) => a.active_version_id).filter((id): id is string => !!id)
  const { data: versions } =
    versionIds.length > 0
      ? await supabase.from('external_agent_versions').select('id, certification_status, version_number').in('id', versionIds)
      : { data: [] }
  const versionById = new Map((versions ?? []).map((v) => [v.id, v]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Agent Registry</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Externally-hosted agents built by builders (students, founders, software houses) and registered here for KB
            Sandbox to govern -- versioned spec, certification status, evidence. See the{' '}
            <Link href="/wiki/what-kb-sandbox-actually-does-a-capability-overview" className="underline">
              Workbench Handbook
            </Link>{' '}
            for the Agent Design method this registry supports.
          </p>
        </div>
        <Link href="/agent-registry/new" className="shrink-0 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Register an agent
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(agents ?? []).map((a) => {
          const version = a.active_version_id ? versionById.get(a.active_version_id) : undefined
          return (
            <Link key={a.id} href={`/agent-registry/${a.id}`} className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{a.name}</h3>
                {version && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CERTIFICATION_STYLES[version.certification_status]}`}>
                    {CERTIFICATION_LABELS[version.certification_status]}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {PROTOCOL_LABELS[a.protocol] ?? a.protocol}
                {version && ` · v${version.version_number}`}
                {a.endpoint_url ? ` · ${a.endpoint_url}` : ' · no endpoint yet'}
              </p>
              <p className="mt-1 text-sm text-zinc-600">{a.purpose}</p>
            </Link>
          )
        })}
        {(agents ?? []).length === 0 && (
          <p className="text-sm text-zinc-500 sm:col-span-2">
            No agents registered yet. Register the first one to demonstrate the pattern -- name, purpose, protocol
            (MCP or HTTPS), skills, credential references (never the secrets themselves), spending limits, and an
            approval policy.
          </p>
        )}
      </div>
    </div>
  )
}
