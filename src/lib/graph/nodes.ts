import 'server-only'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, RetrievedEvidenceItem, EvalCase } from '@/types/database'
import type { AIProvider } from '@/lib/ai/provider'
import { retrieveEvidence, type RetrievalConfig } from '@/lib/eval/retrieval'
import { generateAnswer } from '@/lib/eval/generation'
import { judgeAnswer } from '@/lib/eval/judge'
import { computeRetrievalMetrics } from '@/lib/eval/scoring'
import type { RagGraphState, RagGraphEvaluation, GraphFailureType } from './state'

// Five plain, independently-testable functions -- each reuses an existing
// Milestone 3 service unchanged (no second retrieval/generation/scoring
// implementation for the graph). Graph-orchestration concerns (LangGraph
// node registration, per-node tracing) live in rag-retry-graph.ts, not
// here -- these functions never touch LangGraph at all.

export interface RetrieveNodeDeps {
  supabase: SupabaseClient<Database>
  embeddingProvider: AIProvider
  embeddingModel: string
  retrievalConfig: RetrievalConfig
}

export async function retrieveNode(
  state: Pick<RagGraphState, 'currentQuery'>,
  deps: RetrieveNodeDeps
): Promise<{ retrievedEvidence: RetrievedEvidenceItem[] }> {
  const result = await retrieveEvidence(deps.supabase, deps.embeddingProvider, deps.embeddingModel, state.currentQuery, deps.retrievalConfig)
  return { retrievedEvidence: result.evidence }
}

export interface GenerateNodeDeps {
  generationProvider: AIProvider
  generationModel: string
}

export interface GenerateNodeResult {
  generatedAnswer: string
  inputTokens: number | null
  outputTokens: number | null
}

export async function generateNode(
  state: Pick<RagGraphState, 'currentQuery' | 'retrievedEvidence'>,
  deps: GenerateNodeDeps
): Promise<GenerateNodeResult> {
  const result = await generateAnswer(deps.generationProvider, deps.generationModel, state.currentQuery, state.retrievedEvidence)
  return { generatedAnswer: result.answer, inputTokens: result.inputTokens, outputTokens: result.outputTokens }
}

export interface EvaluateNodeDeps {
  expectedArticleIds: string[]
  expectedChunkIds: string[]
  // Absent when evaluator.type==='none' -- computeRetrievalMetrics always
  // runs regardless (deterministic evaluation first), the judge is additive.
  judge?: {
    provider: AIProvider
    model: string
    evalCase: Pick<EvalCase, 'question' | 'expected_answer' | 'expected_concepts' | 'scoring_criteria'>
  }
}

export async function evaluateNode(
  state: Pick<RagGraphState, 'currentQuery' | 'retrievedEvidence' | 'generatedAnswer'>,
  deps: EvaluateNodeDeps
): Promise<{ evaluation: RagGraphEvaluation }> {
  const retrieval = computeRetrievalMetrics(state.retrievedEvidence, deps.expectedArticleIds, deps.expectedChunkIds)

  let generation: number | null = null
  let grounding: number | null = null
  let outcome: number | null = null
  let details: RagGraphEvaluation['details'] = null

  if (deps.judge && state.generatedAnswer) {
    const judged = await judgeAnswer(deps.judge.provider, deps.judge.model, deps.judge.evalCase, state.retrievedEvidence, state.generatedAnswer)
    generation = judged.generationScore
    grounding = judged.groundingScore
    outcome = judged.outcomeScore
    details = judged.details
  }

  return { evaluation: { retrieval, generation, grounding, outcome, details } }
}

export interface DiagnoseNodeDeps {
  hasExpectedEvidence: boolean
}

// Deterministic rules first, per the design brief's section 8: missing
// expected evidence -> retrieval_failure; retrieval adequate but score low
// -> generation_failure. These two rules cover the graph's practical
// decision space for a single-node RAG pipeline -- an LLM fallback isn't
// implemented for this initial graph (the brief only requires one "when
// deterministic diagnosis is insufficient," and it isn't here).
export function diagnoseNode(state: Pick<RagGraphState, 'evaluation'>, deps: DiagnoseNodeDeps): { failureType: GraphFailureType } {
  const ev = state.evaluation
  if (deps.hasExpectedEvidence && ev?.retrieval?.hit === false) {
    return { failureType: 'retrieval_failure' }
  }
  if (ev && (ev.generation !== null || ev.grounding !== null || ev.outcome !== null)) {
    return { failureType: 'generation_failure' }
  }
  return { failureType: 'unknown' }
}

const RewriteQuerySchema = z.object({ revised_query: z.string() })

export interface RewriteQueryNodeDeps {
  provider: AIProvider
  model: string
}

// Produces ONLY a revised retrieval query -- never the final answer. The
// system prompt says so explicitly, and the schema has no room for one.
export async function rewriteQueryNode(
  state: Pick<RagGraphState, 'originalQuery' | 'currentQuery' | 'retrievedEvidence' | 'failureType'>,
  deps: RewriteQueryNodeDeps
): Promise<{ currentQuery: string }> {
  const { data } = await deps.provider.generateStructured({
    model: deps.model,
    system:
      'You improve retrieval queries for a RAG pipeline. You output only a revised search query -- never an answer to the underlying question.',
    prompt: [
      `Original question: ${state.originalQuery}`,
      `Previous retrieval query: ${state.currentQuery}`,
      `Evidence items retrieved last attempt: ${state.retrievedEvidence.length}`,
      state.failureType ? `Diagnosed failure: ${state.failureType}` : null,
      'Produce a revised retrieval query more likely to find the evidence needed to answer the original question. Do not answer the question.',
      'Return JSON with exactly one field: revised_query (string, the revised retrieval query).',
    ]
      .filter(Boolean)
      .join('\n'),
    schema: RewriteQuerySchema,
  })
  return { currentQuery: data.revised_query }
}
