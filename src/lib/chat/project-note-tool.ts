import 'server-only'
import { z } from 'zod'
import type { ToolSpec } from '@/lib/ai'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { createProjectNote } from '@/lib/projects/notes'

// Role-Aware Project Views and Ember-First Member Workspace, Stage 4 (View
// 4, "Optional note sending through Ember"). Same interception pattern as
// list_project_members/search_project_knowledge -- not in src/lib/mcp/tools.ts's
// general registry, since this tool's behavior depends on resolvedProjectId
// (never model-supplied) and must re-check membership at call time.
//
// There is no code-level "propose, then confirm, then execute" mechanism
// anywhere else in this codebase's tool-calling loop (create_project,
// create_workstream, etc. all execute immediately on a single model call) --
// the "obtain explicit confirmation before sending" requirement is enforced
// through prompt guidance only (see buildProjectPromptAddendum in loop.ts),
// same trust boundary already accepted for every other mutating tool. What
// *is* code-enforced here is the membership re-check and the underlying
// project_notes_insert_member RLS policy, which independently rejects an
// attempt to address a non-member regardless of what the model believes.

export const SEND_PROJECT_NOTE_TOOL_NAME = 'send_project_note'

const InputSchema = z.object({
  recipientUserId: z.string().min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
})

export const SEND_PROJECT_NOTE_TOOL: ToolSpec = {
  name: SEND_PROJECT_NOTE_TOOL_NAME,
  description:
    "Send an addressed Project Note to one active member of THIS project. recipientUserId must be a userId returned by list_project_members in this same conversation -- never invent one. The note lands in the project's existing Notes area and follows normal reply/resolve rules; this is not email, SMS, or a new messaging channel. Only call this after you have told the user the exact recipient, subject and body and they have explicitly confirmed sending in their own reply -- never call it speculatively or in the same turn you proposed the content.",
  parameters: z.toJSONSchema(InputSchema),
}

export async function runSendProjectNote(
  ctx: WorkbenchCallerContext,
  projectId: string,
  rawInput: unknown
): Promise<{ noteId: string; route: string }> {
  const input = InputSchema.parse(rawInput)

  // Re-check recipient membership at call time (dev request line 218) --
  // project_notes_insert_member's RLS enforces the same rule independently
  // on insert, but this gives a clear, actionable error instead of a raw
  // RLS violation if the model acted on a stale/hallucinated recipient.
  const { data: recipientMembership } = await ctx.supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', input.recipientUserId)
    .eq('status', 'active')
    .maybeSingle()
  if (!recipientMembership) {
    throw new Error('That person is not an active member of this project, so a note cannot be sent to them. Call list_project_members again for current recipients.')
  }

  const { noteId } = await createProjectNote(ctx.supabase, ctx.profile, {
    projectId,
    recipientType: 'user',
    recipientUserId: input.recipientUserId,
    subject: input.subject,
    body: input.body,
  })

  return { noteId, route: `/projects/${projectId}/notes/${noteId}` }
}
