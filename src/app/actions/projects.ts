'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireRole, AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProjectRole, ProjectType, ProjectMemberStatus, PublicProjectProfile } from '@/types/database'
import { ProjectValidationError } from '@/lib/projects/errors'

// profiles RLS (profiles_select_own_or_staff) only lets a caller see their
// own row or staff see everyone -- a plain consultant creating/managing a
// project can't look up a teammate's id by email through the normal
// RLS-scoped client. This is the one deliberately narrow use of the
// service-role client in this file, and it only ever returns id+email --
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
export async function createProjectAction(input: {
  name: string
  projectType: ProjectType
  objective: string
  details: Record<string, string>
  knowledgeBaseId: string | null
  evalDatasetId: string | null
  members: { email: string; role: ProjectRole }[]
}) {
  const { user, profile, supabase } = await requireUser()
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

  revalidatePath('/projects')
  return { projectId: project.id }
}

// Attaching an existing KB/dataset mutates that entity's own row, not just
// the project -- kept curator+ (same bar as authoring knowledge/evals
// generally), unlike project creation itself.
export async function attachKnowledgeBaseAction(projectId: string, knowledgeBaseId: string) {
  const { supabase } = await requireRole('curator')
  const { error } = await supabase.from('knowledge_bases').update({ project_id: projectId }).eq('id', knowledgeBaseId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}`)
}

export async function attachEvalDatasetAction(projectId: string, datasetId: string) {
  const { supabase } = await requireRole('curator')
  const { error } = await supabase.from('eval_datasets').update({ project_id: projectId }).eq('id', datasetId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}`)
}

export async function updateProjectNotesAction(projectId: string, notes: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('projects').update({ notes: notes || null }).eq('id', projectId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}`)
}

// Shared method/approach, common to every workstream in the project -- see
// the `goal` column comment on the Project type. Same owner/admin-only gate
// as updateProjectNotesAction (projects_update_managers).
export async function updateProjectGoalAction(projectId: string, goal: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('projects').update({ goal: goal.trim() || null }).eq('id', projectId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}`)
}

// Minimal cross-user lookup backing the "add existing user" controls (the
// wizard's Team step and the Members page) -- returns only id+email, never
// role/is_active/anything else. See resolveUserIdsByEmail's comment for why
// this needs the service-role client at all.
export async function searchProfilesByEmailAction(query: string): Promise<{ id: string; email: string }[]> {
  const { profile } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to search for teammates')
  if (query.trim().length < 2) return []

  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('id, email').ilike('email', `%${query.trim()}%`).limit(10)
  if (error) throw error
  return (data ?? []).filter((p): p is { id: string; email: string } => Boolean(p.email))
}

// Project-member management. All four rely on RLS (can_manage_project --
// active 'owner' membership or platform admin) as the real gate; requireUser
// here just rejects anonymous sessions early with a clearer error than a raw
// policy violation.
export async function addProjectMemberAction(projectId: string, email: string, role: ProjectRole) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to manage project members')

  const idByEmail = await resolveUserIdsByEmail([email])
  const userId = idByEmail.get(email)
  if (!userId) throw new ProjectValidationError(`No account found for ${email}`)

  const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: userId, role, status: 'active' })
  if (error) throw error
  revalidatePath(`/projects/${projectId}/members`)
}

export async function updateProjectMemberRoleAction(memberId: string, projectId: string, role: ProjectRole) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('project_members').update({ role }).eq('id', memberId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}/members`)
}

export async function updateProjectMemberStatusAction(memberId: string, projectId: string, status: ProjectMemberStatus) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('project_members').update({ status }).eq('id', memberId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}/members`)
}

// A project always has exactly one owner_id -- transferring ownership moves
// it, promotes the target membership to 'owner', and demotes whoever held it
// before to 'curator' rather than leaving a stale/conflicting owner row.
export async function transferOwnershipAction(projectId: string, newOwnerMemberId: string) {
  const { supabase } = await requireUser()

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

  revalidatePath(`/projects/${projectId}/members`)
}

// Publication. All three rely on RLS (can_manage_project -- active 'owner'
// membership or platform admin, via the existing projects_update_managers
// policy, which already covers these columns since they're on the same
// row) as the real gate -- requireUser + the anonymous check here are the
// same defense-in-depth convention as every other action in this file. No
// curator-drafting tier: the design doc is explicit that owner/admin
// publishing is sufficient for this milestone, no approval workflow.
export async function savePublicProfileDraftAction(projectId: string, profile: PublicProjectProfile) {
  const { profile: viewerProfile, supabase } = await requireUser()
  if (viewerProfile.role === 'anonymous') throw new AuthError('Create an account to manage a project')

  const { error } = await supabase.from('projects').update({ public_profile: profile }).eq('id', projectId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}/publish`)
}

export async function publishProjectAction(projectId: string, publicSlug: string) {
  const { user, profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to manage a project')

  const { error } = await supabase
    .from('projects')
    .update({ visibility: 'public', published_at: new Date().toISOString(), published_by: user.id, public_slug: publicSlug })
    .eq('id', projectId)
  if (error) {
    if (error.code === '23505') throw new ProjectValidationError('That URL is already taken -- choose a different one')
    throw error
  }
  revalidatePath(`/projects/${projectId}/publish`)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/examples')
  revalidatePath(`/examples/${publicSlug}`)
}

// Frees the slug (so it can be reused later) but preserves public_profile
// draft content -- unpublishing shouldn't lose the owner's work.
export async function unpublishProjectAction(projectId: string) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to manage a project')

  const { error } = await supabase
    .from('projects')
    .update({ visibility: 'private', published_at: null, published_by: null, public_slug: null })
    .eq('id', projectId)
  if (error) throw error
  revalidatePath(`/projects/${projectId}/publish`)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/examples')
}
