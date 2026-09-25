import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from './context'

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: (...args: unknown[]) => createAdminClientMock(...args) }))

const ORIGINAL_KEY = process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY

const {
  setBuilderLlmCredential,
  clearBuilderLlmCredential,
  getBuilderLlmCredentialStatus,
  resolveBuilderLlmProvider,
} = await import('./builder-llm-credentials')
const { encryptCredential } = await import('@/lib/ai/credential-crypto')

beforeEach(() => {
  createAdminClientMock.mockReset()
  process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY = 'a-test-secret-key-value'
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY
  else process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY = ORIGINAL_KEY
})

function ctxWith(supabase: unknown, opts: { userId?: string; role?: string } = {}): WorkbenchCallerContext {
  return {
    user: { id: opts.userId ?? 'builder-1' },
    profile: { role: opts.role ?? 'consultant' },
    supabase,
  } as unknown as WorkbenchCallerContext
}

describe('setBuilderLlmCredential', () => {
  it('rejects an anonymous caller', async () => {
    const supabase = createFakeSupabase({})
    await expect(
      setBuilderLlmCredential(ctxWith(supabase, { role: 'anonymous' }), { providerType: 'openai', modelId: 'gpt-4o-mini' })
    ).rejects.toThrow('Create an account')
  })

  it('rejects a blank model id', async () => {
    const supabase = createFakeSupabase({})
    await expect(setBuilderLlmCredential(ctxWith(supabase), { providerType: 'openai', modelId: '   ' })).rejects.toThrow('Model is required')
  })

  it('rejects openai_compatible without a base URL', async () => {
    const supabase = createFakeSupabase({})
    await expect(
      setBuilderLlmCredential(ctxWith(supabase), { providerType: 'openai_compatible', modelId: 'llama3.1' })
    ).rejects.toThrow('Base URL is required')
  })

  it('upserts with an encrypted key when one is supplied', async () => {
    const supabase = createFakeSupabase({ builder_llm_credentials: [{ data: null, error: null }] })
    await setBuilderLlmCredential(ctxWith(supabase), {
      providerType: 'openai_compatible',
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'llama3.1',
      apiKey: 'sk-test',
    })
    const upsert = supabase._calls.find((c) => c.table === 'builder_llm_credentials' && c.method === 'upsert')
    expect(upsert?.args).toMatchObject({
      builder_id: 'builder-1',
      provider_type: 'openai_compatible',
      base_url: 'http://localhost:11434/v1',
      model_id: 'llama3.1',
      is_active: true,
    })
    const args = upsert?.args as { encrypted_api_key: string }
    expect(args.encrypted_api_key).not.toBe('sk-test')
    expect(args.encrypted_api_key).toContain('.')
  })

  it('stores a null key when none is supplied (a local server needing no auth)', async () => {
    const supabase = createFakeSupabase({ builder_llm_credentials: [{ data: null, error: null }] })
    await setBuilderLlmCredential(ctxWith(supabase), {
      providerType: 'openai_compatible',
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'llama3.1',
    })
    const upsert = supabase._calls.find((c) => c.table === 'builder_llm_credentials' && c.method === 'upsert')
    expect(upsert?.args).toMatchObject({ encrypted_api_key: null })
  })
})

describe('clearBuilderLlmCredential', () => {
  it("deletes only the caller's own row", async () => {
    const supabase = createFakeSupabase({ builder_llm_credentials: [{ data: null, error: null }] })
    await clearBuilderLlmCredential(ctxWith(supabase, { userId: 'builder-1' }))
    const del = supabase._calls.find((c) => c.table === 'builder_llm_credentials' && c.method === 'delete')
    expect(del).toBeDefined()
    const eqCall = supabase._calls.find((c) => c.table === 'builder_llm_credentials' && c.method === 'eq')
    expect(eqCall?.args).toEqual({ column: 'builder_id', value: 'builder-1' })
  })
})

describe('getBuilderLlmCredentialStatus', () => {
  it('returns null when no credential is configured', async () => {
    const supabase = createFakeSupabase({ builder_llm_credentials: [{ data: null, error: null }] })
    const result = await getBuilderLlmCredentialStatus(ctxWith(supabase))
    expect(result).toBeNull()
  })

  it('returns the non-secret status fields when configured', async () => {
    const supabase = createFakeSupabase({
      builder_llm_credentials: [
        { data: { provider_type: 'openai_compatible', base_url: 'http://localhost:11434/v1', model_id: 'llama3.1', is_active: true }, error: null },
      ],
    })
    const result = await getBuilderLlmCredentialStatus(ctxWith(supabase))
    expect(result).toEqual({
      configured: true,
      providerType: 'openai_compatible',
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'llama3.1',
      isActive: true,
    })
  })
})

describe('resolveBuilderLlmProvider', () => {
  it('returns null when no credential row exists', async () => {
    const admin = createFakeSupabase({ builder_llm_credentials: [{ data: null, error: null }] })
    createAdminClientMock.mockReturnValue(admin)
    const result = await resolveBuilderLlmProvider('builder-1')
    expect(result).toBeNull()
  })

  it('returns null when the credential is inactive', async () => {
    const admin = createFakeSupabase({
      builder_llm_credentials: [
        { data: { provider_type: 'openai', base_url: null, model_id: 'gpt-4o-mini', encrypted_api_key: null, is_active: false }, error: null },
      ],
    })
    createAdminClientMock.mockReturnValue(admin)
    const result = await resolveBuilderLlmProvider('builder-1')
    expect(result).toBeNull()
  })

  it('decrypts the stored key and constructs a working provider instance for an active credential', async () => {
    const encrypted = encryptCredential('sk-real-key')
    const admin = createFakeSupabase({
      builder_llm_credentials: [
        {
          data: {
            provider_type: 'openai_compatible',
            base_url: 'http://localhost:11434/v1',
            model_id: 'llama3.1',
            encrypted_api_key: encrypted,
            is_active: true,
          },
          error: null,
        },
      ],
    })
    createAdminClientMock.mockReturnValue(admin)
    const result = await resolveBuilderLlmProvider('builder-1')
    expect(result).not.toBeNull()
    expect(result?.providerType).toBe('openai_compatible')
    expect(result?.modelId).toBe('llama3.1')
    expect(result?.provider.name).toBe('byollm-builder-1')
  })

  it('uses a placeholder key for a local server configured with no key at all', async () => {
    const admin = createFakeSupabase({
      builder_llm_credentials: [
        {
          data: { provider_type: 'openai_compatible', base_url: 'http://localhost:11434/v1', model_id: 'llama3.1', encrypted_api_key: null, is_active: true },
          error: null,
        },
      ],
    })
    createAdminClientMock.mockReturnValue(admin)
    const result = await resolveBuilderLlmProvider('builder-1')
    expect(result).not.toBeNull()
    expect(result?.provider.name).toBe('byollm-builder-1')
  })
})
