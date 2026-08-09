import { describe, it, expect } from 'vitest'
import { buildProcessingError, buildEnrichmentError } from './failures'

describe('buildProcessingError', () => {
  it('captures stage, message, and a timestamp from a thrown Error', () => {
    const err = buildProcessingError('parse', new Error('boom'))
    expect(err.stage).toBe('parse')
    expect(err.message).toBe('boom')
    expect(err.retryable).toBe(true)
    expect(new Date(err.occurred_at).toString()).not.toBe('Invalid Date')
  })

  it('respects an explicit retryable=false', () => {
    const err = buildProcessingError('embed', new Error('fatal'), { retryable: false, code: 'fatal_error' })
    expect(err.retryable).toBe(false)
    expect(err.code).toBe('fatal_error')
  })
})

describe('buildEnrichmentError', () => {
  it('captures a non-Error thrown value as a string message', () => {
    const err = buildEnrichmentError('rate limited')
    expect(err.message).toBe('rate limited')
    expect(err.code).toBe('enrichment_failed')
  })
})
