import type { RetrievedEvidenceItem } from '@/types/database'

export interface RetrievalMetrics {
  hit: boolean | null
  recall: number | null
  mrr: number | null
}

// Deterministic retrieval scoring -- preferred over LLM judgment wherever an
// objective answer exists (see the brief's "deterministic evaluation
// first"). A chunk's retrieved id is only ever compared against
// expectedChunkIds, a wiki article's against expectedArticleIds -- evidence
// type is never blurred, even at scoring time.
export function computeRetrievalMetrics(
  evidence: RetrievedEvidenceItem[],
  expectedArticleIds: string[],
  expectedChunkIds: string[]
): RetrievalMetrics {
  const expectedArticles = new Set(expectedArticleIds)
  const expectedChunks = new Set(expectedChunkIds)
  const totalExpected = expectedArticles.size + expectedChunks.size

  if (totalExpected === 0) {
    return { hit: null, recall: null, mrr: null }
  }

  const isExpected = (item: RetrievedEvidenceItem) =>
    item.type === 'wiki' ? expectedArticles.has(item.id) : expectedChunks.has(item.id)

  const sorted = [...evidence].sort((a, b) => a.rank - b.rank)
  const matchedIds = new Set(sorted.filter(isExpected).map((item) => item.id))

  const hit = matchedIds.size > 0
  const recall = matchedIds.size / totalExpected

  const firstHitIndex = sorted.findIndex(isExpected)
  const mrr = firstHitIndex === -1 ? 0 : 1 / (firstHitIndex + 1)

  return { hit, recall, mrr }
}

// Aggregate metrics across a completed run's results -- powers the summary
// view (Hit@K / Recall@K / average MRR / average latency etc.).
export interface RunSummary {
  caseCount: number
  completedCount: number
  failedCount: number
  hitAtK: number | null
  recallAtK: number | null
  meanReciprocalRank: number | null
  avgGenerationScore: number | null
  avgGroundingScore: number | null
  avgOutcomeScore: number | null
  avgLatencyMs: number | null
  totalInputTokens: number
  totalOutputTokens: number
  totalEstimatedCost: number | null
  // null when every result in the run is single-pass (iteration_count is
  // only ever set on a graph-mode eval_results row) -- distinguishing "no
  // iterations happened" from "this run didn't use the graph at all".
  avgIterations: number | null
}

function average(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => v !== null && v !== undefined)
  if (present.length === 0) return null
  return present.reduce((sum, v) => sum + v, 0) / present.length
}

export function summarizeResults(
  results: {
    status: string
    retrieval_hit: boolean | null
    retrieval_recall: number | null
    retrieval_mrr: number | null
    generation_score: number | null
    grounding_score: number | null
    outcome_score: number | null
    latency_ms: number | null
    input_tokens: number | null
    output_tokens: number | null
    estimated_cost: number | null
    iteration_count?: number | null
  }[]
): RunSummary {
  const completed = results.filter((r) => r.status === 'completed')
  const hits = completed.map((r) => r.retrieval_hit).filter((h): h is boolean => h !== null)

  return {
    caseCount: results.length,
    completedCount: completed.length,
    failedCount: results.length - completed.length,
    hitAtK: hits.length > 0 ? hits.filter(Boolean).length / hits.length : null,
    recallAtK: average(completed.map((r) => r.retrieval_recall)),
    meanReciprocalRank: average(completed.map((r) => r.retrieval_mrr)),
    avgGenerationScore: average(completed.map((r) => r.generation_score)),
    avgGroundingScore: average(completed.map((r) => r.grounding_score)),
    avgOutcomeScore: average(completed.map((r) => r.outcome_score)),
    avgLatencyMs: average(completed.map((r) => r.latency_ms)),
    totalInputTokens: completed.reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
    totalOutputTokens: completed.reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
    totalEstimatedCost:
      completed.some((r) => r.estimated_cost !== null) ? completed.reduce((sum, r) => sum + (r.estimated_cost ?? 0), 0) : null,
    avgIterations: average(completed.map((r) => r.iteration_count)),
  }
}
