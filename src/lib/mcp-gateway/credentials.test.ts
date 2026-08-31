import { describe, it, expect, afterEach } from 'vitest'
import { resolveCredentials, GatewayCredentialError } from './credentials'

const ENV_VAR = 'GATEWAY_TEST_CREDENTIAL'

describe('resolveCredentials', () => {
  afterEach(() => {
    delete process.env[ENV_VAR]
  })

  it('returns null when auth_method is none', () => {
    expect(resolveCredentials({}, 'none')).toBeNull()
  })

  it('returns null when auth_method is not set at all', () => {
    expect(resolveCredentials({}, null)).toBeNull()
  })

  it('throws when a non-none auth_method has no credentials_policy.name to resolve', () => {
    expect(() => resolveCredentials({}, 'service_identity')).toThrow(GatewayCredentialError)
  })

  it('throws when the referenced env var is not set', () => {
    expect(() => resolveCredentials({ name: ENV_VAR }, 'service_identity')).toThrow(GatewayCredentialError)
  })

  it('resolves a Bearer auth header from the referenced env var when set', () => {
    process.env[ENV_VAR] = 'super-secret-token'
    expect(resolveCredentials({ name: ENV_VAR }, 'service_identity')).toEqual({ header: 'Authorization', value: 'Bearer super-secret-token' })
  })
})
