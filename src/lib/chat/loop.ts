import 'server-only'
import { getActiveChatProvider } from '@/lib/ai'
import type { ChatMessage } from '@/lib/ai'
import { callTool, getToolSpecs } from '@/lib/mcp/tools'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { createConversation, listMessages, appendMessage } from './conversations'

// Version string stamped onto anything the Assistant creates
// (created_via='assistant') -- bump when the system prompt or tool set
// changes meaningfully enough that old provenance is worth distinguishing
// from new. Not tied to a package/app version; this is specifically about
// "which assistant behavior produced this row."
export const ASSISTANT_PROMPT_VERSION = 'm6d-v1'

const SYSTEM_PROMPT = `You are the KB Sandbox Workbench Assistant. You help users navigate and operate the platform: search the Wiki, look up project notes, create projects and workstreams, and attach evidence artifacts.

You only know what your tools tell you -- don't invent facts about the platform's data. If a user describes a new feature they want built, do not attempt to build it: acknowledge the request in your reply as something for them to bring to a coding session, and do not call any tool to try to implement it.

Be concise. When you use a tool, briefly say what you did in your final reply.`

// A create_* tool succeeded; the loop stamps provenance on the row it just
// created as a follow-up update -- kept entirely here, not in
// src/lib/workbench/* or src/lib/mcp/tools.ts, so those stay unaware of
// "chat"/"assistant" as a concept and remain reusable by any caller.
async function stampProvenance(
  ctx: WorkbenchCallerContext,
  toolName: string,
  output: unknown,
  conversationId: string
): Promise<void> {
  const stamp = { created_via: 'assistant', assistant_prompt_version: ASSISTANT_PROMPT_VERSION, assistant_conversation_id: conversationId }
  if (toolName === 'create_project' && output && typeof output === 'object' && 'projectId' in output) {
    await ctx.supabase.from('projects').update(stamp).eq('id', (output as { projectId: string }).projectId)
  } else if (toolName === 'create_workstream' && output && typeof output === 'object' && 'workstreamId' in output) {
    await ctx.supabase.from('project_workstreams').update(stamp).eq('id', (output as { workstreamId: string }).workstreamId)
  } else if (toolName === 'attach_workstream_artifact' && output && typeof output === 'object' && 'artifactId' in output) {
    await ctx.supabase.from('workstream_artifacts').update(stamp).eq('id', (output as { artifactId: string }).artifactId)
  }
}

const MAX_TOOL_ITERATIONS = 5

export async function runAssistantTurn(
  ctx: WorkbenchCallerContext,
  conversationId: string | null,
  userMessage: string
): Promise<{ conversationId: string; reply: string }> {
  const conversation = conversationId
    ? { id: conversationId }
    : await createConversation(ctx.supabase, ctx.user.id, userMessage.slice(0, 80))

  const priorRows = conversationId ? await listMessages(ctx.supabase, conversationId) : []
  const history: ChatMessage[] = priorRows.map((r) => ({
    role: r.role,
    content: r.content ?? '',
    toolCalls: r.tool_calls ?? undefined,
    toolCallId: r.tool_call_id ?? undefined,
    toolName: r.tool_name ?? undefined,
  }))

  history.push({ role: 'user', content: userMessage })
  await appendMessage(ctx.supabase, { conversationId: conversation.id, userId: ctx.user.id, role: 'user', content: userMessage })

  const provider = await getActiveChatProvider(ctx.supabase, { requestedBy: ctx.user.id })
  const tools = getToolSpecs()

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const result = await provider.generateChat({ messages: history, system: SYSTEM_PROMPT, tools })
    history.push(result.message)
    await appendMessage(ctx.supabase, {
      conversationId: conversation.id,
      userId: ctx.user.id,
      role: 'assistant',
      content: result.message.content || null,
      toolCalls: result.message.toolCalls ?? null,
    })

    if (!result.message.toolCalls || result.message.toolCalls.length === 0) {
      return { conversationId: conversation.id, reply: result.message.content }
    }

    for (const toolCall of result.message.toolCalls) {
      let toolResultText: string
      try {
        const output = await callTool(ctx, toolCall.name, toolCall.arguments)
        await stampProvenance(ctx, toolCall.name, output, conversation.id)
        toolResultText = JSON.stringify(output)
      } catch (err) {
        toolResultText = JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
      }

      const toolMessage: ChatMessage = { role: 'tool', content: toolResultText, toolCallId: toolCall.id, toolName: toolCall.name }
      history.push(toolMessage)
      await appendMessage(ctx.supabase, {
        conversationId: conversation.id,
        userId: ctx.user.id,
        role: 'tool',
        content: toolResultText,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      })
    }
  }

  const fallback = "I wasn't able to finish that within the allotted number of steps -- could you try rephrasing or breaking it into a smaller request?"
  await appendMessage(ctx.supabase, { conversationId: conversation.id, userId: ctx.user.id, role: 'assistant', content: fallback })
  return { conversationId: conversation.id, reply: fallback }
}
