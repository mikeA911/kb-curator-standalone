import 'server-only'
import { z } from 'zod'
import type { ToolSpec } from '@/lib/ai'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BusinessFunction, ProjectRole, ApprovalType } from '@/types/database'

// Role-Aware Project Views and Ember-First Member Workspace, Stage 3 (View
// 4). Not registered in src/lib/mcp/tools.ts's general registry -- same
// "defined here, intercepted in loop.ts before reaching callTool" pattern as
// SEARCH_PROJECT_KNOWLEDGE_TOOL, because this tool's behavior depends on
// resolvedProjectId, which callTool()'s generic dispatch has no way to
// carry, and it must never accept a model-supplied Project ID.

export const LIST_PROJECT_MEMBERS_TOOL_NAME = 'list_project_members'

const InputSchema = z.object({
  search: z.string().max(100).optional(),
})

export const LIST_PROJECT_MEMBERS_TOOL: ToolSpec = {
  name: LIST_PROJECT_MEMBERS_TOOL_NAME,
  description:
    "List active members of THIS project -- who's working on it, who owns it, and who handles a given approval responsibility. The project is fixed for this conversation -- there is no project parameter to set. Optionally filter with a bounded search string matched against name, email, project role, or business function. Returns only minimal collaboration fields -- never platform-wide roles, other Projects' memberships, evidence-access grants, or private activity. Fetch fresh every time this is asked; never guess from earlier in the conversation or persist the roster into a saved summary.",
  parameters: z.toJSONSchema(InputSchema),
}

export interface ProjectMemberResult {
  userId: string
  displayLabel: string
  role: ProjectRole
  isOwner: boolean
  businessFunction: BusinessFunction | null
  approvalResponsibilities: { approvalType: ApprovalType; monetaryLimit: number | null; discountLimitPercent: number | null }[]
}

export async function runListProjectMembers(
  ctx: WorkbenchCallerContext,
  projectId: string,
  rawInput: unknown
): Promise<{ members: ProjectMemberResult[] }> {
  const input = InputSchema.parse(rawInput)

  const { data: memberRows, error: memberError } = await ctx.supabase
    .from('project_members')
    .select('user_id, role, business_function')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('created_at')
  if (memberError) throw memberError
  const members = memberRows ?? []
  if (members.length === 0) return { members: [] }

  const userIds = members.map((m) => m.user_id)

  // Display names are for collaboration display only, same narrow
  // admin-client pattern as MemberDirectory.tsx / the Project page --
  // project_members itself (fetched above, RLS-scoped) is the real
  // authorization boundary proving these are genuinely active members of a
  // project the caller belongs to. profiles RLS alone would return nothing
  // here for a non-staff caller looking up a co-member.
  const admin = createAdminClient()
  const { data: profiles } = await admin.from('profiles').select('id, email, full_name').in('id', userIds)
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  const { data: authorityRows, error: authorityError } = await ctx.supabase
    .from('project_authority_assignments')
    .select('user_id, approval_type, monetary_limit, discount_limit_percent')
    .eq('project_id', projectId)
    .eq('status', 'active')
  if (authorityError) throw authorityError
  const authoritiesByUser = new Map<string, ProjectMemberResult['approvalResponsibilities']>()
  for (const a of authorityRows ?? []) {
    const list = authoritiesByUser.get(a.user_id) ?? []
    list.push({ approvalType: a.approval_type, monetaryLimit: a.monetary_limit, discountLimitPercent: a.discount_limit_percent })
    authoritiesByUser.set(a.user_id, list)
  }

  let results: ProjectMemberResult[] = members.map((m) => {
    const profile = profileById.get(m.user_id)
    return {
      userId: m.user_id,
      displayLabel: profile?.full_name || profile?.email || 'Member',
      role: m.role,
      isOwner: m.role === 'owner',
      businessFunction: m.business_function,
      approvalResponsibilities: authoritiesByUser.get(m.user_id) ?? [],
    }
  })

  const search = input.search?.trim().toLowerCase()
  if (search) {
    results = results.filter((r) => [r.displayLabel, r.role, r.businessFunction ?? ''].some((field) => field.toLowerCase().includes(search)))
  }

  return { members: results }
}
