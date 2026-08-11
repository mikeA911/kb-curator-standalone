import type { GraphTerminationReason } from '@/types/database'
import type { RagGraphState } from './state'

export interface AcceptanceThresholds {
  requiredOutcomeScore?: number
  requiredGroundingScore?: number
  requireExpectedEvidence?: boolean
}

export type TransitionDecision = 'end' | 'diagnose'

// The graph decides -- never "would you like another attempt?" asked of the
// model. Deterministic, pure, independently testable. Three acceptance
// regimes, per the design brief's section 11:
//   1. A judge is configured -> score-based acceptance against thresholds.
//   2. No judge, but golden evidence exists -> the deterministic retrieval
//      hit alone decides (never fabricate a score with no judge).
//   3. Neither -> nothing to score against; run once and stop ('unscored',
//      never 'success' -- reusing 'success' would let a comparison UI
//      misread "nothing was checked" as "the judge accepted it").
export function shouldContinue(
  state: Pick<RagGraphState, 'evaluation' | 'iteration' | 'maxIterations'>,
  thresholds: AcceptanceThresholds,
  hasJudge: boolean,
  hasExpectedEvidence: boolean
): { decision: TransitionDecision; terminationReason: GraphTerminationReason | null } {
  if (!hasJudge && !hasExpectedEvidence) {
    return { decision: 'end', terminationReason: 'unscored' }
  }

  const ev = state.evaluation
  let accepted: boolean
  if (hasJudge) {
    const outcomeOk = thresholds.requiredOutcomeScore === undefined || (ev?.outcome ?? 0) >= thresholds.requiredOutcomeScore
    const groundingOk = thresholds.requiredGroundingScore === undefined || (ev?.grounding ?? 0) >= thresholds.requiredGroundingScore
    const evidenceOk = !thresholds.requireExpectedEvidence || ev?.retrieval?.hit !== false
    accepted = outcomeOk && groundingOk && evidenceOk
  } else {
    accepted = ev?.retrieval?.hit === true
  }

  if (accepted) return { decision: 'end', terminationReason: 'success' }
  if (state.iteration >= state.maxIterations) return { decision: 'end', terminationReason: 'max_iterations' }
  return { decision: 'diagnose', terminationReason: null }
}
