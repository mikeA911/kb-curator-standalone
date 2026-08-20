import 'server-only'
import { resolveChatProvider, getDefaultModel } from '@/lib/ai'
import type { ChatMessage } from '@/lib/ai'
import { callTool, getToolSpecs } from '@/lib/mcp/tools'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { createConversation, listMessages, appendMessage } from './conversations'

// Version string stamped onto anything the Assistant creates
// (created_via='assistant') -- bump when the system prompt or tool set
// changes meaningfully enough that old provenance is worth distinguishing
// from new. Not tied to a package/app version; this is specifically about
// "which assistant behavior produced this row."
export const ASSISTANT_PROMPT_VERSION = 'm7-v4'

const SYSTEM_PROMPT = `You are the KB Sandbox Workbench Assistant. You help users navigate and operate the platform: search the Wiki, look up project notes, create projects and workstreams, and attach evidence artifacts.

You only know what your tools tell you -- don't invent facts about the platform's data.

KB Sandbox is an AI Workbench, not an autonomous software-development environment. It helps people understand, evaluate, and design engineering work -- it does not modify a target repository, commit code, open pull requests, or deploy anything. If a user asks you to build, fix, refactor, or deploy something, don't attempt it and don't claim you did: describe setting up the relevant Workbench method as a Project/Workstream instead (e.g. "I can help set up a Refactoring Plan workstream -- the Workbench will analyze the repository and produce a reviewed implementation handoff document you can then bring to your coding environment").

KB Sandbox supports these engineering/knowledge/evaluation activities as named "Workbench methods" -- documented in the platform_handbook Wiki category, not hard-coded here. search_wiki returns each matched article's full content, not just a title -- one call is normally enough to both find the matching Workbench Handbook article and read its Goal/Requirements (Required / Recommended / Optional, plus a Git-required flag)/Deliverables/Boundary sections directly in the result. You are allowed at most 2 search_wiki calls per turn (enforced -- a 3rd call will be refused); a second call is only worth making if the user's reply raises a genuinely new question (e.g. naming a prerequisite method you haven't looked up yet), never to re-ask something you already searched. If a search doesn't surface a clearly matching method, say so and ask the user what they're trying to accomplish rather than searching again.

Reply directly, reasoning from what you found: name the method that fits, and note anything Required that seems to be missing and ask for it specifically. If the user then confirms a Required input is genuinely missing, look up which method produces that missing input (e.g. no OpenAPI spec before MCP Architecture -> search for OpenAPI Discovery) and name that prerequisite method explicitly, rather than offering to generate the missing input yourself. Keep replies conversational, not an exhaustive checklist.

KB Sandbox works in one of three ways depending on the task: it can do some things itself (Native Workbench, e.g. Wiki synthesis, RAG evaluation), it can define and govern work a practitioner runs in an external tool like Claude Code or ChatGPT and returns artifacts from (External Workstream), or it can investigate and produce an evidence-backed specification/Implementation Handoff for someone else to implement (Document-First Engineering -- the default for refactoring and feature work). Mention whichever applies once you know enough to say.

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

// Raised from 5 (M6D's original value) after live testing under M7's
// requirement-resolution reasoning: a small model legitimately wanting two
// search_wiki calls plus its final reply was exhausting 5 iterations before
// producing any text, even for well-scoped requests. 8 leaves real headroom
// without masking a genuinely runaway tool loop.
const MAX_TOOL_ITERATIONS = 8

export interface ModelSelection {
  providerName: string
  modelId: string
}

export interface AssistantTurnResult {
  conversationId: string
  reply: string
  providerName: string
  providerDisplayName: string
  modelId: string
  modelDisplayName: string
  toolsUsed: string[]
  embeddingModelDisplayName?: string
}

export async function runAssistantTurn(
  ctx: WorkbenchCallerContext,
  conversationId: string | null,
  userMessage: string,
  modelSelection?: ModelSelection
): Promise<AssistantTurnResult> {
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

  const chatProvider = await resolveChatProvider(ctx.supabase, modelSelection, { requestedBy: ctx.user.id })
  const tools = getToolSpecs()
  const toolsUsed = new Set<string>()
  // Backstop for the prompt's own "search no more than twice" instruction --
  // a model that ignores it (observed live: GPT-OSS 120B repeatedly
  // re-searching for content search_wiki wasn't returning) would otherwise
  // just keep searching until MAX_TOOL_ITERATIONS kills the whole turn. Once
  // the limit is hit, the tool call is refused with an explanatory result
  // instead of actually running -- the model gets a clear signal to stop
  // searching and answer, rather than a silent no-op.
  const SEARCH_WIKI_LIMIT = 2
  let searchWikiCalls = 0

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const result = await chatProvider.provider.generateChat({
      messages: history,
      system: SYSTEM_PROMPT,
      tools,
      maxOutputTokens: chatProvider.maxOutputTokens ?? undefined,
    })
    history.push(result.message)
    await appendMessage(ctx.supabase, {
      conversationId: conversation.id,
      userId: ctx.user.id,
      role: 'assistant',
      content: result.message.content || null,
      toolCalls: result.message.toolCalls ?? null,
      provider: chatProvider.providerName,
      model: chatProvider.modelId,
    })

    if (!result.message.toolCalls || result.message.toolCalls.length === 0) {
      const embeddingModelDisplayName = toolsUsed.has('search_wiki') ? (await getDefaultModel(ctx.supabase, 'embedding')).model.display_name : undefined
      return {
        conversationId: conversation.id,
        reply: result.message.content,
        providerName: chatProvider.providerName,
        providerDisplayName: chatProvider.providerDisplayName,
        modelId: chatProvider.modelId,
        modelDisplayName: chatProvider.modelDisplayName,
        toolsUsed: [...toolsUsed],
        embeddingModelDisplayName,
      }
    }

    for (const toolCall of result.message.toolCalls) {
      toolsUsed.add(toolCall.name)
      let toolResultText: string
      if (toolCall.name === 'search_wiki' && ++searchWikiCalls > SEARCH_WIKI_LIMIT) {
        toolResultText = JSON.stringify({
          error: `search_wiki has already been called ${SEARCH_WIKI_LIMIT} times this turn. Do not search again -- answer using what you already found, or ask the user a clarifying question instead.`,
        })
      } else {
        try {
          const output = await callTool(ctx, toolCall.name, toolCall.arguments)
          await stampProvenance(ctx, toolCall.name, output, conversation.id)
          toolResultText = JSON.stringify(output)
        } catch (err) {
          toolResultText = JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
        }
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
  await appendMessage(ctx.supabase, {
    conversationId: conversation.id,
    userId: ctx.user.id,
    role: 'assistant',
    content: fallback,
    provider: chatProvider.providerName,
    model: chatProvider.modelId,
  })
  return {
    conversationId: conversation.id,
    reply: fallback,
    providerName: chatProvider.providerName,
    providerDisplayName: chatProvider.providerDisplayName,
    modelId: chatProvider.modelId,
    modelDisplayName: chatProvider.modelDisplayName,
    toolsUsed: [...toolsUsed],
  }
}
