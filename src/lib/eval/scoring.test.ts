import { describe, it, expect } from 'vitest'
import { computeRetrievalMetrics } from './scoring'
import type { RetrievedEvidenceItem } from '@/types/database'

function item(overrides: Partial<RetrievedEvidenceItem>): RetrievedEvidenceItem {
  return { type: 'wiki', id: 'x', rank: 1, similarity: 0.9, title: 't', content: 'c', ...overrides }
}

describe('computeRetrievalMetrics', () => {
  it('Hit@K: true when at least one expected item is retrieved', () => {
    const evidence = [item({ id: 'wiki-1', rank: 1 }), item({ id: 'wiki-2', rank: 2 })]
    const metrics = computeRetrievalMetrics(evidence, ['wiki-2'], [])
    expect(metrics.hit).toBe(true)
  })

  it('Hit@K: false when none of the retrieved items are expected', () => {
    const evidence = [item({ id: 'wiki-1', rank: 1 })]
    const metrics = computeRetrievalMetrics(evidence, ['wiki-99'], [])
    expect(metrics.hit).toBe(false)
  })

  it('Recall@K: fraction of expected evidence actually retrieved', () => {
    const evidence = [item({ id: 'wiki-1', rank: 1 }), item({ id: 'wiki-2', rank: 2 })]
    const metrics = computeRetrievalMetrics(evidence, ['wiki-1', 'wiki-2', 'wiki-3'], [])
    expect(metrics.recall).toBeCloseTo(2 / 3)
  })

  it('MRR: reciprocal rank of the first relevant result', () => {
    const evidence = [item({ id: 'wiki-other', rank: 1 }), item({ id: 'wiki-1', rank: 2 }), item({ id: 'wiki-1-dup', rank: 3 })]
    const metrics = computeRetrievalMetrics(evidence, ['wiki-1'], [])
    expect(metrics.mrr).toBeCloseTo(1 / 2)
  })

  it('MRR: 0 when no expected evidence is retrieved at all', () => {
    const evidence = [item({ id: 'wiki-other', rank: 1 })]
    const metrics = computeRetrievalMetrics(evidence, ['wiki-1'], [])
    expect(metrics.mrr).toBe(0)
  })

  it('never matches a chunk id against expected article ids or vice versa -- evidence type stays explicit', () => {
    const evidence = [item({ type: 'chunk', id: 'shared-id', rank: 1 })]
    const metrics = computeRetrievalMetrics(evidence, ['shared-id'], [])
    expect(metrics.hit).toBe(false)
  })

  it('returns nulls when a case defines no expected evidence at all', () => {
    const metrics = computeRetrievalMetrics([item({ id: 'wiki-1' })], [], [])
    expect(metrics).toEqual({ hit: null, recall: null, mrr: null, projectLayerPrecisionAtK: null })
  })

  it('projectLayerPrecisionAtK: null when no evidence item carries a layer -- not project-scoped retrieval', () => {
    const metrics = computeRetrievalMetrics([item({ id: 'wiki-1' })], ['wiki-1'], [])
    expect(metrics.projectLayerPrecisionAtK).toBeNull()
  })

  it('projectLayerPrecisionAtK: fraction of layered evidence that is layer:project', () => {
    const evidence = [
      item({ id: 'a', layer: 'project' }),
      item({ id: 'b', layer: 'platform' }),
      item({ id: 'c', layer: 'project' }),
      item({ id: 'd', layer: 'platform' }),
    ]
    const metrics = computeRetrievalMetrics(evidence, ['a'], [])
    expect(metrics.projectLayerPrecisionAtK).toBeCloseTo(0.5)
  })

  it('projectLayerPrecisionAtK: 1 when every retrieved item is project-layer', () => {
    const evidence = [item({ id: 'a', layer: 'project' }), item({ id: 'b', layer: 'project' })]
    const metrics = computeRetrievalMetrics(evidence, ['a'], [])
    expect(metrics.projectLayerPrecisionAtK).toBe(1)
  })
})
