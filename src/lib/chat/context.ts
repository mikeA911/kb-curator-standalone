import 'server-only'
import type { ChatMessage } from '@/lib/ai'
import type { ConversationSummary } from '@/types/database'

// Exact tokenization is provider-specific; this is a documented, conservative,
// provider-agnostic approximation (the onboarding/history doc explicitly
// allows "computed or conservatively estimated" counts).
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function estimateMessageTokens(msg: ChatMessage): number {
  let tokens = estimateTokens(msg.content ?? '')
  if (msg.toolCalls) {
    for (const call of msg.toolCalls) tokens += estimateTokens(call.name) + estimateTokens(JSON.stringify(call.arguments))
  }
  return tokens
}

// Groups history into turns: one user message through the next user message,
// inclusive of every assistant/tool round-trip in between. Windowing at turn
// granularity (not per-message) is what guarantees a tool-call/tool-result
// pair is never split without extra bookkeeping -- they always land in the
// same turn as the user message that triggered them.
function groupIntoTurns(history: ChatMessage[]): ChatMessage[][] {
  const turns: ChatMessage[][] = []
  for (const msg of history) {
    if (msg.role === 'user' || turns.length === 0) {
      turns.push([msg])
    } else {
      turns[turns.length - 1].push(msg)
    }
  }
  return turns
}

// The middle of the doc's suggested 12k-24k budget range, used whenever the
// model's own context_window isn't known. TOOL_SCHEMA_OVERHEAD is a rough
// reservation for the tool specs sent alongside messages on every call.
const DEFAULT_BUDGET = 18000
const TOOL_SCHEMA_OVERHEAD = 1500
const MIN_BUDGET = 2000

function computeBudget(contextWindow: number | null | undefined, maxOutputTokens: number | null | undefined): number {
  if (!contextWindow) return DEFAULT_BUDGET
  const reserved = (maxOutputTokens ?? 2048) + TOOL_SCHEMA_OVERHEAD
  return Math.min(DEFAULT_BUDGET, Math.max(MIN_BUDGET, contextWindow - reserved))
}

function formatSummary(summary: ConversationSummary): string {
  const lines = [`Objective: ${summary.objective}`]
  if (summary.confirmedRequirements.length) lines.push(`Confirmed requirements: ${summary.confirmedRequirements.join('; ')}`)
  if (summary.decisions.length) lines.push(`Decisions: ${summary.decisions.join('; ')}`)
  if (summary.openQuestions.length) lines.push(`Open questions: ${summary.openQuestions.join('; ')}`)
  if (summary.createdRecords.length) lines.push(`Created records: ${summary.createdRecords.join('; ')}`)
  if (summary.referencedEvidence.length) lines.push(`Referenced evidence: ${summary.referencedEvidence.join('; ')}`)
  lines.push(`Next action: ${summary.nextAction}`)
  return lines.join('\n')
}

export interface WorkingContextInput {
  history: ChatMessage[]
  summary: ConversationSummary | null
  contextWindow?: number | null
  maxOutputTokens?: number | null
}

export interface WorkingContextResult {
  messages: ChatMessage[]
  wasTruncated: boolean
  summaryIncluded: boolean
}

// Bounds what actually gets sent to the provider on a turn -- the caller's
// own persisted `history` array is untouched; this only shapes the payload.
// Always keeps the newest turn regardless of budget (a turn in progress must
// never be cut mid-tool-call), then walks older turns backwards while they
// still fit. Turns that don't fit are replaced by the rolling summary (if
// one exists) rather than silently vanishing.
export function composeWorkingContext({ history, summary, contextWindow, maxOutputTokens }: WorkingContextInput): WorkingContextResult {
  const turns = groupIntoTurns(history)
  if (turns.length === 0) return { messages: [], wasTruncated: false, summaryIncluded: false }

  const budget = computeBudget(contextWindow, maxOutputTokens)
  const kept: ChatMessage[][] = []
  let used = 0
  let wasTruncated = false

  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i]
    const turnTokens = turn.reduce((sum, m) => sum + estimateMessageTokens(m), 0)
    if (kept.length === 0) {
      kept.unshift(turn)
      used += turnTokens
      continue
    }
    if (used + turnTokens <= budget) {
      kept.unshift(turn)
      used += turnTokens
    } else {
      wasTruncated = true
      break
    }
  }

  const messages = kept.flat()
  if (wasTruncated && summary) {
    const summaryMessage: ChatMessage = {
      role: 'user',
      content: `[Context note -- earlier turns omitted for length. Conversation summary so far:]\n${formatSummary(summary)}`,
    }
    return { messages: [summaryMessage, ...messages], wasTruncated, summaryIncluded: true }
  }

  return { messages, wasTruncated, summaryIncluded: false }
}
