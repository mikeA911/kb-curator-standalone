import { describe, it, expect, beforeEach } from 'vitest'
import { getActiveProvider, AIConfigError } from './index'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

describe('getActiveProvider', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  it('throws a clear config error instead of silently defaulting when the selected provider has no key', async () => {
    const supabase = createFakeSupabase({
      settings: [{ data: { value: 'openai' }, error: null }],
    }) as never

    await expect(getActiveProvider(supabase)).rejects.toBeInstanceOf(AIConfigError)
  })

  it('builds an OpenAI-backed provider once the key is present', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const supabase = createFakeSupabase({
      settings: [{ data: { value: 'openai' }, error: null }],
    }) as never

    const provider = await getActiveProvider(supabase)
    expect(provider.name).toBe('openai')
  })
})
