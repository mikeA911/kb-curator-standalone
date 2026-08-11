import { describe, it, expect } from 'vitest'
import { diagnoseNode } from './nodes'

describe('diagnoseNode', () => {
  it('classifies retrieval_failure when expected evidence exists but the retrieval metrics missed', () => {
    const result = diagnoseNode(
      { evaluation: { retrieval: { hit: false, recall: 0, mrr: 0 }, generation: null, grounding: null, outcome: null, details: null } },
      { hasExpectedEvidence: true }
    )
    expect(result).toEqual({ failureType: 'retrieval_failure' })
  })

  it('classifies generation_failure when retrieval is fine (or ungoverned) but the judge score is low', () => {
    const result = diagnoseNode(
      { evaluation: { retrieval: null, generation: 0.2, grounding: 0.2, outcome: 0.2, details: null } },
      { hasExpectedEvidence: false }
    )
    expect(result).toEqual({ failureType: 'generation_failure' })
  })

  it('does not classify retrieval_failure when there is no expected evidence to have missed', () => {
    const result = diagnoseNode(
      { evaluation: { retrieval: { hit: false, recall: 0, mrr: 0 }, generation: 0.2, grounding: 0.2, outcome: 0.2, details: null } },
      { hasExpectedEvidence: false }
    )
    // hasExpectedEvidence is false, so the retrieval_failure rule doesn't
    // apply even though hit is technically false -- falls through to the
    // generation_failure rule since scores are present.
    expect(result).toEqual({ failureType: 'generation_failure' })
  })

  it('falls back to unknown when neither rule applies', () => {
    const result = diagnoseNode(
      { evaluation: { retrieval: null, generation: null, grounding: null, outcome: null, details: null } },
      { hasExpectedEvidence: false }
    )
    expect(result).toEqual({ failureType: 'unknown' })
  })
})
