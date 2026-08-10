import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EvalCase, EvalRunConfig, FailureClassification } from '@/types/database'
import type { AIProvider } from '@/lib/ai/provider'
import { getProviderByName, resolveModel, assertModelCapability } from '@/lib/ai'
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

  // Validated once, before any API call is made -- not scattered
  // provider-name checks throughout the pipeline (see assertModelCapability).
  const { model: generationModelRow } = await resolveModel(supabase, config.generation.provider, config.generation.model)
  assertModelCapability(generationModelRow, 'generation')
  const { model: embeddingModelRow } = await resolveModel(supabase, config.embedding.provider, config.embedding.model)
  assertModelCapability(embeddingModelRow, 'embedding')
  let evaluatorModelRow = null
  if (config.evaluator.type === 'llm_judge' && config.evaluator.provider && config.evaluator.model) {
    const { model } = await resolveModel(supabase, config.evaluator.provider, config.evaluator.model)
    assertModelCapability(model, 'generation')
    assertModelCapability(model, 'structured_output')
    evaluatorModelRow = model
  }

  await supabase.from('eval_runs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runId)

  try {
    const { data: cases, error: casesError } = await supabase
      .from('eval_cases')
      .select('*')
      .eq('dataset_id', run.dataset_id)
      .order('created_at', { ascending: true })
    if (casesError) throw casesError

    const generationProvider = await getProviderByName(supabase, config.generation.provider, { evalRunId: runId, requestedBy })
    const embeddingProvider =
      config.embedding.provider === config.generation.provider
        ? generationProvider
        : await getProviderByName(supabase, config.embedding.provider, { evalRunId: runId, requestedBy })

    for (const evalCase of cases ?? []) {
      await runCase(supabase, runId, evalCase, config, {
        generationProvider,
        generationModel: config.generation.model,
        embeddingProvider,
        embeddingModel: config.embedding.model,
        evaluatorModelId: evaluatorModelRow ? config.evaluator.model! : null,
        requestedBy,
      })
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

interface RunCaseModels {
  generationProvider: AIProvider
  generationModel: string
  embeddingProvider: AIProvider
  embeddingModel: string
  evaluatorModelId: string | null
  requestedBy: string
}

async function runCase(
  supabase: SupabaseClient<Database>,
  runId: string,
  evalCase: EvalCase,
  config: EvalRunConfig,
  models: RunCaseModels
) {
  const startedAt = Date.now()

  try {
    const retrieval = await retrieveEvidence(supabase, models.embeddingProvider, models.embeddingModel, evalCase.question, {
      evidenceSource: config.retrieval.evidence_source,
      topK: config.retrieval.top_k,
      threshold: config.retrieval.threshold,
    })

    const metrics = computeRetrievalMetrics(retrieval.evidence, evalCase.expected_article_ids ?? [], evalCase.expected_chunk_ids ?? [])

    const generation = await generateAnswer(models.generationProvider, models.generationModel, evalCase.question, retrieval.evidence)

    let judge: Awaited<ReturnType<typeof judgeAnswer>> | null = null
    if (models.evaluatorModelId && config.evaluator.provider) {
      const evalProviderWithContext = await getProviderByName(supabase, config.evaluator.provider, {
        evalRunId: runId,
        evalCaseId: evalCase.id,
        requestedBy: models.requestedBy,
      })
      judge = await judgeAnswer(evalProviderWithContext, models.evaluatorModelId, evalCase, retrieval.evidence, generation.answer)
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
