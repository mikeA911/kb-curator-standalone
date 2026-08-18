import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getDefaultModel, getDefaultStructuredOutputModel, assertModelCapability, AIConfigError } from './registry'
import type { AIModelRow } from '@/types/database'

function model(overrides: Partial<AIModelRow> = {}): AIModelRow {
  return {
    id: 'model-1',
    provider_id: 'provider-1',
    model_id: 'gpt-4o-mini',
    display_name: 'GPT-4o mini',
    model_type: 'generation',
    enabled: true,
    is_default: true,
    is_default_structured_output: false,
    context_window: null,
    max_output_tokens: null,
    input_cost_per_million: null,
    output_cost_per_million: null,
    embedding_dimensions: null,
    supports_structured_output: false,
    supports_tools: false,
    supports_reasoning: false,
    supports_vision: false,
    supports_embeddings: false,
    status: 'active',
    deprecation_date: null,
    replacement_model_id: null,
    notes: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getDefaultModel', () => {
  it('resolves generation and embedding defaults independently -- a Groq generation default does not affect the Gemini embedding default', async () => {
    const supabase = createFakeSupabase({
      ai_models: [
        { data: model({ id: 'gen-1', provider_id: 'groq-provider', model_id: 'openai/gpt-oss-20b', model_type: 'generation' }), error: null },
        { data: model({ id: 'embed-1', provider_id: 'gemini-provider', model_id: 'gemini-embedding-001', model_type: 'embedding' }), error: null },
      ],
      ai_providers: [
        { data: { id: 'groq-provider', name: 'groq' }, error: null },
        { data: { id: 'gemini-provider', name: 'gemini' }, error: null },
      ],
    }) as never

    const generation = await getDefaultModel(supabase, 'generation')
    const embedding = await getDefaultModel(supabase, 'embedding')

    expect(generation.provider.name).toBe('groq')
    expect(generation.model.model_id).toBe('openai/gpt-oss-20b')
    expect(embedding.provider.name).toBe('gemini')
    expect(embedding.model.model_id).toBe('gemini-embedding-001')
  })

  it('throws a clear config error when no default is configured for a model type', async () => {
    const supabase = createFakeSupabase({
      ai_models: [{ data: null, error: null }],
    }) as never

    await expect(getDefaultModel(supabase, 'embedding')).rejects.toBeInstanceOf(AIConfigError)
  })
})

describe('getDefaultStructuredOutputModel', () => {
  it('resolves is_default_structured_output independently of is_default -- a different model can own each', async () => {
    const supabase = createFakeSupabase({
      ai_models: [
        {
          data: model({ id: 'structured-1', provider_id: 'openai-provider', model_id: 'gpt-4o-mini', model_type: 'generation', is_default: false }),
          error: null,
        },
      ],
      ai_providers: [{ data: { id: 'openai-provider', name: 'openai' }, error: null }],
    }) as never

    const { provider, model: resolvedModel } = await getDefaultStructuredOutputModel(supabase)

    expect(provider.name).toBe('openai')
    expect(resolvedModel.model_id).toBe('gpt-4o-mini')
  })

  it('throws a clear config error when no structured-output default is configured', async () => {
    const supabase = createFakeSupabase({ ai_models: [{ data: null, error: null }] }) as never
    await expect(getDefaultStructuredOutputModel(supabase)).rejects.toBeInstanceOf(AIConfigError)
  })
})

describe('assertModelCapability', () => {
  it('rejects a disabled model regardless of which capability is being checked', () => {
    const disabled = model({ enabled: false })
    expect(() => assertModelCapability(disabled, 'generation')).toThrow(AIConfigError)
  })

  it('rejects an embedding model when a generation slot is needed', () => {
    const embeddingModel = model({ model_type: 'embedding' })
    expect(() => assertModelCapability(embeddingModel, 'generation')).toThrow(/cannot be used for generation/)
  })

  it('rejects a generation model when an embedding slot is needed', () => {
    const generationModel = model({ model_type: 'generation', supports_embeddings: false })
    expect(() => assertModelCapability(generationModel, 'embedding')).toThrow(/cannot be used for embedding/)
  })

  it('rejects a model without structured-output support for the evaluator slot', () => {
    const noStructured = model({ supports_structured_output: false })
    expect(() => assertModelCapability(noStructured, 'structured_output')).toThrow(/does not support structured output/)
  })

  it('allows an enabled, correctly-typed model through cleanly', () => {
    const generationModel = model({ model_type: 'generation', enabled: true, supports_structured_output: true })
    expect(() => assertModelCapability(generationModel, 'generation')).not.toThrow()
    expect(() => assertModelCapability(generationModel, 'structured_output')).not.toThrow()
  })
})
