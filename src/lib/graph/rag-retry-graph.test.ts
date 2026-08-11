import { describe, it, expect, vi } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { AIProviderError } from '@/lib/ai/provider'
import type { AIProvider } from '@/lib/ai/provider'
import { buildRagRetryGraph } from './rag-retry-graph'
import type { RagGraphState } from './state'

function initialState(overrides: Partial<RagGraphState> = {}): RagGraphState {
  return {
    originalQuery: 'What is RAG?',
    currentQuery: 'What is RAG?',
    retrievedEvidence: [],
    generatedAnswer: null,
    evaluation: null,
    failureType: null,
    iteration: 0,
    maxIterations: 2,
    terminationReason: null,
    traceContext: { graphRunId: 'graph-run-1' },
    ...overrides,
  }
}

function fakeGenerationProvider(): AIProvider {
  return {
    name: 'test-generation',
    generateText: vi.fn().mockResolvedValue({ text: 'a grounded answer', model: 'gen-model', usage: { inputTokens: 5, outputTokens: 5 } }),
    generateStructured: vi.fn().mockResolvedValue({ data: { revised_query: 'a better query' }, model: 'gen-model', usage: { inputTokens: 2, outputTokens: 2 } }),
    embed: vi.fn().mockResolvedValue({ embedding: [0], model: 'embed-model', dimensions: 1, usage: { inputTokens: 1, outputTokens: 0 } }),
  }
}

function fakeJudgeProvider(scoreSequence: number[]): AIProvider {
  let call = 0
  return {
    name: 'test-judge',
    generateText: vi.fn(),
    generateStructured: vi.fn().mockImplementation(async () => {
      const score = scoreSequence[Math.min(call, scoreSequence.length - 1)]
      call += 1
      return {
        data: {
          generation_score: score,
          grounding_score: score,
          outcome_score: score,
          reasoning: 'test',
          missing_concepts: [],
          unsupported_claims: [],
        },
        model: 'judge-model',
        usage: { inputTokens: 3, outputTokens: 3 },
      }
    }),
    embed: vi.fn(),
  }
}

function buildDeps(judgeScores: number[]) {
  const fakeSupabase = createFakeSupabase({})
  const generationProvider = fakeGenerationProvider()
  const judgeProvider = fakeJudgeProvider(judgeScores)
  const deps = {
    supabase: fakeSupabase as never,
    graphRunId: 'graph-run-1',
    embeddingProvider: generationProvider,
    embeddingModel: 'embed-model',
    retrievalConfig: { evidenceSource: 'chunks' as const, topK: 3 },
    generationProvider,
    generationModel: 'gen-model',
    judge: { provider: judgeProvider, model: 'judge-model', evalCase: { question: 'What is RAG?', expected_answer: null, expected_concepts: null, scoring_criteria: null } },
    expectedArticleIds: [] as string[],
    expectedChunkIds: [] as string[],
    acceptanceThresholds: { requiredOutcomeScore: 0.7, requiredGroundingScore: 0.7 },
  }
  return { deps, fakeSupabase, generationProvider }
}

function graphSteps(fakeSupabase: ReturnType<typeof createFakeSupabase>) {
  return fakeSupabase._calls.filter((c) => c.table === 'graph_steps')
}

describe('buildRagRetryGraph', () => {
  it('accepts on the first attempt when the judge score already clears the threshold', async () => {
    const { deps, fakeSupabase } = buildDeps([0.9])
    const graph = buildRagRetryGraph(deps)

    const finalState = (await graph.invoke(initialState())) as RagGraphState

    expect(finalState.terminationReason).toBe('success')
    expect(finalState.iteration).toBe(0)

    const stepNodeNames = graphSteps(fakeSupabase).map((c) => (c.args as { node_name: string }).node_name)
    expect(stepNodeNames).toEqual(['retrieve', 'generate', 'evaluate'])
  })

  it('retries once (diagnose -> rewrite_query -> retrieve -> generate -> evaluate) then accepts', async () => {
    const { deps, fakeSupabase, generationProvider } = buildDeps([0.2, 0.9])
    const graph = buildRagRetryGraph(deps)

    const finalState = (await graph.invoke(initialState())) as RagGraphState

    expect(finalState.terminationReason).toBe('success')
    expect(finalState.iteration).toBe(1)
    expect(generationProvider.generateStructured).toHaveBeenCalledTimes(1) // rewrite_query, once

    const stepNodeNames = graphSteps(fakeSupabase).map((c) => (c.args as { node_name: string }).node_name)
    expect(stepNodeNames).toEqual(['retrieve', 'generate', 'evaluate', 'diagnose', 'rewrite_query', 'retrieve', 'generate', 'evaluate'])
  })

  it('stops at max_iterations when the judge never clears the threshold', async () => {
    const { deps } = buildDeps([0.1, 0.1, 0.1])
    const graph = buildRagRetryGraph(deps)

    const finalState = (await graph.invoke(initialState({ maxIterations: 2 }))) as RagGraphState

    expect(finalState.terminationReason).toBe('max_iterations')
    expect(finalState.iteration).toBe(2)
  })

  it('a thrown AIProviderError from generate terminates the run immediately, never reaching diagnose', async () => {
    const { deps, fakeSupabase, generationProvider } = buildDeps([0.9])
    ;(generationProvider.generateText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new AIProviderError('test-generation', 'generate_text', 'rate limited', undefined, 'rate_limit')
    )
    const graph = buildRagRetryGraph(deps)

    await expect(graph.invoke(initialState())).rejects.toThrow('rate limited')

    const steps = graphSteps(fakeSupabase)
    const stepNodeNames = steps.map((c) => (c.args as { node_name: string }).node_name)
    expect(stepNodeNames).toEqual(['retrieve', 'generate'])
    const generateStep = steps[1].args as { status: string; error_code: string }
    expect(generateStep.status).toBe('failed')
    expect(generateStep.error_code).toBe('rate_limit')
  })

  it('stops after one pass with terminationReason "unscored" when there is no judge and no golden evidence', async () => {
    const fakeSupabase = createFakeSupabase({})
    const generationProvider = fakeGenerationProvider()
    const deps = {
      supabase: fakeSupabase as never,
      graphRunId: 'graph-run-1',
      embeddingProvider: generationProvider,
      embeddingModel: 'embed-model',
      retrievalConfig: { evidenceSource: 'chunks' as const, topK: 3 },
      generationProvider,
      generationModel: 'gen-model',
      judge: undefined,
      expectedArticleIds: [] as string[],
      expectedChunkIds: [] as string[],
      acceptanceThresholds: {},
    }
    const graph = buildRagRetryGraph(deps)

    const finalState = (await graph.invoke(initialState())) as RagGraphState

    expect(finalState.terminationReason).toBe('unscored')
    expect(finalState.iteration).toBe(0)
  })
})
