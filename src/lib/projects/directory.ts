import 'server-only'
import { AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// Permission-safe Project directory (OR-036) -- every Project marked
// discoverability='platform', for any signed-in user, without granting
// content access merely by listing it. Same "narrow, explicitly-safe
// column list, never goal/details/content, admin client with an explicit
// role check as the real gate (never RLS)" discipline as
// getOrganizationPortfolio (src/lib/projects/portfolio.ts) -- that one is
// admin/curator-only and org-wide; this one is any signed-in user and
// scoped to just the discoverable subset.
export interface DirectoryProjectRow {
  id: string
  name: string
  projectType: string
  objective: string | null
  status: string
  ownerEmail: string | null
  isOrganizationHome: boolean
  viewerIsMember: boolean
  viewerHasPendingJoinRequest: boolean
}

export async function listDiscoverableProjects(ctx: WorkbenchCallerContext, opts: { excludeProjectId?: string } = {}): Promise<DirectoryProjectRow[]> {
  if (ctx.profile.role === 'anonymous') throw new AuthError('Create an account to browse the Project directory')

  const admin = createAdminClient()
  let query = admin
    .from('projects')
    .select('id, name, project_type, objective, status, owner_id, is_organization_home')
    .eq('discoverability', 'platform')
    .order('name')
  if (opts.excludeProjectId) query = query.neq('id', opts.excludeProjectId)
  const { data: projects, error: projectsError } = await query
  if (projectsError) throw projectsError
  if (!projects || projects.length === 0) return []

  const projectIds = projects.map((p) => p.id)
  const ownerIds = [...new Set(projects.map((p) => p.owner_id).filter((id): id is string => !!id))]

  const [{ data: owners, error: ownersError }, { data: memberRows, error: membersError }, { data: pendingRequests, error: pendingError }] =
    await Promise.all([
      ownerIds.length > 0 ? admin.from('profiles').select('id, email').in('id', ownerIds) : Promise.resolve({ data: [], error: null }),
      admin.from('project_members').select('project_id, user_id, status').in('project_id', projectIds).eq('user_id', ctx.user.id),
      admin.from('project_join_requests').select('project_id').eq('requester_id', ctx.user.id).eq('status', 'pending').in('project_id', projectIds),
    ])
  if (ownersError) throw ownersError
  if (membersError) throw membersError
  if (pendingError) throw pendingError

  const ownerEmailById = new Map((owners ?? []).map((o) => [o.id, o.email]))
  const viewerMemberProjectIds = new Set((memberRows ?? []).filter((m) => m.status === 'active').map((m) => m.project_id))
  const pendingRequestProjectIds = new Set((pendingRequests ?? []).map((r) => r.project_id))

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    projectType: p.project_type,
    objective: p.objective,
    status: p.status,
    ownerEmail: p.owner_id ? (ownerEmailById.get(p.owner_id) ?? null) : null,
    isOrganizationHome: p.is_organization_home,
    viewerIsMember: viewerMemberProjectIds.has(p.id),
    viewerHasPendingJoinRequest: pendingRequestProjectIds.has(p.id),
  }))
}
