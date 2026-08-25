import 'server-only'
import { resolveChatProvider, getDefaultModel } from '@/lib/ai'
import type { ChatMessage } from '@/lib/ai'
import { callTool, getToolSpecs } from '@/lib/mcp/tools'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type { Conversation } from '@/types/database'
import { createConversation, listMessages, appendMessage } from './conversations'
import { composeWorkingContext } from './context'
import { getConversationSummary, maybeRefreshSummary } from './summary'
import { AssistantResponseEnvelopeSchema, PRESENT_RESPONSE_TOOL, PRESENT_RESPONSE_TOOL_NAME } from './response-envelope'
import type { VerifiedAssistantEnvelope } from './response-envelope'
import { buildPersistedEnvelope, resolveEnvelopeForDisplay, type RetrievedProvenance, type RetrievedHitInfo } from './envelope-resolution'
import { resolveCreatedRecord, type CreatedRecordRef, type ResolvedCreatedRecord } from './created-records'
import { getProjectContext, describeProjectKnowledgeScope } from './project-context'
import {
  SEARCH_PROJECT_KNOWLEDGE_TOOL,
  SEARCH_PROJECT_KNOWLEDGE_TOOL_NAME,
  runSearchProjectKnowledge,
  type ProjectKnowledgeHit,
} from './project-knowledge-tool'

// Version string stamped onto anything the Assistant creates
// (created_via='assistant') -- bump when the system prompt or tool set
// changes meaningfully enough that old provenance is worth distinguishing
// from new. Not tied to a package/app version; this is specifically about
// "which assistant behavior produced this row."
export const ASSISTANT_PROMPT_VERSION = 'm7-v6'

const SYSTEM_PROMPT = `You are the KB Sandbox Workbench Assistant. You help users navigate and operate the platform: search the Wiki, look up project notes, create projects and workstreams, and attach evidence artifacts.

You only know what your tools tell you -- don't invent facts about the platform's data.

KB Sandbox is an AI Workbench, not an autonomous software-development environment. It helps people understand, evaluate, and design engineering work -- it does not modify a target repository, commit code, open pull requests, or deploy anything. If a user asks you to build, fix, refactor, or deploy something, don't attempt it and don't claim you did: describe setting up the relevant Workbench method as a Project/Workstream instead (e.g. "I can help set up a Refactoring Plan workstream -- the Workbench will analyze the repository and produce a reviewed implementation handoff document you can then bring to your coding environment").

KB Sandbox supports these engineering/knowledge/evaluation activities as named "Workbench methods" -- documented in the platform_handbook Wiki category, not hard-coded here. search_wiki returns each matched article's full content, not just a title -- one call is normally enough to both find the matching Workbench Handbook article and read its Goal/Requirements (Required / Recommended / Optional, plus a Git-required flag)/Deliverables/Boundary sections directly in the result. You are allowed at most 2 search_wiki calls per turn (enforced -- a 3rd call will be refused); a second call is only worth making if the user's reply raises a genuinely new question (e.g. naming a prerequisite method you haven't looked up yet), never to re-ask something you already searched. If a search doesn't surface a clearly matching method, say so and ask the user what they're trying to accomplish rather than searching again.

Reply directly, reasoning from what you found: name the method that fits, and note anything Required that seems to be missing and ask for it specifically. If the user then confirms a Required input is genuinely missing, look up which method produces that missing input (e.g. no OpenAPI spec before MCP Architecture -> search for OpenAPI Discovery) and name that prerequisite method explicitly, rather than offering to generate the missing input yourself. Keep replies conversational, not an exhaustive checklist.

KB Sandbox works in one of three ways depending on the task: it can do some things itself (Native Workbench, e.g. Wiki synthesis, RAG evaluation), it can define and govern work a practitioner runs in an external tool like Claude Code or ChatGPT and returns artifacts from (External Workstream), or it can investigate and produce an evidence-backed specification/Implementation Handoff for someone else to implement (Document-First Engineering -- the default for refactoring and feature work). Mention whichever applies once you know enough to say.

Always call present_assistant_response exactly once as your last action, after any evidence-gathering, instead of replying with plain text. Put your normal conversational reply in its "message" field. Use the optional fields only when they're genuinely earned:

- links: to point at a real KB Sandbox page, add a links entry with a target {kind, id} -- kind is one of wiki_article/project/workstream/assessment/knowledge_source, and id is the article's slug (for wiki_article), the source's id (for knowledge_source), or the record's id (for the others). Never write a URL or hostname directly in your message text -- it will not become a working link, and the chat interface cannot turn model-written links into navigation. If you don't know a real id, don't invent one -- just name the destination in plain text instead.
- citations: only for something you actually retrieved this turn -- a wiki_article via search_wiki/search_project_knowledge (sourceId is that article's slug), or a knowledge_source via search_project_knowledge (sourceId is that result's sourceId). A citation for anything you didn't just retrieve will be silently dropped, so don't bother inventing one.
- documents: only when you actually called attach_workstream_artifact and it succeeded this turn -- artifactId is the real id it returned. Never invent an artifactId or claim something was attached/saved when you haven't just created it with a tool call this turn.
- quickSummary/requirements/nextSteps/suggestedPrompts: use when they add real value; omit them for a simple reply.

Be concise. When you use a tool, briefly say what you did in your final message.`

// Exposes the live system prompt for display (e.g. the Agent Flow page's
// curator/admin-only disclosure) without letting SYSTEM_PROMPT itself be
// imported and role-gating decided elsewhere -- callers just get the text.
export function getSystemPromptText(): string {
  return SYSTEM_PROMPT
}

// Project-Aware Knowledge and Assistant Context, Stage 2. Appended, not
// substituted, so every base instruction (tool-call discipline, citation
// rules, the KB Sandbox capability boundaries) still applies unchanged.
// Encodes the retrieval-precedence requirement directly in the prompt
// (search_project_knowledge's own code-enforced project-first ordering is
// the real guarantee; this just tells the model to actually call it) and
// the "don't silently merge conflicting evidence" requirement.
function buildProjectPromptAddendum(context: { name: string; goal: string | null }, knowledgeScope: string): string {
  return `\n\nThis conversation is bound to the KB Sandbox project "${context.name}"${context.goal ? ` (goal: ${context.goal})` : ''}. Its own knowledge scope: ${knowledgeScope}.

You have an additional tool, search_project_knowledge, that searches this project's own attached knowledge first. Call it before search_wiki when you need evidence -- its results are tagged layer:'project' (this project's own approved evidence -- prefer this, it wins over general platform guidance when the two conflict) or layer:'platform' (general shared knowledge, used only to fill a genuine gap). If project evidence and platform guidance materially conflict, say so explicitly rather than silently merging them. If the project has no relevant attached knowledge for this question, say that plainly instead of presenting platform guidance as if it were project-specific evidence.

Some evidence in this project may be access-restricted to specific people (e.g. customer pricing visible only to Sales/Finance) -- your tools only ever return what you're personally authorized to see, the same as any other user. If the user seems to expect something you can't retrieve, don't guess why or speculate about what might exist. Say plainly that the information isn't available in your current project access scope and suggest they ask the project owner or access steward to review their access -- never name or describe a restricted resource you can't actually see.`
}

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
export const MAX_TOOL_ITERATIONS = 8

// Backstop for the prompt's own "search no more than twice" instruction --
// hoisted to module scope (not just local to runAssistantTurn) so it can be
// exported and displayed as a real guardrail value on the Agent Flow page,
// instead of being restated there as a second hard-coded literal.
export const SEARCH_WIKI_LIMIT = 2

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
  structured: VerifiedAssistantEnvelope | null
  createdRecords: ResolvedCreatedRecord[]
}

// projectId is only consulted when starting a brand-new conversation
// (conversationId null) -- once a conversation exists, its own row's
// project_id is what's used, never re-trusted from the caller, matching the
// "never trust a model-supplied project_id" principle extended to the HTTP
// boundary too. A conversation is either general forever or bound to one
// project forever (see the immutability trigger in
// 20260824190001_conversations_project_binding.sql) -- "switching projects"
// means starting a new conversation, not passing a different projectId here
// for an existing one.
export async function runAssistantTurn(
  ctx: WorkbenchCallerContext,
  conversationId: string | null,
  userMessage: string,
  modelSelection?: ModelSelection,
  projectId?: string | null
): Promise<AssistantTurnResult> {
  let conversation: Conversation
  if (conversationId) {
    const { data, error } = await ctx.supabase.from('conversations').select('*').eq('id', conversationId).single()
    if (error || !data) throw error ?? new Error('Conversation not found')
    conversation = data
  } else {
    conversation = await createConversation(ctx.supabase, ctx.user.id, userMessage.slice(0, 80), projectId ?? null)
  }
  const resolvedProjectId = conversation.project_id

  // Durable "turn in progress" marker so a page refresh mid-turn doesn't
  // strand the client with no way to discover a pending/completed reply --
  // cleared in the finally below regardless of how the turn ends.
  await ctx.supabase.from('conversations').update({ pending_turn_started_at: new Date().toISOString() }).eq('id', conversation.id)

  const priorRows = conversationId ? await listMessages(ctx.supabase, conversationId) : []
  const history: ChatMessage[] = priorRows.map((r) => ({
    role: r.role,
    content: r.content ?? '',
    toolCalls: r.tool_calls ?? undefined,
    toolCallId: r.tool_call_id ?? undefined,
    toolName: r.tool_name ?? undefined,
  }))
  // A brand-new conversation can't have a summary yet -- only fetched when
  // continuing an existing one, same conditioning as priorRows above.
  const existingSummary = conversationId ? await getConversationSummary(ctx.supabase, conversationId) : null

  history.push({ role: 'user', content: userMessage })
  await appendMessage(ctx.supabase, { conversationId: conversation.id, userId: ctx.user.id, role: 'user', content: userMessage })

  const chatProvider = await resolveChatProvider(ctx.supabase, modelSelection, { requestedBy: ctx.user.id })

  const projectContext = resolvedProjectId ? await getProjectContext(ctx, resolvedProjectId) : null
  const systemPrompt = projectContext
    ? SYSTEM_PROMPT + buildProjectPromptAddendum(projectContext, describeProjectKnowledgeScope(projectContext))
    : SYSTEM_PROMPT
  const tools = projectContext
    ? [...getToolSpecs(), SEARCH_PROJECT_KNOWLEDGE_TOOL, PRESENT_RESPONSE_TOOL]
    : [...getToolSpecs(), PRESENT_RESPONSE_TOOL]
  const toolsUsed = new Set<string>()
  try {
  // A model that ignores the prompt's "search no more than twice" instruction
  // (observed live: GPT-OSS 120B repeatedly re-searching when search_wiki
  // wasn't returning content) would otherwise just keep searching until
  // MAX_TOOL_ITERATIONS kills the whole turn. Once SEARCH_WIKI_LIMIT is hit,
  // the tool call is refused with an explanatory result instead of actually
  // running -- the model gets a clear signal to stop searching and answer,
  // rather than a silent no-op.
  let searchWikiCalls = 0
  // Recomputed each iteration -- cheap (pure, in-memory) and the current
  // turn keeps growing as tool round-trips are appended to `history`.
  // Sticky across iterations: once truncation has happened once this turn,
  // treat the turn as truncated for the summary-refresh decision below even
  // if a later iteration's smaller working set wouldn't trip it again.
  let contextWasTruncated = false
  // This turn's real retrieval/creation provenance, accumulated across
  // iterations -- citations are checked against these (never against what
  // the model merely asserts), and createdRecordRefs feeds the Artifacts
  // panel's "Created records" group. Stage 3: keyed maps, not bare sets, so
  // a verified citation can also carry which knowledge layer it came from
  // and (for a knowledge_source) which specific document version was
  // actually retrieved -- search_wiki hits are always layer:'platform'
  // (it's the general tool, never project-tagged) with no version concept.
  const retrievedWikiArticleSlugs = new Map<string, RetrievedHitInfo>()
  const retrievedKnowledgeSourceIds = new Map<string, RetrievedHitInfo>()
  const createdRecordRefs: CreatedRecordRef[] = []

  // Shared tail for every terminal path below: resolves the embedding model
  // display name, refreshes the conversation summary, and shapes the
  // return value. Never persists anything itself -- each caller appends its
  // own row first, since the content/response_payload differ per path.
  async function finishTurn(reply: string, structured: VerifiedAssistantEnvelope | null): Promise<AssistantTurnResult> {
    const usedEmbeddingRetrieval = toolsUsed.has('search_wiki') || toolsUsed.has(SEARCH_PROJECT_KNOWLEDGE_TOOL_NAME)
    const embeddingModelDisplayName = usedEmbeddingRetrieval ? (await getDefaultModel(ctx.supabase, 'embedding')).model.display_name : undefined
    await maybeRefreshSummary(ctx, conversation.id, contextWasTruncated)
    const resolvedCreatedRecords = (await Promise.all(createdRecordRefs.map((ref) => resolveCreatedRecord(ctx, ref)))).filter(
      (r): r is ResolvedCreatedRecord => r !== null
    )
    return {
      conversationId: conversation.id,
      reply,
      providerName: chatProvider.providerName,
      providerDisplayName: chatProvider.providerDisplayName,
      modelId: chatProvider.modelId,
      modelDisplayName: chatProvider.modelDisplayName,
      toolsUsed: [...toolsUsed],
      embeddingModelDisplayName,
      structured,
      createdRecords: resolvedCreatedRecords,
    }
  }

  // The model's one required terminal action. A malformed/missing envelope
  // must never fail the turn -- fall back to whatever plain text is
  // recoverable and persist no structured payload at all.
  async function finalizeStructuredTurn(presentCall: { arguments: Record<string, unknown> }, rawContent: string): Promise<AssistantTurnResult> {
    const parsed = AssistantResponseEnvelopeSchema.safeParse(presentCall.arguments)

    if (!parsed.success) {
      const recoveredMessage = typeof presentCall.arguments?.message === 'string' ? presentCall.arguments.message.trim() : ''
      const content =
        rawContent.trim() ||
        recoveredMessage ||
        "I put together a response but it didn't come through correctly -- could you ask again?"
      await appendMessage(ctx.supabase, {
        conversationId: conversation.id,
        userId: ctx.user.id,
        role: 'assistant',
        content,
        provider: chatProvider.providerName,
        model: chatProvider.modelId,
        responsePayload: null,
      })
      return finishTurn(content, null)
    }

    const retrieved: RetrievedProvenance = { wikiArticleSlugs: retrievedWikiArticleSlugs, knowledgeSourceIds: retrievedKnowledgeSourceIds }
    const persisted = await buildPersistedEnvelope(ctx, parsed.data, retrieved)
    await appendMessage(ctx.supabase, {
      conversationId: conversation.id,
      userId: ctx.user.id,
      role: 'assistant',
      content: persisted.message,
      provider: chatProvider.providerName,
      model: chatProvider.modelId,
      responsePayload: persisted,
    })
    const structured = await resolveEnvelopeForDisplay(ctx, persisted)
    return finishTurn(persisted.message, structured)
  }

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const working = composeWorkingContext({
      history,
      summary: existingSummary,
      contextWindow: chatProvider.contextWindow,
      maxOutputTokens: chatProvider.maxOutputTokens,
    })
    contextWasTruncated = contextWasTruncated || working.wasTruncated
    const result = await chatProvider.provider.generateChat({
      messages: working.messages,
      system: systemPrompt,
      tools,
      maxOutputTokens: chatProvider.maxOutputTokens ?? undefined,
    })
    history.push(result.message)

    // Submitting the final structured response is always terminal. If the
    // model also requested other tools in the same batch -- it shouldn't,
    // per the prompt, but providers occasionally do this -- those other
    // calls are dropped, not executed: a model submitting a final answer
    // hasn't asked to keep gathering evidence, and executing them would
    // leave tool-result messages with nothing to respond to.
    const presentCall = result.message.toolCalls?.find((tc) => tc.name === PRESENT_RESPONSE_TOOL_NAME)
    if (presentCall) {
      return await finalizeStructuredTurn(presentCall, result.message.content)
    }

    const hasToolCalls = Boolean(result.message.toolCalls && result.message.toolCalls.length > 0)
    // A row with tool calls but no content is a normal intermediate step
    // (the model is about to see tool results, not replying yet) -- but a
    // *terminal* row (no tool calls) with empty/null content is a real
    // provider failure mode (observed live: search_project_knowledge's
    // large tool-result payload occasionally produced a genuinely empty
    // completion), and previously flowed all the way to the client as a
    // literal `content: null` message, crashing the renderer instead of
    // showing a recoverable error. Coerced here, once, so both the
    // persisted row and the returned reply agree.
    const messageContent = hasToolCalls
      ? result.message.content || null
      : result.message.content?.trim() || "I wasn't able to generate a reply to that -- could you try rephrasing, or asking again?"

    await appendMessage(ctx.supabase, {
      conversationId: conversation.id,
      userId: ctx.user.id,
      role: 'assistant',
      content: messageContent,
      toolCalls: result.message.toolCalls ?? null,
      provider: chatProvider.providerName,
      model: chatProvider.modelId,
    })

    if (!hasToolCalls) {
      // A provider that never calls present_assistant_response (weak
      // tool-calling support, or it judged no tool needed and replied
      // directly) still gets a normal, working reply -- just without a
      // structured payload.
      return await finishTurn(messageContent as string, null)
    }

    for (const toolCall of result.message.toolCalls ?? []) {
      toolsUsed.add(toolCall.name)
      let toolResultText: string
      if (toolCall.name === 'search_wiki' && ++searchWikiCalls > SEARCH_WIKI_LIMIT) {
        toolResultText = JSON.stringify({
          error: `search_wiki has already been called ${SEARCH_WIKI_LIMIT} times this turn. Do not search again -- answer using what you already found, or ask the user a clarifying question instead.`,
        })
      } else if (toolCall.name === SEARCH_PROJECT_KNOWLEDGE_TOOL_NAME) {
        // Not in src/lib/mcp/tools.ts's general registry -- intercepted here
        // before reaching callTool, same as PRESENT_RESPONSE_TOOL, because
        // its behavior depends on resolvedProjectId, which callTool's
        // generic (ctx, name, input) dispatch has no way to carry.
        if (!resolvedProjectId) {
          toolResultText = JSON.stringify({ error: 'search_project_knowledge is only available in a project-bound conversation.' })
        } else {
          try {
            const output = await runSearchProjectKnowledge(ctx, resolvedProjectId, toolCall.arguments)
            toolResultText = JSON.stringify(output)
            for (const hit of output.results as ProjectKnowledgeHit[]) {
              const info: RetrievedHitInfo = { layer: hit.layer, documentVersionId: hit.documentVersionId }
              if (hit.sourceType === 'wiki_article') retrievedWikiArticleSlugs.set(hit.sourceId, info)
              else retrievedKnowledgeSourceIds.set(hit.sourceId, info)
            }
          } catch (err) {
            toolResultText = JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
          }
        }
      } else {
        try {
          const output = await callTool(ctx, toolCall.name, toolCall.arguments)
          await stampProvenance(ctx, toolCall.name, output, conversation.id)
          toolResultText = JSON.stringify(output)

          if (toolCall.name === 'search_wiki' && output && typeof output === 'object' && 'articles' in output) {
            for (const article of (output as { articles: { slug: string }[] }).articles) {
              retrievedWikiArticleSlugs.set(article.slug, { layer: 'platform', documentVersionId: null })
            }
          } else if (toolCall.name === 'create_project' && output && typeof output === 'object' && 'projectId' in output) {
            createdRecordRefs.push({ kind: 'project', id: (output as { projectId: string }).projectId })
          } else if (toolCall.name === 'create_workstream' && output && typeof output === 'object' && 'workstreamId' in output) {
            createdRecordRefs.push({ kind: 'workstream', id: (output as { workstreamId: string }).workstreamId })
          } else if (toolCall.name === 'attach_workstream_artifact' && output && typeof output === 'object' && 'artifactId' in output) {
            createdRecordRefs.push({ kind: 'workstream_artifact', id: (output as { artifactId: string }).artifactId })
          }
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
    structured: null,
    createdRecords: [],
  }
  } finally {
    await ctx.supabase.from('conversations').update({ pending_turn_started_at: null }).eq('id', conversation.id)
  }
}
