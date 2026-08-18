import 'server-only'
import { AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProjectRole, ProjectType, ProjectMemberStatus, PublicProjectProfile } from '@/types/database'
import { ProjectValidationError } from '@/lib/projects/errors'
import type { WorkbenchCallerContext } from './context'

// profiles RLS (profiles_select_own_or_staff) only lets a caller see their
// own row or staff see everyone -- a plain consultant creating/managing a
// project can't look up a teammate's id by email through the normal
// RLS-scoped client. This is the one deliberately narrow use of the
// service-role client in this module, and it only ever returns id+email --
// never role, is_active, or anything else off the profiles row.
async function resolveUserIdsByEmail(emails: string[]): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map()
  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('id, email').in('email', emails)
  if (error) throw error
  return new Map((data ?? []).filter((p) => p.email).map((p) => [p.email as string, p.id]))
}

// Any authenticated, non-anonymous session can start a project -- there's no
// platform-role gate on project creation, only a project-role one once it
// exists (see project_members RLS). This uses the caller's own RLS-scoped
// client throughout for the mutation itself; RLS is the real gate, this is
// just a friendlier error message than a raw policy violation. The DB
// trigger (create_owner_membership, 20260810120001) guarantees the creator
// gets an 'owner' project_members row before this function's second insert
// runs, which is what makes adding staged team members via the caller's own
// (RLS-checked, not admin) client work correctly.
export async function createProject(
  ctx: WorkbenchCallerContext,
  input: {
    name: string
    projectType: ProjectType
    objective: string
    details: Record<string, string>
    knowledgeBaseId: string | null
    evalDatasetId: string | null
    members: { email: string; role: ProjectRole }[]
  }
) {
  const { user, profile, supabase } = ctx
  if (profile.role === 'anonymous') {
    throw new AuthError('Create an account to start a project')
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: input.name,
      project_type: input.projectType,
      objective: input.objective || null,
      status: 'draft',
      notes: null,
      details: input.details,
      owner_id: user.id,
    })
    .select()
    .single()
  if (error || !project) throw error ?? new Error('Failed to create project')

  if (input.knowledgeBaseId) {
    await supabase.from('knowledge_bases').update({ project_id: project.id }).eq('id', input.knowledgeBaseId)
  }
  if (input.evalDatasetId) {
    await supabase.from('eval_datasets').update({ project_id: project.id }).eq('id', input.evalDatasetId)
  }

  const staged = input.members.filter((m) => m.email && m.email !== user.email)
  if (staged.length > 0) {
    const idByEmail = await resolveUserIdsByEmail(staged.map((m) => m.email))
    const rows = staged
      .map((m) => {
        const userId = idByEmail.get(m.email)
        return userId ? { project_id: project.id, user_id: userId, role: m.role, status: 'active' as ProjectMemberStatus } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
    if (rows.length > 0) {
      await supabase.from('project_members').insert(rows)
    }
  }

  return { projectId: project.id }
}

// Attaching an existing KB/dataset mutates that entity's own row, not just
// the project -- kept curator+ (same bar as authoring knowledge/evals
// generally), unlike project creation itself.
export async function attachKnowledgeBase(ctx: WorkbenchCallerContext, projectId: string, knowledgeBaseId: string) {
  const { error } = await ctx.supabase.from('knowledge_bases').update({ project_id: projectId }).eq('id', knowledgeBaseId)
  if (error) throw error
}

export async function attachEvalDataset(ctx: WorkbenchCallerContext, projectId: string, datasetId: string) {
  const { error } = await ctx.supabase.from('eval_datasets').update({ project_id: projectId }).eq('id', datasetId)
  if (error) throw error
}

export async function updateProjectNotes(ctx: WorkbenchCallerContext, projectId: string, notes: string) {
  const { error } = await ctx.supabase.from('projects').update({ notes: notes || null }).eq('id', projectId)
  if (error) throw error
}

// Draft -> completed, i.e. "not yet approved" -> "approved". Curator or
// admin, by either role system: platform role (curator/admin) OR project
// role (owner/curator for this specific project) -- same bar as
// canCurateWorkstreams on the project page. Uses the service-role client
// deliberately, not a new RLS policy: projects_update_managers (the
// existing UPDATE policy) is owner-or-admin only, and widening it to admit
// curators would let a project curator edit ANY column on the row (notes,
// goal, public_profile, ...), not just status -- RLS is row-level, not
// column-level. The permission check below is the real gate for this one
// narrow column.
export async function approveProject(ctx: WorkbenchCallerContext, projectId: string) {
  const { user, profile, supabase } = ctx

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  const canApprove =
    profile.role === 'admin' || profile.role === 'curator' || membership?.role === 'owner' || membership?.role === 'curator'
  if (!canApprove) throw new AuthError('Only a curator or admin can approve this project')

  const admin = createAdminClient()
  const { error } = await admin.from('projects').update({ status: 'completed' }).eq('id', projectId)
  if (error) throw error
}

// Shared method/approach, common to every workstream in the project -- see
// the `goal` column comment on the Project type. Same owner/admin-only gate
// as updateProjectNotes (projects_update_managers).
export async function updateProjectGoal(ctx: WorkbenchCallerContext, projectId: string, goal: string) {
  const { error } = await ctx.supabase.from('projects').update({ goal: goal.trim() || null }).eq('id', projectId)
  if (error) throw error
}

// Minimal cross-user lookup backing the "add existing user" controls (the
// wizard's Team step and the Members page) -- returns only id+email, never
// role/is_active/anything else. See resolveUserIdsByEmail's comment for why
// this needs the service-role client at all.
export async function searchProfilesByEmail(ctx: WorkbenchCallerContext, query: string): Promise<{ id: string; email: string }[]> {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to search for teammates')
  if (query.trim().length < 2) return []

  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('id, email').ilike('email', `%${query.trim()}%`).limit(10)
  if (error) throw error
  return (data ?? []).filter((p): p is { id: string; email: string } => Boolean(p.email))
}

// Project-member management. All four rely on RLS (can_manage_project --
// active 'owner' membership or platform admin) as the real gate; the
// anonymous check here just rejects anonymous sessions early with a clearer
// error than a raw policy violation.
export async function addProjectMember(ctx: WorkbenchCallerContext, projectId: string, email: string, role: ProjectRole) {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to manage project members')

  const idByEmail = await resolveUserIdsByEmail([email])
  const userId = idByEmail.get(email)
  if (!userId) throw new ProjectValidationError(`No account found for ${email}`)

  const { error } = await ctx.supabase.from('project_members').insert({ project_id: projectId, user_id: userId, role, status: 'active' })
  if (error) throw error
}

export async function updateProjectMemberRole(ctx: WorkbenchCallerContext, memberId: string, role: ProjectRole) {
  const { error } = await ctx.supabase.from('project_members').update({ role }).eq('id', memberId)
  if (error) throw error
}

export async function updateProjectMemberStatus(ctx: WorkbenchCallerContext, memberId: string, status: ProjectMemberStatus) {
  const { error } = await ctx.supabase.from('project_members').update({ status }).eq('id', memberId)
  if (error) throw error
}

// A project always has exactly one owner_id -- transferring ownership moves
// it, promotes the target membership to 'owner', and demotes whoever held it
// before to 'curator' rather than leaving a stale/conflicting owner row.
export async function transferOwnership(ctx: WorkbenchCallerContext, projectId: string, newOwnerMemberId: string) {
  const { supabase } = ctx

  const { data: newOwnerMember, error: memberError } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('id', newOwnerMemberId)
    .single()
  if (memberError || !newOwnerMember) throw memberError ?? new ProjectValidationError('Member not found')

  const { data: project, error: projectError } = await supabase.from('projects').select('owner_id').eq('id', projectId).single()
  if (projectError || !project) throw projectError ?? new ProjectValidationError('Project not found')

  const { error: updateProjectError } = await supabase
    .from('projects')
    .update({ owner_id: newOwnerMember.user_id })
    .eq('id', projectId)
  if (updateProjectError) throw updateProjectError

  const { error: promoteError } = await supabase.from('project_members').update({ role: 'owner' }).eq('id', newOwnerMemberId)
  if (promoteError) throw promoteError

  if (project.owner_id && project.owner_id !== newOwnerMember.user_id) {
    await supabase.from('project_members').update({ role: 'curator' }).eq('project_id', projectId).eq('user_id', project.owner_id)
  }
}

// Publication. All three rely on RLS (can_manage_project -- active 'owner'
// membership or platform admin, via the existing projects_update_managers
// policy, which already covers these columns since they're on the same
// row) as the real gate -- the anonymous check here is the same
// defense-in-depth convention as every other function in this module. No
// curator-drafting tier: the design doc is explicit that owner/admin
// publishing is sufficient for this milestone, no approval workflow.
export async function savePublicProfileDraft(ctx: WorkbenchCallerContext, projectId: string, profile: PublicProjectProfile) {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to manage a project')

  const { error } = await ctx.supabase.from('projects').update({ public_profile: profile }).eq('id', projectId)
  if (error) throw error
}

export async function publishProject(ctx: WorkbenchCallerContext, projectId: string, publicSlug: string) {
  const { user, profile, supabase } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to manage a project')

  const { error } = await supabase
    .from('projects')
    .update({ visibility: 'public', published_at: new Date().toISOString(), published_by: user.id, public_slug: publicSlug })
    .eq('id', projectId)
  if (error) {
    if (error.code === '23505') throw new ProjectValidationError('That URL is already taken -- choose a different one')
    throw error
  }
}

// Stricter than the rest of the publish flow (which is owner-or-admin via
// can_manage_project RLS): "full data exposure" -- real workstreams,
// artifacts, and assessment responses, not just the curated public_profile
// summary -- is gated to platform admins only, enforced here at the
// application layer since RLS alone can't distinguish "admin-only" from
// "owner-or-admin" on the same projects_update_managers policy. Deliberately
// per-project (not global): every other published project keeps
// public_full_detail=false unless an admin opts it in individually.
export async function setPublicFullDetail(ctx: WorkbenchCallerContext, projectId: string, enabled: boolean) {
  if (ctx.profile.role !== 'admin') throw new AuthError('Only a platform admin can enable full data exposure for a published project')

  const { error } = await ctx.supabase.from('projects').update({ public_full_detail: enabled }).eq('id', projectId)
  if (error) throw error
}

// Frees the slug (so it can be reused later) but preserves public_profile
// draft content -- unpublishing shouldn't lose the owner's work.
export async function unpublishProject(ctx: WorkbenchCallerContext, projectId: string) {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to manage a project')

  const { error } = await ctx.supabase
    .from('projects')
    .update({ visibility: 'private', published_at: null, published_by: null, public_slug: null })
    .eq('id', projectId)
  if (error) throw error
}
