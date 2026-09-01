import 'server-only'
import { AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  EvidenceAuditEventType,
  EvidenceClassification,
  EvidenceResourceType,
  InformationSensitivity,
  ProjectAccessGroup,
  ProjectAccessGroupMember,
  ResourceAccessAuditLogEntry,
  ResourceAccessGrant,
  ResourceAccessPolicy,
} from '@/types/database'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// Project Evidence Access Controls, Stage 1 (docs/dev-request-project-
// evidence-access-controls.md). Every function here uses the caller's own
// RLS-scoped client (can_manage_project -- owner or platform admin -- is the
// real gate on all five tables) except writeAuditEntry, which uses the
// admin client since resource_access_audit_log has no client insert policy
// at all (same "no client insert path" shape as ai_operation_logs).

function requireManager(ctx: WorkbenchCallerContext) {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to manage project evidence access')
}

// Exported for src/lib/projects/access-requests.ts's decideResourceAccessRequest
// -- an Approve decision needs the exact same audit-log shape as a manual
// grant made from the Access & Evidence page, without duplicating it.
export async function writeAuditEntry(entry: {
  projectId: string
  eventType: EvidenceAuditEventType
  actorId: string
  resourceType?: EvidenceResourceType
  resourceId?: string
  fromClassification?: EvidenceClassification | null
  toClassification?: EvidenceClassification | null
  targetGroupId?: string | null
  targetMemberId?: string | null
}) {
  const admin = createAdminClient()
  const { error } = await admin.from('resource_access_audit_log').insert({
    project_id: entry.projectId,
    event_type: entry.eventType,
    actor_id: entry.actorId,
    resource_type: entry.resourceType ?? null,
    resource_id: entry.resourceId ?? null,
    from_classification: entry.fromClassification ?? null,
    to_classification: entry.toClassification ?? null,
    target_group_id: entry.targetGroupId ?? null,
    target_member_id: entry.targetMemberId ?? null,
  })
  if (error) throw error
}

// --- Access groups -----------------------------------------------------------

export interface AccessGroupInput {
  name: string
  description?: string | null
}

export async function listAccessGroups(
  ctx: WorkbenchCallerContext,
  projectId: string
): Promise<{ groups: ProjectAccessGroup[]; members: ProjectAccessGroupMember[] }> {
  const { data: groups, error: groupError } = await ctx.supabase
    .from('project_access_groups')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')
  if (groupError) throw groupError

  const groupIds = (groups ?? []).map((g) => g.id)
  const { data: members, error: memberError } = groupIds.length
    ? await ctx.supabase.from('project_access_group_members').select('*').in('project_access_group_id', groupIds).order('granted_at', { ascending: false })
    : { data: [], error: null }
  if (memberError) throw memberError

  return { groups: groups ?? [], members: members ?? [] }
}

export async function createAccessGroup(ctx: WorkbenchCallerContext, projectId: string, input: AccessGroupInput): Promise<ProjectAccessGroup> {
  requireManager(ctx)

  const { data, error } = await ctx.supabase
    .from('project_access_groups')
    .insert({ project_id: projectId, name: input.name, description: input.description ?? null, is_system_group: false, created_by: ctx.user.id })
    .select()
    .single()
  if (error) throw error

  await writeAuditEntry({ projectId, eventType: 'group_created', actorId: ctx.user.id, targetGroupId: data.id })
  return data
}

export async function grantGroupMembership(
  ctx: WorkbenchCallerContext,
  projectId: string,
  projectAccessGroupId: string,
  projectMemberId: string
): Promise<void> {
  requireManager(ctx)

  const { error } = await ctx.supabase.from('project_access_group_members').insert({
    project_access_group_id: projectAccessGroupId,
    project_member_id: projectMemberId,
    effective_from: new Date().toISOString(),
    expires_at: null,
    status: 'active',
    granted_by: ctx.user.id,
    granted_at: new Date().toISOString(),
    revoked_by: null,
    revoked_at: null,
    revocation_reason: null,
  })
  if (error) throw error

  await writeAuditEntry({
    projectId,
    eventType: 'group_member_granted',
    actorId: ctx.user.id,
    targetGroupId: projectAccessGroupId,
    targetMemberId: projectMemberId,
  })
}

export async function revokeGroupMembership(ctx: WorkbenchCallerContext, projectId: string, groupMemberId: string, reason: string): Promise<void> {
  requireManager(ctx)

  const { data: existing, error: fetchError } = await ctx.supabase
    .from('project_access_group_members')
    .select('project_access_group_id, project_member_id')
    .eq('id', groupMemberId)
    .single()
  if (fetchError) throw fetchError

  const { error } = await ctx.supabase
    .from('project_access_group_members')
    .update({ status: 'revoked', revoked_by: ctx.user.id, revoked_at: new Date().toISOString(), revocation_reason: reason })
    .eq('id', groupMemberId)
  if (error) throw error

  await writeAuditEntry({
    projectId,
    eventType: 'group_member_revoked',
    actorId: ctx.user.id,
    targetGroupId: existing.project_access_group_id,
    targetMemberId: existing.project_member_id,
  })
}

// --- Project-level AI sensitivity ----------------------------------------------
// Deliberately NOT part of classifyResource/resource_access_policies below --
// this closes the "project metadata in system prompts" gap (docs/dev-
// request-enterprise-shadow-ai-governance-later-phases.md): a project's own
// name/goal is embedded into the system prompt on every turn regardless of
// what's retrieved, and has no EvidenceClassification (human-access)
// dimension of its own -- see the column comment in
// 20260829120001_project_information_sensitivity.sql for why this is a
// plain projects column, not a resource_access_policies row. Authorization
// is the caller's own RLS-scoped client against projects_update_managers
// (can_manage_project), same boundary as classifyResource's five tables.
export async function setProjectInformationSensitivity(
  ctx: WorkbenchCallerContext,
  projectId: string,
  informationSensitivity: InformationSensitivity | null
): Promise<void> {
  requireManager(ctx)
  // .select().single() rather than a bare update -- an update matching zero
  // rows (RLS silently filtered a caller who isn't this project's manager,
  // or a bad id) returns error:null from a plain update, which would let
  // this resolve as a false success. That specific failure mode is exactly
  // what the Ember classify_project tool (src/lib/mcp/tools.ts) must not
  // hit silently -- it has no page-level "can I even see this control" gate
  // the way the human UI does, so it needs a real thrown error here to
  // avoid telling the user something was classified when it wasn't.
  const { error } = await ctx.supabase
    .from('projects')
    .update({ information_sensitivity: informationSensitivity })
    .eq('id', projectId)
    .select('id')
    .single()
  if (error) throw error
}

// --- Resource classification and grants ---------------------------------------

export interface EvidenceResourceSummary {
  resourceType: EvidenceResourceType
  resourceId: string
  title: string
}

// Every knowledge_source/wiki_article/workstream_artifact currently
// reachable in this project via its existing KB/article/workstream
// attachment -- the pool of things an owner can classify. Uses the
// caller's own RLS client throughout; a resource already restricted away
// from this owner (shouldn't happen -- owners manage their own project's
// policies -- but defensively) simply won't come back from these selects.
export async function listProjectResources(ctx: WorkbenchCallerContext, projectId: string): Promise<EvidenceResourceSummary[]> {
  const [{ data: kbLinks }, { data: articleLinks }, { data: workstreams }] = await Promise.all([
    ctx.supabase.from('project_knowledge_bases').select('knowledge_base_id').eq('project_id', projectId),
    ctx.supabase.from('project_wiki_articles').select('wiki_article_id').eq('project_id', projectId),
    ctx.supabase.from('project_workstreams').select('id').eq('project_id', projectId),
  ])

  const kbIds = (kbLinks ?? []).map((l) => l.knowledge_base_id)
  const articleIds = (articleLinks ?? []).map((l) => l.wiki_article_id)
  const workstreamIds = (workstreams ?? []).map((w) => w.id)

  const [{ data: sources }, { data: articles }, { data: artifacts }] = await Promise.all([
    kbIds.length ? ctx.supabase.from('knowledge_sources').select('id, title').in('knowledge_base_id', kbIds) : Promise.resolve({ data: [] }),
    articleIds.length ? ctx.supabase.from('wiki_articles').select('id, title').in('id', articleIds) : Promise.resolve({ data: [] }),
    workstreamIds.length
      ? ctx.supabase.from('workstream_artifacts').select('id, title').in('workstream_id', workstreamIds)
      : Promise.resolve({ data: [] }),
  ])

  return [
    ...(sources ?? []).map((s) => ({ resourceType: 'knowledge_source' as const, resourceId: s.id, title: s.title })),
    ...(articles ?? []).map((a) => ({ resourceType: 'wiki_article' as const, resourceId: a.id, title: a.title })),
    ...(artifacts ?? []).map((a) => ({ resourceType: 'workstream_artifact' as const, resourceId: a.id, title: a.title })),
  ]
}

export async function listResourcePolicies(
  ctx: WorkbenchCallerContext,
  projectId: string
): Promise<{ policies: ResourceAccessPolicy[]; grants: ResourceAccessGrant[] }> {
  const { data: policies, error: policyError } = await ctx.supabase
    .from('resource_access_policies')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
  if (policyError) throw policyError

  const policyIds = (policies ?? []).map((p) => p.id)
  const { data: grants, error: grantError } = policyIds.length
    ? await ctx.supabase.from('resource_access_grants').select('*').in('resource_access_policy_id', policyIds).order('granted_at', { ascending: false })
    : { data: [], error: null }
  if (grantError) throw grantError

  return { policies: policies ?? [], grants: grants ?? [] }
}

export interface ClassifyResourceInput {
  resourceType: EvidenceResourceType
  resourceId: string
  classification: EvidenceClassification
  // Separate axis from `classification` -- "which AI models may process this
  // content" (src/lib/ai/sensitivity.ts), not "which humans may see it".
  // Omitted = leave whatever was previously set untouched (this upsert
  // writes the whole row, so the existing value is read back and re-applied
  // below rather than silently cleared).
  informationSensitivity?: InformationSensitivity | null
  rationale?: string | null
  accessStewardUserId?: string | null
  reviewAt?: string | null
  // Access groups and/or named project members to grant in the same call.
  // Required (at least one of the two, non-empty) whenever classification
  // isn't 'project_general' -- has_evidence_access() has no owner bypass,
  // so a restricted resource created with zero grants would be unreadable
  // by literally everyone, including whoever just classified it.
  groupIds?: string[]
  memberIds?: string[]
}

export class EvidenceAccessValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvidenceAccessValidationError'
  }
}

// Shared by classifyResource's memberIds loop below and by
// decideResourceAccessRequest (src/lib/projects/access-requests.ts) approving
// a request -- the exact same grant-insert-plus-audit shape either way. Uses
// the caller's own RLS-scoped client, so the caller must already satisfy
// resource_access_grants_manage_owner (can_manage_project) -- both call
// sites already require that (requireManager here is a weaker anonymous-only
// check; decideResourceAccessRequest enforces can_manage_project itself
// before calling this).
export async function grantResourceAccessToMember(
  ctx: WorkbenchCallerContext,
  input: { projectId: string; resourceAccessPolicyId: string; projectMemberId: string; resourceType: EvidenceResourceType; resourceId: string }
): Promise<void> {
  const { error: grantError } = await ctx.supabase.from('resource_access_grants').insert({
    resource_access_policy_id: input.resourceAccessPolicyId,
    project_access_group_id: null,
    project_member_id: input.projectMemberId,
    status: 'active',
    granted_by: ctx.user.id,
    granted_at: new Date().toISOString(),
    revoked_by: null,
    revoked_at: null,
    revocation_reason: null,
  })
  if (grantError) throw grantError
  await writeAuditEntry({
    projectId: input.projectId,
    eventType: 'resource_grant_granted',
    actorId: ctx.user.id,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    targetMemberId: input.projectMemberId,
  })
}

export async function classifyResource(ctx: WorkbenchCallerContext, projectId: string, input: ClassifyResourceInput): Promise<void> {
  requireManager(ctx)

  const groupIds = input.groupIds ?? []
  const memberIds = input.memberIds ?? []
  if (input.classification !== 'project_general' && groupIds.length === 0 && memberIds.length === 0) {
    throw new EvidenceAccessValidationError(
      'Restricting a resource requires granting at least one access group or named member in the same action -- otherwise nobody, including you, would be able to read it.'
    )
  }

  const { data: existing } = await ctx.supabase
    .from('resource_access_policies')
    .select('id, classification, information_sensitivity')
    .eq('resource_type', input.resourceType)
    .eq('resource_id', input.resourceId)
    .maybeSingle()

  const { data: policy, error } = await ctx.supabase
    .from('resource_access_policies')
    .upsert(
      {
        project_id: projectId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        classification: input.classification,
        information_sensitivity: input.informationSensitivity !== undefined ? input.informationSensitivity : (existing?.information_sensitivity ?? null),
        access_steward_user_id: input.accessStewardUserId ?? null,
        review_at: input.reviewAt ?? null,
        rationale: input.rationale ?? null,
        created_by: ctx.user.id,
      },
      { onConflict: 'resource_type,resource_id' }
    )
    .select()
    .single()
  if (error) throw error

  for (const groupId of groupIds) {
    const { error: grantError } = await ctx.supabase.from('resource_access_grants').insert({
      resource_access_policy_id: policy.id,
      project_access_group_id: groupId,
      project_member_id: null,
      status: 'active',
      granted_by: ctx.user.id,
      granted_at: new Date().toISOString(),
      revoked_by: null,
      revoked_at: null,
      revocation_reason: null,
    })
    if (grantError) throw grantError
    await writeAuditEntry({
      projectId,
      eventType: 'resource_grant_granted',
      actorId: ctx.user.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      targetGroupId: groupId,
    })
  }

  for (const memberId of memberIds) {
    await grantResourceAccessToMember(ctx, {
      projectId,
      resourceAccessPolicyId: policy.id,
      projectMemberId: memberId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    })
  }

  await writeAuditEntry({
    projectId,
    eventType: existing ? 'resource_reclassified' : 'resource_classified',
    actorId: ctx.user.id,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    fromClassification: existing?.classification ?? null,
    toClassification: input.classification,
  })
}

export async function revokeResourceAccess(ctx: WorkbenchCallerContext, projectId: string, grantId: string, reason: string): Promise<void> {
  requireManager(ctx)

  const { data: grant, error: fetchError } = await ctx.supabase
    .from('resource_access_grants')
    .select('*, resource_access_policies(resource_type, resource_id)')
    .eq('id', grantId)
    .single()
  if (fetchError) throw fetchError

  const { error } = await ctx.supabase
    .from('resource_access_grants')
    .update({ status: 'revoked', revoked_by: ctx.user.id, revoked_at: new Date().toISOString(), revocation_reason: reason })
    .eq('id', grantId)
  if (error) throw error

  const policy = grant.resource_access_policies as unknown as { resource_type: EvidenceResourceType; resource_id: string } | null
  await writeAuditEntry({
    projectId,
    eventType: 'resource_grant_revoked',
    actorId: ctx.user.id,
    resourceType: policy?.resource_type,
    resourceId: policy?.resource_id,
    targetGroupId: grant.project_access_group_id,
    targetMemberId: grant.project_member_id,
  })
}

// --- Audit log -----------------------------------------------------------------

export async function listAuditLog(ctx: WorkbenchCallerContext, projectId: string): Promise<ResourceAccessAuditLogEntry[]> {
  const { data, error } = await ctx.supabase
    .from('resource_access_audit_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}
