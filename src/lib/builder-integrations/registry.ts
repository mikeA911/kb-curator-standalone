import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type {
  BuilderIntegrationKind,
  BuilderIntegrationRiskClassification,
  ExternalAgentCertificationStatus,
  ExternalAgentProtocol,
} from '@/types/database'
import { BuilderIntegrationValidationError } from './errors'

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

export interface RegisterBuilderIntegrationInput {
  name: string
  purpose: string
  kind: BuilderIntegrationKind
  protocol: ExternalAgentProtocol
  endpointUrl?: string | null
  projectId?: string | null
  skills: { name: string; description: string; provider?: string }[]
  credentialsPolicy: Record<string, unknown>
  spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
  approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
  permittedScope?: { projectIds?: string[]; userIds?: string[] }
  riskClassification?: BuilderIntegrationRiskClassification
  authMethod?: string | null
}

export async function registerBuilderIntegration(ctx: WorkbenchCallerContext, input: RegisterBuilderIntegrationInput) {
  const { user, profile, supabase } = ctx
  if (profile.role === 'anonymous') {
    throw new BuilderIntegrationValidationError('Create an account to register an integration')
  }
  if (!input.name.trim()) throw new BuilderIntegrationValidationError('Name is required')
  if (!input.purpose.trim()) throw new BuilderIntegrationValidationError('Purpose is required')

  const baseSlug = slugify(input.name)
  const insertIntegration = (slug: string) =>
    supabase
      .from('builder_integrations')
      .insert({
        name: input.name,
        slug,
        purpose: input.purpose,
        kind: input.kind,
        protocol: input.protocol,
        endpoint_url: input.endpointUrl ?? null,
        project_id: input.projectId ?? null,
        status: 'draft',
        created_by: user.id,
      })
      .select('id')
      .single()

  let { data: integration, error: integrationError } = await insertIntegration(baseSlug)
  // Postgres unique_violation on the slug -- retry once with a short
  // disambiguating suffix rather than pre-checking (avoids a check-then-
  // insert race between two builders registering similarly-named integrations).
  if (integrationError?.code === '23505') {
    ;({ data: integration, error: integrationError } = await insertIntegration(`${baseSlug}-${Date.now().toString(36).slice(-4)}`))
  }
  if (integrationError || !integration) throw integrationError ?? new Error('Failed to register integration')

  const { data: version, error: versionError } = await supabase
    .from('builder_integration_versions')
    .insert({
      builder_integration_id: integration.id,
      version_number: 1,
      skills: input.skills,
      credentials_policy: input.credentialsPolicy,
      spending_limits: input.spendingLimits,
      approval_policy: input.approvalPolicy,
      permitted_scope: input.permittedScope ?? {},
      risk_classification: input.riskClassification ?? 'read_only',
      auth_method: input.authMethod ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new Error('Failed to create initial version')

  const { error: updateError } = await supabase.from('builder_integrations').update({ active_version_id: version.id }).eq('id', integration.id)
  if (updateError) throw updateError

  return { integrationId: integration.id as string, versionId: version.id as string }
}

export interface CreateBuilderIntegrationVersionInput {
  skills: { name: string; description: string; provider?: string }[]
  credentialsPolicy: Record<string, unknown>
  spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
  approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
  permittedScope?: { projectIds?: string[]; userIds?: string[] }
  riskClassification?: BuilderIntegrationRiskClassification
  authMethod?: string | null
  notes?: string | null
}

export async function createBuilderIntegrationVersion(
  ctx: WorkbenchCallerContext,
  integrationId: string,
  input: CreateBuilderIntegrationVersionInput
) {
  const { user, profile, supabase } = ctx
  const { data: integration, error: integrationError } = await supabase
    .from('builder_integrations')
    .select('id, created_by')
    .eq('id', integrationId)
    .single()
  if (integrationError || !integration) throw integrationError ?? new BuilderIntegrationValidationError('Integration not found')
  if (integration.created_by !== user.id && profile.role !== 'curator' && profile.role !== 'admin') {
    throw new BuilderIntegrationValidationError('Only the registering builder or staff may add a new version')
  }

  const { data: latest } = await supabase
    .from('builder_integration_versions')
    .select('version_number')
    .eq('builder_integration_id', integrationId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (latest?.version_number ?? 0) + 1

  const { data: version, error: versionError } = await supabase
    .from('builder_integration_versions')
    .insert({
      builder_integration_id: integrationId,
      version_number: nextVersion,
      skills: input.skills,
      credentials_policy: input.credentialsPolicy,
      spending_limits: input.spendingLimits,
      approval_policy: input.approvalPolicy,
      permitted_scope: input.permittedScope ?? {},
      risk_classification: input.riskClassification ?? 'read_only',
      auth_method: input.authMethod ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new Error('Failed to create version')

  const { error: updateError } = await supabase.from('builder_integrations').update({ active_version_id: version.id }).eq('id', integrationId)
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
    throw new BuilderIntegrationValidationError('Only curator/admin staff may change certification status')
  }
  if (!CERTIFICATION_STATUSES.includes(newStatus)) {
    throw new BuilderIntegrationValidationError(`Invalid certification status: ${newStatus}`)
  }

  const update: { certification_status: ExternalAgentCertificationStatus; approved_by?: string; approved_at?: string } = {
    certification_status: newStatus,
  }
  if (APPROVED_FROM.includes(newStatus)) {
    update.approved_by = user.id
    update.approved_at = new Date().toISOString()
  }

  const { error } = await supabase.from('builder_integration_versions').update(update).eq('id', versionId)
  if (error) throw error
}

// --- Project availability -----------------------------------------------
// Real Project-scoping (builder_integration_project_availability), replacing
// the inert permitted_scope.projectIds JSON. Authorization mirrors
// createBuilderIntegrationVersion's existing rule: the registering builder
// or curator/admin staff -- deliberate access is the point (concept paper:
// "Availability should be deliberate and Project-specific").

async function requireIntegrationManager(ctx: WorkbenchCallerContext, integrationId: string): Promise<void> {
  const { user, profile, supabase } = ctx
  const { data: integration, error } = await supabase.from('builder_integrations').select('id, created_by').eq('id', integrationId).single()
  if (error || !integration) throw error ?? new BuilderIntegrationValidationError('Integration not found')
  if (integration.created_by !== user.id && profile.role !== 'curator' && profile.role !== 'admin') {
    throw new BuilderIntegrationValidationError('Only the registering builder or staff may manage Project availability')
  }
}

export async function grantProjectAvailability(ctx: WorkbenchCallerContext, integrationId: string, projectId: string): Promise<void> {
  await requireIntegrationManager(ctx, integrationId)
  const { error } = await ctx.supabase
    .from('builder_integration_project_availability')
    .insert({ builder_integration_id: integrationId, project_id: projectId, granted_by: ctx.user.id })
  if (error) throw error
}

export async function revokeProjectAvailability(ctx: WorkbenchCallerContext, integrationId: string, availabilityId: string): Promise<void> {
  await requireIntegrationManager(ctx, integrationId)
  const { error } = await ctx.supabase.from('builder_integration_project_availability').delete().eq('id', availabilityId)
  if (error) throw error
}

export interface ProjectAvailabilityEntry {
  id: string
  projectId: string
  projectName: string
}

export async function listProjectAvailability(ctx: WorkbenchCallerContext, integrationId: string): Promise<ProjectAvailabilityEntry[]> {
  const { data: rows, error } = await ctx.supabase
    .from('builder_integration_project_availability')
    .select('id, project_id')
    .eq('builder_integration_id', integrationId)
    .order('created_at')
  if (error) throw error
  if (!rows || rows.length === 0) return []

  const projectIds = rows.map((r) => r.project_id)
  const { data: projects, error: projectsError } = await ctx.supabase.from('projects').select('id, name').in('id', projectIds)
  if (projectsError) throw projectsError
  const nameById = new Map((projects ?? []).map((p) => [p.id, p.name]))

  return rows.map((r) => ({ id: r.id, projectId: r.project_id, projectName: nameById.get(r.project_id) ?? 'Unknown project' }))
}
