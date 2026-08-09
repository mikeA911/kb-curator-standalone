import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { EvalCase, EvalRun, EvalRunConfig } from '@/types/database'

const retrieveEvidenceMock = vi.fn()
const generateAnswerMock = vi.fn()
const judgeAnswerMock = vi.fn()
const getProviderByNameMock = vi.fn()
getProviderByNameMock.mockReturnValue({ name: 'fake-provider' })

vi.mock('./retrieval', () => ({ retrieveEvidence: (...args: unknown[]) => retrieveEvidenceMock(...args) }))
vi.mock('./generation', () => ({ generateAnswer: (...args: unknown[]) => generateAnswerMock(...args) }))
vi.mock('./judge', () => ({ judgeAnswer: (...args: unknown[]) => judgeAnswerMock(...args) }))
vi.mock('@/lib/ai', () => ({ getProviderByName: (...args: unknown[]) => getProviderByNameMock(...args) }))

const { executeEvalRun } = await import('./run')

function baseConfig(overrides: Partial<EvalRunConfig> = {}): EvalRunConfig {
  return {
    generation: { provider: 'gemini' },
    embedding: { provider: 'gemini' },
    retrieval: { evidence_source: 'wiki', top_k: 5 },
    evaluator: { type: 'none' },
    ...overrides,
  }
}

function evalCase(id: string): EvalCase {
  return {
    id,
    dataset_id: 'dataset-1',
    question: `Question ${id}`,
    expected_answer: null,
    expected_concepts: null,
    expected_article_ids: null,
    expected_chunk_ids: null,
    scoring_criteria: null,
    tags: null,
    difficulty: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function run(config: EvalRunConfig): EvalRun {
  return {
    id: 'run-1',
    dataset_id: 'dataset-1',
    dataset_version: 1,
    name: 'test run',
    status: 'pending',
    config,
    is_baseline: false,
    started_at: null,
    completed_at: null,
    error_message: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
  }
}

beforeEach(() => {
  retrieveEvidenceMock.mockReset()
  generateAnswerMock.mockReset()
  judgeAnswerMock.mockReset()
  getProviderByNameMock.mockClear()
})

describe('executeEvalRun', () => {
  it('stores the generated answer on a completed result', async () => {
    const config = baseConfig()
    retrieveEvidenceMock.mockResolvedValue({ evidence: [], queryEmbedding: [], embeddingModel: 'm' })
    generateAnswerMock.mockResolvedValue({ answer: 'the answer', model: 'm', inputTokens: 10, outputTokens: 20 })

    const supabase = createFakeSupabase({
      eval_runs: [{ data: run(config), error: null }, { data: null, error: null }, { data: null, error: null }],
      eval_cases: [{ data: [evalCase('case-1')], error: null }],
      eval_results: [{ data: null, error: null }],
    }) as never

    await executeEvalRun(supabase, 'run-1', 'user-1')

    const insert = (supabase as ReturnType<typeof createFakeSupabase>)._calls.find(
      (c) => c.table === 'eval_results' && c.method === 'insert'
    )
    expect(insert?.args).toMatchObject({ status: 'completed', generated_answer: 'the answer' })
  })

  it('stores the LLM judge structured result without ever using it as the sole evaluator', async () => {
    const config = baseConfig({ evaluator: { type: 'llm_judge', provider: 'openai' } })
    retrieveEvidenceMock.mockResolvedValue({ evidence: [], queryEmbedding: [], embeddingModel: 'm' })
    generateAnswerMock.mockResolvedValue({ answer: 'the answer', model: 'm', inputTokens: 10, outputTokens: 20 })
    judgeAnswerMock.mockResolvedValue({
      generationScore: 0.8,
      groundingScore: 0.7,
      outcomeScore: 0.9,
      details: { provider: 'openai', model: 'm', reasoning: 'looks right', missing_concepts: [], unsupported_claims: [] },
    })

    const supabase = createFakeSupabase({
      eval_runs: [{ data: run(config), error: null }, { data: null, error: null }, { data: null, error: null }],
      eval_cases: [{ data: [evalCase('case-1')], error: null }],
      eval_results: [{ data: null, error: null }],
    }) as never

    await executeEvalRun(supabase, 'run-1', 'user-1')

    const insert = (supabase as ReturnType<typeof createFakeSupabase>)._calls.find(
      (c) => c.table === 'eval_results' && c.method === 'insert'
    )
    expect(insert?.args).toMatchObject({
      generation_score: 0.8,
      grounding_score: 0.7,
      outcome_score: 0.9,
      evaluator_details: { reasoning: 'looks right' },
    })
    // Deterministic retrieval metrics are computed regardless of the judge --
    // the judge is additive, never the only evaluator.
    expect(insert?.args).toHaveProperty('retrieval_hit')
  })

  it('uses the provider frozen into the run config, not a fresh lookup -- historical runs stay interpretable after settings change', async () => {
    const config = baseConfig({ generation: { provider: 'gemini' } })
    retrieveEvidenceMock.mockResolvedValue({ evidence: [], queryEmbedding: [], embeddingModel: 'm' })
    generateAnswerMock.mockResolvedValue({ answer: 'ans', model: 'm', inputTokens: null, outputTokens: null })

    const supabase = createFakeSupabase({
      eval_runs: [{ data: run(config), error: null }, { data: null, error: null }, { data: null, error: null }],
      eval_cases: [{ data: [evalCase('case-1')], error: null }],
      eval_results: [{ data: null, error: null }],
    }) as never

    await executeEvalRun(supabase, 'run-1', 'user-1')

    expect(getProviderByNameMock).toHaveBeenCalledWith('gemini', expect.objectContaining({ evalRunId: 'run-1' }))
  })

  it('records a failed case as an explicit failed result instead of losing it, and still completes the run', async () => {
    const config = baseConfig()
    retrieveEvidenceMock
      .mockRejectedValueOnce(new Error('embedding provider outage'))
      .mockResolvedValueOnce({ evidence: [], queryEmbedding: [], embeddingModel: 'm' })
    generateAnswerMock.mockResolvedValue({ answer: 'ans', model: 'm', inputTokens: null, outputTokens: null })

    const supabase = createFakeSupabase({
      eval_runs: [{ data: run(config), error: null }, { data: null, error: null }, { data: null, error: null }],
      eval_cases: [{ data: [evalCase('case-1'), evalCase('case-2')], error: null }],
      eval_results: [{ data: null, error: null }, { data: null, error: null }],
    }) as never

    await executeEvalRun(supabase, 'run-1', 'user-1')

    const calls = (supabase as ReturnType<typeof createFakeSupabase>)._calls
    const inserts = calls.filter((c) => c.table === 'eval_results' && c.method === 'insert')
    expect(inserts).toHaveLength(2)
    expect(inserts[0].args).toMatchObject({ status: 'failed' })
    expect((inserts[0].args as { error: { message: string } }).error.message).toContain('embedding provider outage')
    expect(inserts[1].args).toMatchObject({ status: 'completed' })

    const runUpdates = calls.filter((c) => c.table === 'eval_runs' && c.method === 'update')
    expect(runUpdates[runUpdates.length - 1].args).toMatchObject({ status: 'completed' })
  })
})
