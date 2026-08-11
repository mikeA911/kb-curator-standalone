import 'server-only'
import { StateGraph, END } from '@langchain/langgraph'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EvalCase, GraphNodeName } from '@/types/database'
import type { AIProvider } from '@/lib/ai/provider'
import { AIProviderError } from '@/lib/ai/provider'
import type { RetrievalConfig } from '@/lib/eval/retrieval'
import { RagGraphAnnotation, type RagGraphState } from './state'
import { retrieveNode, generateNode, evaluateNode, diagnoseNode, rewriteQueryNode } from './nodes'
import { shouldContinue, type AcceptanceThresholds } from './transitions'
import { recordGraphStep } from './persistence'

export interface RagRetryGraphDeps {
  supabase: SupabaseClient<Database>
  graphRunId: string
  embeddingProvider: AIProvider
  embeddingModel: string
  retrievalConfig: RetrievalConfig
  generationProvider: AIProvider
  generationModel: string
  // Absent when evaluator.type==='none'. Query rewriting reuses the
  // generation provider/model -- the design brief's own example config
  // does the same, and keeping M4's configuration to generation/embedding/
  // evaluation (its explicit "at minimum" list) avoids a fourth model slot
  // nothing asked for.
  judge?: {
    provider: AIProvider
    model: string
    evalCase: Pick<EvalCase, 'question' | 'expected_answer' | 'expected_concepts' | 'scoring_criteria'>
  }
  expectedArticleIds: string[]
  expectedChunkIds: string[]
  acceptanceThresholds: AcceptanceThresholds
}

// Built fresh per run, not a module-scope singleton -- deps (providers,
// models, thresholds) vary per eval run's configuration. The node closures
// below are thin adapters from the plain, independently-testable functions
// in nodes.ts to LangGraph's node-calling convention; graph-transition
// logic (shouldContinue) and persistence (recordGraphStep) are the only
// things this file adds on top of them.
export function buildRagRetryGraph(deps: RagRetryGraphDeps) {
  let sequenceNumber = 0
  const hasExpectedEvidence = deps.expectedArticleIds.length > 0 || deps.expectedChunkIds.length > 0
  const hasJudge = !!deps.judge

  async function step<T extends object>(nodeName: GraphNodeName, state: RagGraphState, fn: () => Promise<T>): Promise<T> {
    sequenceNumber += 1
    const seq = sequenceNumber
    const startedAt = Date.now()
    try {
      const output = await fn()
      await recordGraphStep(deps.supabase, {
        graphRunId: deps.graphRunId,
        sequenceNumber: seq,
        nodeName,
        iteration: state.iteration,
        inputSnapshot: state as unknown as Record<string, unknown>,
        outputSnapshot: output as unknown as Record<string, unknown>,
        transitionTo: null,
        status: 'completed',
        latencyMs: Date.now() - startedAt,
        aiOperationLogId: null,
        errorCode: null,
        errorMessage: null,
      })
      return output
    } catch (err) {
      // A thrown AIProviderError terminates the run immediately -- this
      // catch records the failed step for the trace, then rethrows so
      // LangGraph's own execution stops here. It never reaches diagnose/
      // rewrite_query: that's the reasoning-retry path (an evaluate ->
      // diagnose graph edge), structurally separate from this
      // infrastructure-failure path (a catch block that ends the run).
      await recordGraphStep(deps.supabase, {
        graphRunId: deps.graphRunId,
        sequenceNumber: seq,
        nodeName,
        iteration: state.iteration,
        inputSnapshot: state as unknown as Record<string, unknown>,
        outputSnapshot: null,
        transitionTo: null,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        aiOperationLogId: null,
        errorCode: err instanceof AIProviderError ? err.errorCode : 'unknown',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }

  return new StateGraph(RagGraphAnnotation)
    .addNode('retrieve', (state) =>
      step('retrieve', state, () =>
        retrieveNode(state, {
          supabase: deps.supabase,
          embeddingProvider: deps.embeddingProvider,
          embeddingModel: deps.embeddingModel,
          retrievalConfig: deps.retrievalConfig,
        })
      )
    )
    .addNode('generate', (state) =>
      step('generate', state, () =>
        generateNode(state, { generationProvider: deps.generationProvider, generationModel: deps.generationModel })
      )
    )
    .addNode('evaluate', (state) =>
      step('evaluate', state, async () => {
        const evalResult = await evaluateNode(state, {
          expectedArticleIds: deps.expectedArticleIds,
          expectedChunkIds: deps.expectedChunkIds,
          judge: deps.judge,
        })
        const { decision, terminationReason } = shouldContinue(
          { ...state, ...evalResult },
          deps.acceptanceThresholds,
          hasJudge,
          hasExpectedEvidence
        )
        // terminationReason only committed to state when the graph is
        // actually about to end -- a mid-run 'diagnose' hop leaves it null.
        return { ...evalResult, terminationReason: decision === 'end' ? terminationReason : null }
      })
    )
    .addNode('diagnose', (state) => step('diagnose', state, async () => diagnoseNode(state, { hasExpectedEvidence })))
    .addNode('rewrite_query', (state) =>
      step('rewrite_query', state, () => rewriteQueryNode(state, { provider: deps.generationProvider, model: deps.generationModel }))
    )
    .addNode('increment_iteration', (state) => ({ iteration: state.iteration + 1 }))
    .addEdge('__start__', 'retrieve')
    .addEdge('retrieve', 'generate')
    .addEdge('generate', 'evaluate')
    .addConditionalEdges(
      'evaluate',
      (state) => shouldContinue(state, deps.acceptanceThresholds, hasJudge, hasExpectedEvidence).decision,
      { end: END, diagnose: 'diagnose' }
    )
    .addEdge('diagnose', 'rewrite_query')
    .addEdge('rewrite_query', 'increment_iteration')
    .addEdge('increment_iteration', 'retrieve')
    .compile()
}
