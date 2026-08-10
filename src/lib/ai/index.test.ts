import { describe, it, expect, beforeEach } from 'vitest'
import { getActiveProvider, AIConfigError } from './index'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

function defaultGenerationModelFixture() {
  return {
    ai_models: [
      {
        data: { id: 'model-1', provider_id: 'provider-1', model_id: 'gpt-4o-mini', model_type: 'generation', is_default: true },
        error: null,
      },
    ],
    ai_providers: [
      {
        data: {
          id: 'provider-1',
          name: 'openai',
          provider_type: 'openai',
          display_name: 'OpenAI',
          base_url: null,
          api_key_env_var: 'OPENAI_API_KEY',
          enabled: true,
        },
        error: null,
      },
    ],
  }
}

describe('getActiveProvider', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  it('throws a clear config error instead of silently defaulting when the default provider has no key', async () => {
    const supabase = createFakeSupabase(defaultGenerationModelFixture()) as never

    await expect(getActiveProvider(supabase)).rejects.toBeInstanceOf(AIConfigError)
  })

  it('builds a provider for whichever model the registry marks as the default generation model', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const supabase = createFakeSupabase(defaultGenerationModelFixture()) as never

    const provider = await getActiveProvider(supabase)
    expect(provider.name).toBe('openai')
  })
})
