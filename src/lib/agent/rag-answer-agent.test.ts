import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const getProviderByNameMock = vi.fn()
const assertModelCapabilityMock = vi.fn()
const buildRagRetryGraphMock = vi.fn()

vi.mock('@/lib/ai', () => ({
  getProviderByName: (...args: unknown[]) => getProviderByNameMock(...args),
  assertModelCapability: (...args: unknown[]) => assertModelCapabilityMock(...args),
}))
vi.mock('@/lib/graph/rag-retry-graph', () => ({
  buildRagRetryGraph: (...args: unknown[]) => buildRagRetryGraphMock(...args),
}))

const { answerQuestion } = await import('./rag-answer-agent')

function agentVersionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'version-1',
    agent_id: 'agent-1',
    graph_version_id: 'graph-version-1',
    generation_provider_id: 'provider-groq',
    generation_model_id: 'model-gen',
    embedding_provider_id: 'provider-gemini',
    embedding_model_id: 'model-embed',
    evaluator_provider_id: null,
    evaluator_model_id: null,
    source_policy: { evidenceSource: 'both', topK: 5 },
    termination_policy: { maxIterations: 2 },
    ...overrides,
  }
}

function graphVersionRow() {
  return {
    id: 'graph-version-1',
    graph_id: 'graph-1',
    definition: { maxIterations: 2, acceptanceThresholds: { requiredOutcomeScore: 0.7, requiredGroundingScore: 0.7, requireExpectedEvidence: false } },
  }
}

function finalState(overrides: Record<string, unknown> = {}) {
  return {
    generatedAnswer: 'The answer.',
    retrievedEvidence: [{ type: 'chunk', id: 'c1', rank: 1, similarity: 0.9, title: 'Doc', content: 'text' }],
    evaluation: { retrieval: { hit: true, recall: 1, mrr: 1 }, generation: 0.9, grounding: 0.9, outcome: 0.9, details: null },
    iteration: 0,
    terminationReason: 'success',
    ...overrides,
  }
}

function buildFakeSupabase() {
  const fakeSupabase = createFakeSupabase({
    agent_versions: [{ data: agentVersionRow(), error: null }],
    graph_versions: [{ data: graphVersionRow(), error: null }],
    ai_models: [
      { data: { model_id: 'openai/gpt-oss-20b', model_type: 'generation', enabled: true, supports_structured_output: true }, error: null }, // generation
      { data: { model_id: 'gemini-embedding-001', model_type: 'embedding', enabled: true, supports_embeddings: true }, error: null }, // embedding
    ],
    ai_providers: [
      { data: { name: 'groq' }, error: null }, // generation
      { data: { name: 'gemini' }, error: null }, // embedding
    ],
    graph_runs: [{ data: { id: 'graph-run-1' }, error: null }, { data: { id: 'graph-run-1' }, error: null }],
  })
  return fakeSupabase
}

beforeEach(() => {
  getProviderByNameMock.mockReset()
  getProviderByNameMock.mockResolvedValue({ name: 'fake-provider' })
  assertModelCapabilityMock.mockReset()
  buildRagRetryGraphMock.mockReset()
  buildRagRetryGraphMock.mockReturnValue({ invoke: vi.fn().mockResolvedValue(finalState()) })
})

describe('answerQuestion', () => {
  it('creates a graph_runs row with agent_id/agent_version_id set and eval_run_id/eval_case_id null', async () => {
    const fakeSupabase = buildFakeSupabase()

    await answerQuestion(fakeSupabase as never, { agentVersionId: 'version-1', question: 'What is RAG?', requestedBy: 'user-1' })

    const insert = fakeSupabase._calls.find((c) => c.table === 'graph_runs' && c.method === 'insert')
    expect(insert?.args).toMatchObject({
      agent_id: 'agent-1',
      agent_version_id: 'version-1',
      eval_run_id: null,
      eval_case_id: null,
    })
  })

  it('never inserts an eval_results row -- a live question is not a graded benchmark case', async () => {
    const fakeSupabase = buildFakeSupabase()

    await answerQuestion(fakeSupabase as never, { agentVersionId: 'version-1', question: 'What is RAG?', requestedBy: 'user-1' })

    const evalResultsInsert = fakeSupabase._calls.find((c) => c.table === 'eval_results')
    expect(evalResultsInsert).toBeUndefined()
  })

  it('returns the final graph state mapped into AnswerQuestionResult', async () => {
    const fakeSupabase = buildFakeSupabase()

    const result = await answerQuestion(fakeSupabase as never, {
      agentVersionId: 'version-1',
      question: 'What is RAG?',
      requestedBy: 'user-1',
    })

    expect(result).toEqual({
      answer: 'The answer.',
      evidence: finalState().retrievedEvidence,
      evaluation: finalState().evaluation,
      graphRunId: 'graph-run-1',
      terminationReason: 'success',
    })
  })

  it('marks the graph_runs row completed on success', async () => {
    const fakeSupabase = buildFakeSupabase()

    await answerQuestion(fakeSupabase as never, { agentVersionId: 'version-1', question: 'What is RAG?', requestedBy: 'user-1' })

    const update = fakeSupabase._calls.find((c) => c.table === 'graph_runs' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'completed', termination_reason: 'success' })
  })

  it('marks the graph_runs row failed and rethrows when the graph invocation throws', async () => {
    buildRagRetryGraphMock.mockReturnValue({ invoke: vi.fn().mockRejectedValue(new Error('boom')) })
    const fakeSupabase = buildFakeSupabase()

    await expect(
      answerQuestion(fakeSupabase as never, { agentVersionId: 'version-1', question: 'What is RAG?', requestedBy: 'user-1' })
    ).rejects.toThrow('boom')

    const update = fakeSupabase._calls.find((c) => c.table === 'graph_runs' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'failed', termination_reason: 'provider_error' })
  })
})
