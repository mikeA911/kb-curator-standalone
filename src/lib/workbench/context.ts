import 'server-only'
import { requireUser } from '@/lib/auth'

// The shape every Workbench service-layer function is called with --
// deliberately identical to requireUser()/requireRole()'s existing return
// shape, not a new object callers have to be adapted to. A caller resolves
// its own identity first (cookie session today via requireUser/requireRole,
// a bearer token later via resolveCallerIdentityFromToken -- see
// identity.ts), builds this context once, then calls into
// src/lib/workbench/* -- the single place business logic and permission
// checks live, regardless of which entry point (Server Action, future MCP
// tool, future Assistant) produced the context.
export type WorkbenchCallerContext = Awaited<ReturnType<typeof requireUser>>

// Small shared helper for the "does this caller hold role X on this
// specific project" check that keeps coming up wherever a workbench
// function needs a clearer failure than a raw RLS rejection (e.g.
// createWorkstream, createAndAddProjectMember) -- always via the caller's
// own RLS-scoped client, never the service-role client, so this can never
// see a membership the caller itself isn't allowed to see.
export async function getActiveProjectRole(ctx: WorkbenchCallerContext, projectId: string): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', ctx.user.id)
    .eq('status', 'active')
    .maybeSingle()
  return data?.role ?? null
}
