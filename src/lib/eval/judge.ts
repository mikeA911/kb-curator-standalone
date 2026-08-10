import 'server-only'
import { z } from 'zod'
import type { AIProvider } from '@/lib/ai/provider'
import type { EvalCase, EvaluatorDetails, RetrievedEvidenceItem } from '@/types/database'

const JudgeSchema = z.object({
  generation_score: z.number().min(0).max(1),
  grounding_score: z.number().min(0).max(1),
  outcome_score: z.number().min(0).max(1),
  reasoning: z.string(),
  missing_concepts: z.array(z.string()).default([]),
  unsupported_claims: z.array(z.string()).default([]),
})

export interface JudgeResult {
  generationScore: number
  groundingScore: number
  outcomeScore: number
  details: EvaluatorDetails
}

// Optional, model-based evaluation of qualitative answer quality -- never
// the only evaluator (deterministic retrieval metrics always run
// regardless; see scoring.ts). The judge is itself a probabilistic model,
// which is exactly why it's additive rather than authoritative -- a human
// reviewer's human_* columns on eval_results are the last word, not this.
export async function judgeAnswer(
  provider: AIProvider,
  model: string,
  evalCase: Pick<EvalCase, 'question' | 'expected_answer' | 'expected_concepts' | 'scoring_criteria'>,
  evidence: RetrievedEvidenceItem[],
  generatedAnswer: string
): Promise<JudgeResult> {
  const evidenceBlock = evidence.map((item, i) => `[${i + 1}] (${item.type}: ${item.title})\n${item.content}`).join('\n\n')

  const { data, model: resolvedModel } = await provider.generateStructured({
    model,
    system:
      'You are an evaluator scoring an AI-generated answer against retrieved evidence and expected criteria. ' +
      'Be precise and skeptical -- do not give credit for claims the evidence does not actually support.',
    prompt: [
      `Question: ${evalCase.question}`,
      evalCase.expected_answer ? `Expected answer characteristics: ${evalCase.expected_answer}` : null,
      evalCase.expected_concepts?.length ? `Expected concepts: ${evalCase.expected_concepts.join(', ')}` : null,
      evalCase.scoring_criteria ? `Scoring criteria: ${evalCase.scoring_criteria}` : null,
      `\nRetrieved evidence:\n${evidenceBlock || '(none)'}`,
      `\nGenerated answer:\n${generatedAnswer}`,
      '\nReturn JSON with: generation_score (0-1, did it correctly use the evidence?), ' +
        'grounding_score (0-1, is every claim supported by the retrieved evidence?), ' +
        'outcome_score (0-1, did it actually answer the question?), reasoning (string), ' +
        'missing_concepts (string[], expected concepts absent from the answer), ' +
        'unsupported_claims (string[], claims not backed by the evidence).',
    ]
      .filter(Boolean)
      .join('\n'),
    schema: JudgeSchema,
  })

  return {
    generationScore: data.generation_score,
    groundingScore: data.grounding_score,
    outcomeScore: data.outcome_score,
    details: {
      provider: provider.name,
      model: resolvedModel,
      reasoning: data.reasoning,
      missing_concepts: data.missing_concepts,
      unsupported_claims: data.unsupported_claims,
    },
  }
}
