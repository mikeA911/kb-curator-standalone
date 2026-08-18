import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthError } from '@/lib/auth'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const getUserMock = vi.fn()
let fakeSupabase: ReturnType<typeof createFakeSupabase> & { auth: { getUser: typeof getUserMock } }

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => fakeSupabase,
}))
vi.mock('@/lib/env', () => ({
  env: { supabaseUrl: () => 'https://fake.supabase.co', supabaseAnonKey: () => 'fake-anon-key' },
}))

const { resolveCallerIdentityFromToken } = await import('./identity')

beforeEach(() => {
  getUserMock.mockReset()
  fakeSupabase = Object.assign(createFakeSupabase({}), { auth: { getUser: getUserMock } })
})

describe('resolveCallerIdentityFromToken', () => {
  it('rejects an invalid/expired token the same way requireUser rejects no session', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    await expect(resolveCallerIdentityFromToken('bad-token')).rejects.toBeInstanceOf(AuthError)
  })

  it('rejects a token for a deactivated account', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fakeSupabase = Object.assign(
      createFakeSupabase({ profiles: [{ data: { id: 'user-1', role: 'curator', is_active: false }, error: null }] }),
      { auth: { getUser: getUserMock } }
    )

    await expect(resolveCallerIdentityFromToken('token-for-deactivated')).rejects.toThrow('deactivated')
  })

  it('resolves a valid token to the same { user, profile, supabase } shape requireUser returns', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fakeSupabase = Object.assign(
      createFakeSupabase({ profiles: [{ data: { id: 'user-1', role: 'admin', is_active: true }, error: null }] }),
      { auth: { getUser: getUserMock } }
    )

    const ctx = await resolveCallerIdentityFromToken('valid-token')

    expect(ctx.user.id).toBe('user-1')
    expect(ctx.profile.role).toBe('admin')
    expect(ctx.supabase).toBe(fakeSupabase)
    expect(getUserMock).toHaveBeenCalledWith('valid-token')
  })
})
