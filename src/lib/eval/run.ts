import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EvalCase, EvalRunConfig, FailureClassification } from '@/types/database'
import { getProviderByName } from '@/lib/ai'
import { retrieveEvidence } from './retrieval'
import { computeRetrievalMetrics } from './scoring'
import { generateAnswer } from './generation'
import { judgeAnswer } from './judge'
import { buildEvalError } from './failures'

// retrieve() -> generate() -> score(), run synchronously per case inside the
// Server Action that launched it -- same pattern as chunk enrichment in
// Milestone 1. No agent, no graph, no retry; that's Milestone 4. A case that
// throws anywhere in its pipeline still gets an eval_results row
// (status='failed', structured error) rather than silently vanishing from
// the run -- see the brief's explicit test for this.
export async function executeEvalRun(supabase: SupabaseClient<Database>, runId: string, requestedBy: string) {
  const { data: run, error: runError } = await supabase.from('eval_runs').select('*').eq('id', runId).single()
  if (runError || !run) throw runError ?? new Error('Run not found')

  const config = run.config as EvalRunConfig

  await supabase.from('eval_runs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runId)

  try {
    const { data: cases, error: casesError } = await supabase
      .from('eval_cases')
      .select('*')
      .eq('dataset_id', run.dataset_id)
      .order('created_at', { ascending: true })
    if (casesError) throw casesError

    const generationProvider = getProviderByName(config.generation.provider, { evalRunId: runId, requestedBy })
    const evaluatorProvider =
      config.evaluator.type === 'llm_judge' && config.evaluator.provider
        ? getProviderByName(config.evaluator.provider, { evalRunId: runId, requestedBy })
        : null

    for (const evalCase of cases ?? []) {
      await runCase(supabase, runId, evalCase, config, generationProvider, evaluatorProvider, requestedBy)
    }

    await supabase.from('eval_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', runId)
  } catch (err) {
    await supabase
      .from('eval_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('id', runId)
    throw err
  }
}

async function runCase(
  supabase: SupabaseClient<Database>,
  runId: string,
  evalCase: EvalCase,
  config: EvalRunConfig,
  generationProvider: ReturnType<typeof getProviderByName>,
  evaluatorProvider: ReturnType<typeof getProviderByName> | null,
  requestedBy: string
) {
  const startedAt = Date.now()

  try {
    const retrieval = await retrieveEvidence(supabase, generationProvider, evalCase.question, {
      evidenceSource: config.retrieval.evidence_source,
      topK: config.retrieval.top_k,
      threshold: config.retrieval.threshold,
    })

    const metrics = computeRetrievalMetrics(retrieval.evidence, evalCase.expected_article_ids ?? [], evalCase.expected_chunk_ids ?? [])

    const generation = await generateAnswer(generationProvider, evalCase.question, retrieval.evidence)

    let judge: Awaited<ReturnType<typeof judgeAnswer>> | null = null
    if (evaluatorProvider) {
      const evalProviderWithContext = getProviderByName(config.evaluator.provider!, {
        evalRunId: runId,
        evalCaseId: evalCase.id,
        requestedBy,
      })
      judge = await judgeAnswer(evalProviderWithContext, evalCase, retrieval.evidence, generation.answer)
    }

    const failureClassification: FailureClassification | null =
      metrics.hit === false ? 'retrieval_failure' : judge && judge.outcomeScore < 0.5 ? 'unknown' : null

    const { error: insertError } = await supabase.from('eval_results').insert({
      eval_run_id: runId,
      eval_case_id: evalCase.id,
      status: 'completed',
      error: null,
      generated_answer: generation.answer,
      retrieved_evidence: retrieval.evidence,
      retrieval_hit: metrics.hit,
      retrieval_recall: metrics.recall,
      retrieval_mrr: metrics.mrr,
      generation_score: judge?.generationScore ?? null,
      grounding_score: judge?.groundingScore ?? null,
      outcome_score: judge?.outcomeScore ?? null,
      overall_score: judge ? (judge.generationScore + judge.groundingScore + judge.outcomeScore) / 3 : null,
      latency_ms: Date.now() - startedAt,
      input_tokens: generation.inputTokens,
      output_tokens: generation.outputTokens,
      estimated_cost: null,
      evaluator_details: judge?.details ?? null,
      failure_classification: failureClassification,
      human_reviewed_by: null,
      human_reviewed_at: null,
      human_accepted: null,
      human_generation_score: null,
      human_grounding_score: null,
      human_outcome_score: null,
      human_failure_classification: null,
      human_notes: null,
    })
    if (insertError) throw insertError
  } catch (err) {
    await supabase.from('eval_results').insert({
      eval_run_id: runId,
      eval_case_id: evalCase.id,
      status: 'failed',
      error: buildEvalError('pipeline', err),
      generated_answer: null,
      retrieved_evidence: null,
      retrieval_hit: null,
      retrieval_recall: null,
      retrieval_mrr: null,
      generation_score: null,
      grounding_score: null,
      outcome_score: null,
      overall_score: null,
      latency_ms: Date.now() - startedAt,
      input_tokens: null,
      output_tokens: null,
      estimated_cost: null,
      evaluator_details: null,
      failure_classification: null,
      human_reviewed_by: null,
      human_reviewed_at: null,
      human_accepted: null,
      human_generation_score: null,
      human_grounding_score: null,
      human_outcome_score: null,
      human_failure_classification: null,
      human_notes: null,
    })
  }
}
