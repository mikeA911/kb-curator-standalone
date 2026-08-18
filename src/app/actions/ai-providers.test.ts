import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireRoleMock = vi.fn()
const listModelsApiMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', () => ({ requireRole: (...args: unknown[]) => requireRoleMock(...args) }))
vi.mock('@/lib/env', () => ({ env: { byName: vi.fn(() => 'fake-api-key') } }))
vi.mock('openai', () => ({
  default: class MockOpenAI {
    models = { list: (...args: unknown[]) => listModelsApiMock(...args) }
  },
}))

const {
  createProviderAction,
  createModelAction,
  discoverModelsAction,
  updateModelEnabledAction,
  setDefaultModelAction,
  setDefaultStructuredOutputModelAction,
} = await import('./ai-providers')

beforeEach(() => {
  requireRoleMock.mockReset()
  listModelsApiMock.mockReset()
})

describe('createProviderAction', () => {
  it('requires admin and never stores a raw key value, only the env var name', async () => {
    const supabase = createFakeSupabase({ ai_providers: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await createProviderAction({
      name: 'local-gateway',
      providerType: 'openai_compatible',
      displayName: 'Local Gateway',
      baseUrl: 'http://localhost:11434/v1',
      apiKeyEnvVar: 'LOCAL_GATEWAY_API_KEY',
      supportsModelDiscovery: true,
    })

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const insert = supabase._calls.find((c) => c.table === 'ai_providers' && c.method === 'insert')
    const args = insert?.args as Record<string, unknown>
    expect(args.api_key_env_var).toBe('LOCAL_GATEWAY_API_KEY')
    // Structural guarantee: nothing resembling a raw secret value is ever
    // part of the insert payload -- only the env var *name* is stored.
    expect(Object.keys(args)).not.toContain('api_key')
    expect(Object.keys(args)).not.toContain('apiKey')
  })
})

describe('createModelAction', () => {
  it('lets an admin add a model manually', async () => {
    const supabase = createFakeSupabase({ ai_models: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await createModelAction({
      providerId: 'provider-1',
      modelId: 'openai/gpt-oss-20b',
      displayName: 'GPT-OSS 20B',
      modelType: 'generation',
      contextWindow: 128000,
      maxOutputTokens: null,
      embeddingDimensions: null,
      supportsStructuredOutput: true,
      supportsTools: true,
      supportsReasoning: false,
      supportsVision: false,
    })

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const insert = supabase._calls.find((c) => c.table === 'ai_models' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ provider_id: 'provider-1', model_id: 'openai/gpt-oss-20b', enabled: true, is_default: false })
  })
})

describe('updateModelEnabledAction / setDefaultModelAction', () => {
  it('both require admin', async () => {
    const supabase = createFakeSupabase({ ai_models: [{ data: null, error: null }, { data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await updateModelEnabledAction('model-1', 'provider-1', false)
    await setDefaultModelAction('model-1', 'provider-1', 'generation')

    expect(requireRoleMock).toHaveBeenCalledTimes(2)
    expect(requireRoleMock).toHaveBeenCalledWith('admin')
  })
})

describe('setDefaultStructuredOutputModelAction', () => {
  it('requires admin, unsets the previous global default, then sets the new one -- not scoped by model_type', async () => {
    const supabase = createFakeSupabase({ ai_models: [{ data: null, error: null }, { data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await setDefaultStructuredOutputModelAction('model-2', 'provider-1')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const [unset, set] = supabase._calls.filter((c) => c.table === 'ai_models' && c.method === 'update')
    expect(unset.args).toEqual({ is_default_structured_output: false })
    expect(set.args).toEqual({ is_default_structured_output: true })
  })

  it('maps the capability check-constraint violation to a clear error, not a raw Postgres one', async () => {
    const supabase = createFakeSupabase({
      ai_models: [
        { data: null, error: null },
        { data: null, error: Object.assign(new Error('violates check constraint'), { code: '23514' }) },
      ],
    })
    requireRoleMock.mockResolvedValue({ supabase })

    await expect(setDefaultStructuredOutputModelAction('model-2', 'provider-1')).rejects.toThrow('does not support structured output')
  })
})

describe('discoverModelsAction', () => {
  it('requires admin, calls the provider API, and never writes to ai_models', async () => {
    const supabase = createFakeSupabase({
      ai_providers: [
        {
          data: {
            id: 'provider-1',
            display_name: 'Groq',
            base_url: 'https://api.groq.com/openai/v1',
            api_key_env_var: 'GROQ_API_KEY',
            supports_model_discovery: true,
          },
          error: null,
        },
      ],
    })
    requireRoleMock.mockResolvedValue({ supabase })
    listModelsApiMock.mockResolvedValue({ data: [{ id: 'openai/gpt-oss-20b' }, { id: 'qwen/qwen3.6-27b' }] })

    const result = await discoverModelsAction('provider-1')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    expect(result).toEqual([{ id: 'openai/gpt-oss-20b' }, { id: 'qwen/qwen3.6-27b' }])
    // Discovery only ever reads ai_providers -- it must never touch ai_models
    // itself; adding a discovered model is a separate, explicit admin action
    // (createModelAction).
    const modelWrites = supabase._calls.filter((c) => c.table === 'ai_models')
    expect(modelWrites).toHaveLength(0)
  })

  it('refuses to run against a provider that does not support discovery', async () => {
    const supabase = createFakeSupabase({
      ai_providers: [
        { data: { id: 'provider-2', display_name: 'Gemini', base_url: null, api_key_env_var: 'GOOGLE_API_KEY', supports_model_discovery: false }, error: null },
      ],
    })
    requireRoleMock.mockResolvedValue({ supabase })

    await expect(discoverModelsAction('provider-2')).rejects.toThrow('does not support model discovery')
    expect(listModelsApiMock).not.toHaveBeenCalled()
  })
})
