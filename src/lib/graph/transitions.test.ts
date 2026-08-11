import { describe, it, expect } from 'vitest'
import { shouldContinue } from './transitions'

const baseState = { iteration: 0, maxIterations: 2 }

describe('shouldContinue', () => {
  it('accepts when a judge is configured and both thresholds are met', () => {
    const result = shouldContinue(
      { ...baseState, evaluation: { retrieval: null, generation: 0.9, grounding: 0.9, outcome: 0.9, details: null } },
      { requiredOutcomeScore: 0.7, requiredGroundingScore: 0.7 },
      true,
      false
    )
    expect(result).toEqual({ decision: 'end', terminationReason: 'success' })
  })

  it('retries (routes to diagnose) when the judge score is below threshold and iterations remain', () => {
    const result = shouldContinue(
      { ...baseState, evaluation: { retrieval: null, generation: 0.3, grounding: 0.3, outcome: 0.3, details: null } },
      { requiredOutcomeScore: 0.7, requiredGroundingScore: 0.7 },
      true,
      false
    )
    expect(result).toEqual({ decision: 'diagnose', terminationReason: null })
  })

  it('ends with max_iterations once the iteration cap is reached, even if not accepted', () => {
    const result = shouldContinue(
      { iteration: 2, maxIterations: 2, evaluation: { retrieval: null, generation: 0.1, grounding: 0.1, outcome: 0.1, details: null } },
      { requiredOutcomeScore: 0.7, requiredGroundingScore: 0.7 },
      true,
      false
    )
    expect(result).toEqual({ decision: 'end', terminationReason: 'max_iterations' })
  })

  it('requireExpectedEvidence gates acceptance even when scores pass', () => {
    const result = shouldContinue(
      {
        ...baseState,
        evaluation: { retrieval: { hit: false, recall: 0, mrr: 0 }, generation: 0.9, grounding: 0.9, outcome: 0.9, details: null },
      },
      { requiredOutcomeScore: 0.7, requiredGroundingScore: 0.7, requireExpectedEvidence: true },
      true,
      true
    )
    expect(result.decision).toBe('diagnose')
  })

  it('falls back to the deterministic retrieval hit when no judge is configured but golden evidence exists', () => {
    const accepted = shouldContinue(
      { ...baseState, evaluation: { retrieval: { hit: true, recall: 1, mrr: 1 }, generation: null, grounding: null, outcome: null, details: null } },
      {},
      false,
      true
    )
    expect(accepted).toEqual({ decision: 'end', terminationReason: 'success' })

    const missed = shouldContinue(
      { ...baseState, evaluation: { retrieval: { hit: false, recall: 0, mrr: 0 }, generation: null, grounding: null, outcome: null, details: null } },
      {},
      false,
      true
    )
    expect(missed.decision).toBe('diagnose')
  })

  it('stops after one pass with terminationReason "unscored" -- never "success" -- when there is no judge and no golden evidence', () => {
    const result = shouldContinue(
      { ...baseState, evaluation: { retrieval: null, generation: null, grounding: null, outcome: null, details: null } },
      {},
      false,
      false
    )
    expect(result).toEqual({ decision: 'end', terminationReason: 'unscored' })
  })
})
