import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CertificationActions } from '@/components/external-agents/CertificationActions'

const CERTIFICATION_LABELS: Record<string, string> = {
  experimental: 'Experimental',
  sandbox_tested: 'Sandbox Tested',
  security_reviewed: 'Security Reviewed',
  outlet_accepted: 'Outlet Accepted',
  production_approved: 'Production Approved',
  deprecated: 'Deprecated',
  suspended: 'Suspended',
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase.from('external_agents').select('*').eq('id', id).single()
  if (!agent) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  let canManage = false
  if (user) {
    const { data: viewerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    canManage = viewerProfile?.role === 'curator' || viewerProfile?.role === 'admin'
  }

  const { data: versions } = await supabase
    .from('external_agent_versions')
    .select('*')
    .eq('external_agent_id', id)
    .order('version_number', { ascending: false })

  const activeVersion = versions?.find((v) => v.id === agent.active_version_id) ?? versions?.[0]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{agent.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">{agent.purpose}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {agent.protocol.toUpperCase()} · {agent.endpoint_url ?? 'no endpoint yet'} · status: {agent.status}
        </p>
      </div>

      {activeVersion && canManage && (
        <CertificationActions agentId={agent.id} versionId={activeVersion.id} currentStatus={activeVersion.certification_status} />
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Version history</h2>
        <div className="mt-2 flex flex-col gap-3">
          {(versions ?? []).map((v) => (
            <div key={v.id} className="rounded border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  v{v.version_number}
                  {v.id === agent.active_version_id && <span className="ml-2 text-xs text-zinc-500">(active)</span>}
                </p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {CERTIFICATION_LABELS[v.certification_status]}
                </span>
              </div>
              {v.skills.length > 0 && (
                <p className="mt-2 text-xs text-zinc-600">
                  Skills: {v.skills.map((s: { name: string }) => s.name).join(', ')}
                </p>
              )}
              {v.spending_limits && Object.keys(v.spending_limits).length > 0 && (
                <p className="mt-1 text-xs text-zinc-600">Spending limits: {JSON.stringify(v.spending_limits)}</p>
              )}
              {v.approval_policy && Object.keys(v.approval_policy).length > 0 && (
                <p className="mt-1 text-xs text-zinc-600">Approval policy: {JSON.stringify(v.approval_policy)}</p>
              )}
              {v.approved_at && <p className="mt-1 text-xs text-zinc-500">Approved {new Date(v.approved_at).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
