import type { EnrichmentError, ProcessingError, ProcessingStage } from '@/types/database'

// Central place to build the structured failure objects stored on
// documents.processing_error / document_chunks.enrichment_error, so every
// failure path records the same shape instead of ad hoc error strings.

export function buildProcessingError(
  stage: ProcessingStage,
  err: unknown,
  opts: { code?: string; retryable?: boolean } = {}
): ProcessingError {
  const message = err instanceof Error ? err.message : String(err)
  return {
    stage,
    code: opts.code ?? 'unknown_error',
    message,
    detail: err instanceof Error ? err.stack : undefined,
    occurred_at: new Date().toISOString(),
    retryable: opts.retryable ?? true,
  }
}

export function buildEnrichmentError(err: unknown, code = 'enrichment_failed'): EnrichmentError {
  const message = err instanceof Error ? err.message : String(err)
  return { code, message, occurred_at: new Date().toISOString() }
}
