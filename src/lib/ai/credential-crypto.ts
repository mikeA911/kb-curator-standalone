import 'server-only'
import crypto from 'node:crypto'
import { env } from '@/lib/env'

// Encrypts a builder-supplied LLM provider credential at rest -- the first
// real secret value this app stores (every other "external credential"
// pattern here, ai_providers.api_key_env_var and builder_integration_
// versions.credentials_policy/auth_method, is deliberately reference-only).
// Kept minimal: application-layer AES-256-GCM via Node's built-in crypto, no
// new Postgres extension (no pgsodium/Vault usage exists anywhere in this
// codebase to build on).
//
// BUILDER_CREDENTIAL_ENCRYPTION_KEY may be any non-empty string -- it's
// hashed with SHA-256 to derive a stable 32-byte AES key, rather than
// requiring an operator to supply an exact-length base64/hex value.
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

export class CredentialCryptoConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CredentialCryptoConfigError'
  }
}

function deriveKey(): Buffer {
  const raw = env.builderCredentialKey()
  if (!raw) {
    throw new CredentialCryptoConfigError(
      'BYOLLM is not configured on this deployment -- BUILDER_CREDENTIAL_ENCRYPTION_KEY is not set'
    )
  }
  return crypto.createHash('sha256').update(raw).digest()
}

// Result format: base64(iv) . base64(authTag) . base64(ciphertext) -- a
// single text column value, no separate columns needed for the nonce/tag.
export function encryptCredential(plaintext: string): string {
  const key = deriveKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.')
}

export function decryptCredential(encoded: string): string {
  const key = deriveKey()
  const parts = encoded.split('.')
  if (parts.length !== 3) {
    throw new CredentialCryptoConfigError('Stored credential is not in the expected iv.authTag.ciphertext format')
  }
  const [ivB64, authTagB64, ciphertextB64] = parts
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
  return plaintext.toString('utf8')
}
