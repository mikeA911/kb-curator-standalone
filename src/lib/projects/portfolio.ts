import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Administrator/curator organization portfolio (docs/dev-request-role-aware-
// project-views-and-ember-first-workspace.md, View 1). A narrowly defined
// safe-metadata projection -- never source/document/chat content -- so it
// stays safe regardless of the caller's client (the page decides whether to
// pass the caller's own session client or the admin client; this function
// doesn't care, same convention as getOrganizationExplorer). "Safe" here
// means the query itself never selects `goal`, `details`, or anything
// content-shaped, not that sensitive columns are fetched and hidden by the
// UI (the dev request explicitly rules that pattern out).
export interface PortfolioProjectRow {
  id: string
  name: string
  projectType: string
  objective: string | null
  status: string
  ownerEmail: string | null
  activeMemberCount: number
  knowledgeBaseCount: number
  authorityGapCount: number
  hasUnpublishedDraft: boolean
  updatedAt: string
  viewerIsMember: boolean
  viewerHasPendingMembershipRequest: boolean
}

export async function getOrganizationPortfolio(supabase: SupabaseClient<Database>, viewerId: string): Promise<PortfolioProjectRow[]> {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, project_type, objective, status, owner_id, visibility, public_profile, updated_at')
    .order('name')
  if (projectsError) throw projectsError
  if (!projects || projects.length === 0) return []

  const projectIds = projects.map((p) => p.id)
  const ownerIds = [...new Set(projects.map((p) => p.owner_id).filter((id): id is string => !!id))]

  const [
    { data: owners, error: ownersError },
    { data: memberRows, error: membersError },
    { data: kbLinks, error: kbError },
    { data: policies, error: policiesError },
    { data: assignments, error: assignmentsError },
    { data: pendingRequests, error: pendingRequestsError },
  ] = await Promise.all([
    ownerIds.length > 0 ? supabase.from('profiles').select('id, email').in('id', ownerIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('project_members').select('project_id, user_id, status').in('project_id', projectIds),
    supabase.from('project_knowledge_bases').select('project_id').in('project_id', projectIds),
    supabase.from('project_approval_policies').select('project_id, approval_type, requirement_status').in('project_id', projectIds),
    supabase.from('project_authority_assignments').select('project_id, approval_type, status').in('project_id', projectIds),
    // Own already-sent, still-open "Membership request" notes -- a curator
    // reloading this page must see the request they already sent, not a
    // reset "Request membership" button that would let them fire off a
    // duplicate note (and duplicate notification) to the same owner every
    // visit. project_notes_select_own covers this for a non-member author.
    supabase.from('project_notes').select('project_id').eq('author_id', viewerId).eq('subject', 'Membership request').eq('status', 'open').in('project_id', projectIds),
  ])
  if (ownersError) throw ownersError
  if (membersError) throw membersError
  if (kbError) throw kbError
  if (policiesError) throw policiesError
  if (assignmentsError) throw assignmentsError
  if (pendingRequestsError) throw pendingRequestsError

  const pendingRequestProjectIds = new Set((pendingRequests ?? []).map((r) => r.project_id))

  const ownerEmailById = new Map((owners ?? []).map((o) => [o.id, o.email]))

  const activeMemberCountByProject = new Map<string, number>()
  const viewerMemberProjectIds = new Set<string>()
  for (const m of memberRows ?? []) {
    if (m.status !== 'active') continue
    activeMemberCountByProject.set(m.project_id, (activeMemberCountByProject.get(m.project_id) ?? 0) + 1)
    if (m.user_id === viewerId) viewerMemberProjectIds.add(m.project_id)
  }

  const kbCountByProject = new Map<string, number>()
  for (const link of kbLinks ?? []) {
    kbCountByProject.set(link.project_id, (kbCountByProject.get(link.project_id) ?? 0) + 1)
  }

  const requiredApprovalTypesByProject = new Map<string, Set<string>>()
  for (const p of policies ?? []) {
    if (p.requirement_status !== 'required') continue
    const set = requiredApprovalTypesByProject.get(p.project_id) ?? new Set<string>()
    set.add(p.approval_type)
    requiredApprovalTypesByProject.set(p.project_id, set)
  }
  const assignedApprovalTypesByProject = new Map<string, Set<string>>()
  for (const a of assignments ?? []) {
    if (a.status !== 'active') continue
    const set = assignedApprovalTypesByProject.get(a.project_id) ?? new Set<string>()
    set.add(a.approval_type)
    assignedApprovalTypesByProject.set(a.project_id, set)
  }

  return projects.map((p) => {
    const required = requiredApprovalTypesByProject.get(p.id) ?? new Set<string>()
    const assigned = assignedApprovalTypesByProject.get(p.id) ?? new Set<string>()
    const authorityGapCount = [...required].filter((t) => !assigned.has(t)).length

    return {
      id: p.id,
      name: p.name,
      projectType: p.project_type,
      objective: p.objective,
      status: p.status,
      ownerEmail: p.owner_id ? (ownerEmailById.get(p.owner_id) ?? null) : null,
      activeMemberCount: activeMemberCountByProject.get(p.id) ?? 0,
      knowledgeBaseCount: kbCountByProject.get(p.id) ?? 0,
      authorityGapCount,
      hasUnpublishedDraft: p.visibility === 'private' && p.public_profile != null,
      updatedAt: p.updated_at,
      viewerIsMember: viewerMemberProjectIds.has(p.id),
      viewerHasPendingMembershipRequest: pendingRequestProjectIds.has(p.id),
    }
  })
}
