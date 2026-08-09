import type { EvalError } from '@/types/database'

export function buildEvalError(stage: string, err: unknown): EvalError {
  return {
    stage,
    code: 'unknown_error',
    message: err instanceof Error ? err.message : String(err),
    occurred_at: new Date().toISOString(),
  }
}
