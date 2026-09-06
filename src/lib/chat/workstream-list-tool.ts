import 'server-only'
import { z } from 'zod'
import type { ToolSpec } from '@/lib/ai'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type { WorkstreamStatus } from '@/types/database'

// Fixes a live-observed failure mode: attach_workstream_artifact/
// create_workstream take a real workstream_id/project_id, but nothing ever
// told the model what those real ids are -- it had no way to answer other
// than guessing a human-readable name/slug as if it were the id, which then
// failed against the real UUID column. This tool closes that gap the same
// way list_project_members closes it for people: intercepted in loop.ts
// (never registered in src/lib/mcp/tools.ts's general registry), always
// scoped to the conversation's own server-resolved project, never a
// model-supplied project id.

export const LIST_WORKSTREAMS_TOOL_NAME = 'list_workstreams'

const InputSchema = z.object({})

export const LIST_WORKSTREAMS_TOOL: ToolSpec = {
  name: LIST_WORKSTREAMS_TOOL_NAME,
  description:
    "List THIS project's own workstreams with their real ids, names, and status. Call this before attach_workstream_artifact or create_workstream whenever you need to reference an existing workstream -- never guess a workstreamId from its display name. The project is fixed for this conversation -- there is no project parameter to set.",
  parameters: z.toJSONSchema(InputSchema),
}

export interface WorkstreamListItem {
  id: string
  name: string
  slug: string
  status: WorkstreamStatus
}

export async function runListWorkstreams(ctx: WorkbenchCallerContext, projectId: string): Promise<{ workstreams: WorkstreamListItem[] }> {
  const { data, error } = await ctx.supabase
    .from('project_workstreams')
    .select('id, name, slug, status')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error

  return { workstreams: data ?? [] }
}
