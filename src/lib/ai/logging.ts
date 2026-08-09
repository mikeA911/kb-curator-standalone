import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AIProvider,
  EmbedInput,
  GenerateStructuredInput,
  GenerateTextInput,
} from './provider'

export interface LogContext {
  documentId?: string
  chunkId?: string
  requestedBy?: string
}

// Wraps any AIProvider so every call is recorded in ai_operation_logs --
// provider, model, latency, token counts, success/failure -- without each
// call site having to remember to log. Logging itself always uses the
// service-role client (this is infrastructure bookkeeping, not user data;
// see the ai_operation_logs RLS policy, which has no client insert path).
export function withLogging(provider: AIProvider, context: LogContext = {}): AIProvider {
  const record = async (
    operation: 'generate_text' | 'generate_structured' | 'embed',
    model: string,
    startedAt: number,
    outcome: { success: true; inputTokens: number | null; outputTokens: number | null } | { success: false; error: string }
  ) => {
    const admin = createAdminClient()
    await admin.from('ai_operation_logs').insert({
      operation,
      provider: provider.name,
      model,
      document_id: context.documentId ?? null,
      chunk_id: context.chunkId ?? null,
      requested_by: context.requestedBy ?? null,
      latency_ms: Date.now() - startedAt,
      input_tokens: outcome.success ? outcome.inputTokens : null,
      output_tokens: outcome.success ? outcome.outputTokens : null,
      success: outcome.success,
      error_message: outcome.success ? null : outcome.error,
    })
  }

  return {
    name: provider.name,

    async generateText(input: GenerateTextInput) {
      const startedAt = Date.now()
      try {
        const result = await provider.generateText(input)
        await record('generate_text', result.model, startedAt, { success: true, ...result.usage })
        return result
      } catch (err) {
        await record('generate_text', 'unknown', startedAt, { success: false, error: (err as Error).message })
        throw err
      }
    },

    async generateStructured<T>(input: GenerateStructuredInput<T>) {
      const startedAt = Date.now()
      try {
        const result = await provider.generateStructured(input)
        await record('generate_structured', result.model, startedAt, { success: true, ...result.usage })
        return result
      } catch (err) {
        await record('generate_structured', 'unknown', startedAt, { success: false, error: (err as Error).message })
        throw err
      }
    },

    async embed(input: EmbedInput) {
      const startedAt = Date.now()
      try {
        const result = await provider.embed(input)
        await record('embed', result.model, startedAt, { success: true, ...result.usage })
        return result
      } catch (err) {
        await record('embed', 'unknown', startedAt, { success: false, error: (err as Error).message })
        throw err
      }
    },
  }
}
