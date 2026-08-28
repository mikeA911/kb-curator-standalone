import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type { ExternalAgentCertificationStatus, ExternalAgentProtocol } from '@/types/database'
import { ExternalAgentValidationError } from './errors'

const CERTIFICATION_STATUSES: ExternalAgentCertificationStatus[] = [
  'experimental',
  'sandbox_tested',
  'security_reviewed',
  'outlet_accepted',
  'production_approved',
  'deprecated',
  'suspended',
]

// Certification is a version-level property (see the migration comment: "a
// material code, API or permission change requires reassessment"), and only
// certain tiers carry an accountable approver -- experimental/sandbox_tested
// are self-serve-adjacent milestones, not something staff sign off on.
const APPROVED_FROM: ExternalAgentCertificationStatus[] = ['security_reviewed', 'outlet_accepted', 'production_approved']

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'agent'
  )
}

export interface RegisterExternalAgentInput {
  name: string
  purpose: string
  protocol: ExternalAgentProtocol
  endpointUrl?: string | null
  projectId?: string | null
  skills: { name: string; description: string; provider?: string }[]
  credentialsPolicy: Record<string, unknown>
  spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
  approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
  permittedScope?: { projectIds?: string[]; userIds?: string[] }
}

export async function registerExternalAgent(ctx: WorkbenchCallerContext, input: RegisterExternalAgentInput) {
  const { user, profile, supabase } = ctx
  if (profile.role === 'anonymous') {
    throw new ExternalAgentValidationError('Create an account to register an agent')
  }
  if (!input.name.trim()) throw new ExternalAgentValidationError('Name is required')
  if (!input.purpose.trim()) throw new ExternalAgentValidationError('Purpose is required')

  const baseSlug = slugify(input.name)
  const insertAgent = (slug: string) =>
    supabase
      .from('external_agents')
      .insert({
        name: input.name,
        slug,
        purpose: input.purpose,
        protocol: input.protocol,
        endpoint_url: input.endpointUrl ?? null,
        project_id: input.projectId ?? null,
        status: 'draft',
        created_by: user.id,
      })
      .select('id')
      .single()

  let { data: agent, error: agentError } = await insertAgent(baseSlug)
  // Postgres unique_violation on the slug -- retry once with a short
  // disambiguating suffix rather than pre-checking (avoids a check-then-
  // insert race between two builders registering similarly-named agents).
  if (agentError?.code === '23505') {
    ;({ data: agent, error: agentError } = await insertAgent(`${baseSlug}-${Date.now().toString(36).slice(-4)}`))
  }
  if (agentError || !agent) throw agentError ?? new Error('Failed to register agent')

  const { data: version, error: versionError } = await supabase
    .from('external_agent_versions')
    .insert({
      external_agent_id: agent.id,
      version_number: 1,
      skills: input.skills,
      credentials_policy: input.credentialsPolicy,
      spending_limits: input.spendingLimits,
      approval_policy: input.approvalPolicy,
      permitted_scope: input.permittedScope ?? {},
      created_by: user.id,
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new Error('Failed to create initial version')

  const { error: updateError } = await supabase.from('external_agents').update({ active_version_id: version.id }).eq('id', agent.id)
  if (updateError) throw updateError

  return { agentId: agent.id as string, versionId: version.id as string }
}

export interface CreateExternalAgentVersionInput {
  skills: { name: string; description: string; provider?: string }[]
  credentialsPolicy: Record<string, unknown>
  spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
  approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
  permittedScope?: { projectIds?: string[]; userIds?: string[] }
  notes?: string | null
}

export async function createExternalAgentVersion(ctx: WorkbenchCallerContext, agentId: string, input: CreateExternalAgentVersionInput) {
  const { user, profile, supabase } = ctx
  const { data: agent, error: agentError } = await supabase.from('external_agents').select('id, created_by').eq('id', agentId).single()
  if (agentError || !agent) throw agentError ?? new ExternalAgentValidationError('Agent not found')
  if (agent.created_by !== user.id && profile.role !== 'curator' && profile.role !== 'admin') {
    throw new ExternalAgentValidationError('Only the registering builder or staff may add a new version')
  }

  const { data: latest } = await supabase
    .from('external_agent_versions')
    .select('version_number')
    .eq('external_agent_id', agentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (latest?.version_number ?? 0) + 1

  const { data: version, error: versionError } = await supabase
    .from('external_agent_versions')
    .insert({
      external_agent_id: agentId,
      version_number: nextVersion,
      skills: input.skills,
      credentials_policy: input.credentialsPolicy,
      spending_limits: input.spendingLimits,
      approval_policy: input.approvalPolicy,
      permitted_scope: input.permittedScope ?? {},
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new Error('Failed to create version')

  const { error: updateError } = await supabase.from('external_agents').update({ active_version_id: version.id }).eq('id', agentId)
  if (updateError) throw updateError

  return { versionId: version.id as string, versionNumber: nextVersion }
}

export async function updateCertificationStatus(
  ctx: WorkbenchCallerContext,
  versionId: string,
  newStatus: ExternalAgentCertificationStatus
) {
  const { user, profile, supabase } = ctx
  if (profile.role !== 'curator' && profile.role !== 'admin') {
    throw new ExternalAgentValidationError('Only curator/admin staff may change certification status')
  }
  if (!CERTIFICATION_STATUSES.includes(newStatus)) {
    throw new ExternalAgentValidationError(`Invalid certification status: ${newStatus}`)
  }

  const update: { certification_status: ExternalAgentCertificationStatus; approved_by?: string; approved_at?: string } = {
    certification_status: newStatus,
  }
  if (APPROVED_FROM.includes(newStatus)) {
    update.approved_by = user.id
    update.approved_at = new Date().toISOString()
  }

  const { error } = await supabase.from('external_agent_versions').update(update).eq('id', versionId)
  if (error) throw error
}
