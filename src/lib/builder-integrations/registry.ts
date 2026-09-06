import { hasRequiredRole } from '@/lib/auth'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type {
  BuilderIntegrationKind,
  BuilderIntegrationRiskClassification,
  CapabilityEvaluation,
  CapabilityEvaluationTemplateId,
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

// Builder Capability Promotion (docs/dev-request-builder-capability-
// promotion-evaluation-templates.md): reuses risk_classification directly
// as the doc's own risk-profile concept (read_only<->Low,
// reversible_write<->Moderate, administrative<->High,
// consequential_write<->Transactional -- consequential_write's own
// definition, "creates/changes/submits data," is exactly the doc's
// Transactional definition) rather than adding a second, overlapping
// taxonomy. PROFILE_REQUIRED_TEMPLATES encodes the doc's own risk-profile
// table (Low skips identity_permissions entirely; only Transactional
// requires human_decision); TRANSITION_TEMPLATES encodes which templates
// are semantically tied to advancing to a given certification stage (the
// doc's own "Used at" annotations). The intersection of the two is what's
// actually required for a specific version to advance to a specific stage.
const PROFILE_REQUIRED_TEMPLATES: Record<BuilderIntegrationRiskClassification, CapabilityEvaluationTemplateId[]> = {
  read_only: ['scope_evidence', 'functional_contract', 'customer_acceptance', 'production_readiness'],
  reversible_write: ['scope_evidence', 'functional_contract', 'identity_permissions', 'customer_acceptance', 'production_readiness'],
  administrative: ['scope_evidence', 'functional_contract', 'identity_permissions', 'customer_acceptance', 'production_readiness'],
  consequential_write: [
    'scope_evidence',
    'functional_contract',
    'identity_permissions',
    'human_decision',
    'customer_acceptance',
    'production_readiness',
  ],
}

const TRANSITION_TEMPLATES: Partial<Record<ExternalAgentCertificationStatus, CapabilityEvaluationTemplateId[]>> = {
  sandbox_tested: ['scope_evidence'],
  security_reviewed: ['functional_contract', 'identity_permissions'],
  outlet_accepted: ['customer_acceptance', 'human_decision'],
  production_approved: ['production_readiness'],
}

function requiredTemplatesForTransition(
  risk: BuilderIntegrationRiskClassification,
  target: ExternalAgentCertificationStatus
): CapabilityEvaluationTemplateId[] {
  const forTransition = TRANSITION_TEMPLATES[target] ?? []
  const forProfile = new Set(PROFILE_REQUIRED_TEMPLATES[risk])
  return forTransition.filter((t) => forProfile.has(t))
}

const SATISFIED_STATUSES = new Set(['pass', 'conditional_pass', 'not_applicable'])

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
  // OL-007: 'member' is deliberately excluded from Builder self-registration
  // -- builder_integrations_insert_own's RLS now requires
  // is_consultant_or_above too, see 20260831120001_member_role.sql.
  if (!hasRequiredRole(profile.role, 'consultant')) {
    throw new BuilderIntegrationValidationError('Your account needs to be a consultant or above to register an integration')
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

  // Capability Promotion gate: a version cannot advance to a stage whose
  // required evaluation templates (per its own risk_classification) aren't
  // yet pass/conditional_pass/not_applicable. Deprecated/suspended are
  // exits, not advances -- no template gate applies to those.
  if (newStatus !== 'deprecated' && newStatus !== 'suspended') {
    const { data: version } = await supabase.from('builder_integration_versions').select('risk_classification').eq('id', versionId).single()
    if (!version) throw new BuilderIntegrationValidationError('Version not found')

    const required = requiredTemplatesForTransition(version.risk_classification, newStatus)
    if (required.length > 0) {
      const { data: evaluations } = await supabase
        .from('capability_evaluations')
        .select('template_id, status')
        .eq('builder_integration_version_id', versionId)
        .in('template_id', required)
      const satisfied = new Set((evaluations ?? []).filter((e) => SATISFIED_STATUSES.has(e.status)).map((e) => e.template_id))
      const missing = required.filter((t) => !satisfied.has(t))
      if (missing.length > 0) {
        throw new BuilderIntegrationValidationError(
          `Cannot advance to ${newStatus} -- required evaluation template(s) not yet satisfied: ${missing.join(', ')}`
        )
      }
    }
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

// --- Capability Promotion evaluations -------------------------------------
// Same authorization shape as requireIntegrationManager below (registering
// builder or staff), just resolved from a version id rather than an
// integration id directly.
async function requireIntegrationManagerForVersion(ctx: WorkbenchCallerContext, versionId: string): Promise<void> {
  const { user, profile, supabase } = ctx
  const { data: version, error: versionError } = await supabase
    .from('builder_integration_versions')
    .select('builder_integration_id')
    .eq('id', versionId)
    .single()
  if (versionError || !version) throw versionError ?? new BuilderIntegrationValidationError('Version not found')
  const { data: integration, error: integrationError } = await supabase
    .from('builder_integrations')
    .select('created_by')
    .eq('id', version.builder_integration_id)
    .single()
  if (integrationError || !integration) throw integrationError ?? new BuilderIntegrationValidationError('Integration not found')
  if (integration.created_by !== user.id && profile.role !== 'curator' && profile.role !== 'admin') {
    throw new BuilderIntegrationValidationError('Only the registering builder or staff may manage evaluation evidence')
  }
}

export async function listCapabilityEvaluations(ctx: WorkbenchCallerContext, versionId: string): Promise<CapabilityEvaluation[]> {
  const { data, error } = await ctx.supabase.from('capability_evaluations').select('*').eq('builder_integration_version_id', versionId)
  if (error) throw error
  return data ?? []
}

// Combined evidence note per template (confirmed with Mike -- not itemized
// per-check tracking). Upsert on (version, template) -- always leaves the
// row at 'ready_for_review' so a revision after a 'fail'/'conditional_pass'
// re-enters review, matching "reopen affected templates when a material
// change occurs" loosely (full automatic re-evaluation-trigger detection is
// explicitly deferred). Only ever writes evidence_notes/status -- never the
// terminal decision fields, both by convention here and enforced for real
// by capability_evaluations_update_owner_evidence's own WITH CHECK.
export async function upsertCapabilityEvidence(
  ctx: WorkbenchCallerContext,
  versionId: string,
  templateId: CapabilityEvaluationTemplateId,
  evidenceNotes: string
): Promise<void> {
  await requireIntegrationManagerForVersion(ctx, versionId)

  const { data: existing, error: existingError } = await ctx.supabase
    .from('capability_evaluations')
    .select('id')
    .eq('builder_integration_version_id', versionId)
    .eq('template_id', templateId)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    const { error } = await ctx.supabase
      .from('capability_evaluations')
      .update({ evidence_notes: evidenceNotes, status: 'ready_for_review' })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await ctx.supabase.from('capability_evaluations').insert({
      builder_integration_version_id: versionId,
      template_id: templateId,
      evidence_notes: evidenceNotes,
      status: 'ready_for_review',
      created_by: ctx.user.id,
    })
    if (error) throw error
  }
}

// curator/admin only -- same bar as updateCertificationStatus. A Builder's
// platform role is always 'consultant', so this already excludes them from
// deciding their own evaluation; capability_evaluations_decide_staff (RLS)
// is the backstop.
export async function decideCapabilityEvaluation(
  ctx: WorkbenchCallerContext,
  evaluationId: string,
  status: 'pass' | 'conditional_pass' | 'fail' | 'not_applicable',
  rationale?: string
): Promise<void> {
  if (ctx.profile.role !== 'curator' && ctx.profile.role !== 'admin') {
    throw new BuilderIntegrationValidationError('Only curator/admin staff may decide a capability evaluation')
  }
  const { error } = await ctx.supabase
    .from('capability_evaluations')
    .update({ status, rationale: rationale?.trim() || null, reviewed_by: ctx.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', evaluationId)
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
