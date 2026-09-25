import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const ORIGINAL_KEY = process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY

describe('credential-crypto', () => {
  beforeEach(() => {
    process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY = 'a-test-secret-key-value'
  })

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY
    else process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY = ORIGINAL_KEY
  })

  it('round-trips a plaintext value through encrypt/decrypt', async () => {
    const { encryptCredential, decryptCredential } = await import('./credential-crypto')
    const encrypted = encryptCredential('sk-super-secret-value')
    expect(encrypted).not.toContain('sk-super-secret-value')
    expect(decryptCredential(encrypted)).toBe('sk-super-secret-value')
  })

  it('produces a different ciphertext each time (random IV), same plaintext round-trips both', async () => {
    const { encryptCredential, decryptCredential } = await import('./credential-crypto')
    const a = encryptCredential('same-value')
    const b = encryptCredential('same-value')
    expect(a).not.toBe(b)
    expect(decryptCredential(a)).toBe('same-value')
    expect(decryptCredential(b)).toBe('same-value')
  })

  it('fails closed on a garbage/tampered ciphertext', async () => {
    const { decryptCredential } = await import('./credential-crypto')
    expect(() => decryptCredential('not.a.validciphertext')).toThrow()
  })

  it('fails closed when the format is missing its three parts', async () => {
    const { decryptCredential } = await import('./credential-crypto')
    expect(() => decryptCredential('only-one-part')).toThrow(/iv\.authTag\.ciphertext/)
  })

  it('throws a clear error when BUILDER_CREDENTIAL_ENCRYPTION_KEY is not set', async () => {
    delete process.env.BUILDER_CREDENTIAL_ENCRYPTION_KEY
    const { encryptCredential } = await import('./credential-crypto')
    expect(() => encryptCredential('x')).toThrow(/BUILDER_CREDENTIAL_ENCRYPTION_KEY is not set/)
  })
})
