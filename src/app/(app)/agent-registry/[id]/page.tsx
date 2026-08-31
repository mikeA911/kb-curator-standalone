import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CertificationActions } from '@/components/builder-integrations/CertificationActions'
import { ProjectAvailability } from '@/components/builder-integrations/ProjectAvailability'
import { CERTIFICATION_LABELS, KIND_LABELS, RISK_LABELS } from '@/components/builder-integrations/certification'
import { listProjectAvailability } from '@/lib/builder-integrations/registry'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: integration } = await supabase.from('builder_integrations').select('*').eq('id', id).single()
  if (!integration) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Two separate authorization boundaries, not one: certification is
  // staff-only (unchanged from before this generalization -- a builder
  // self-registers a draft but cannot self-certify it), while Project
  // availability may be managed by the registering builder too (concept
  // paper: "Availability should be deliberate," not staff-gatekept for
  // every builder's own integration).
  let isStaff = false
  let canManageAvailability = false
  let profile: { id: string; role: string } | null = null
  if (user) {
    const { data: viewerProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (viewerProfile) {
      profile = viewerProfile
      isStaff = viewerProfile.role === 'curator' || viewerProfile.role === 'admin'
      canManageAvailability = isStaff || integration.created_by === user.id
    }
  }

  const { data: versions } = await supabase
    .from('builder_integration_versions')
    .select('*')
    .eq('builder_integration_id', id)
    .order('version_number', { ascending: false })

  const activeVersion = versions?.find((v) => v.id === integration.active_version_id) ?? versions?.[0]

  const availability =
    canManageAvailability && user && profile ? await listProjectAvailability({ user, profile, supabase } as WorkbenchCallerContext, id) : []
  const { data: allProjects } = canManageAvailability ? await supabase.from('projects').select('id, name').order('name') : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{integration.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">{integration.purpose}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {KIND_LABELS[integration.kind]} · {integration.protocol.toUpperCase()} · {integration.endpoint_url ?? 'no endpoint yet'} · status:{' '}
          {integration.status}
        </p>
      </div>

      {activeVersion && isStaff && (
        <CertificationActions integrationId={integration.id} versionId={activeVersion.id} currentStatus={activeVersion.certification_status} />
      )}

      {canManageAvailability && (
        <ProjectAvailability
          integrationId={integration.id}
          granted={availability}
          availableProjects={(allProjects ?? []).map((p) => ({ id: p.id, name: p.name }))}
        />
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Version history</h2>
        <div className="mt-2 flex flex-col gap-3">
          {(versions ?? []).map((v) => (
            <div key={v.id} className="rounded border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  v{v.version_number}
                  {v.id === integration.active_version_id && <span className="ml-2 text-xs text-zinc-500">(active)</span>}
                </p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {CERTIFICATION_LABELS[v.certification_status]}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                Risk: {RISK_LABELS[v.risk_classification] ?? v.risk_classification}
                {v.auth_method ? ` · Auth: ${v.auth_method}` : ''}
              </p>
              {v.skills.length > 0 && (
                <p className="mt-1 text-xs text-zinc-600">
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
