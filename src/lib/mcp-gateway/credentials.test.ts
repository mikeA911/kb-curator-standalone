import { describe, it, expect, afterEach } from 'vitest'
import { jwtVerify } from 'jose'
import { resolveCredentials, GatewayCredentialError } from './credentials'

const ENV_VAR = 'GATEWAY_TEST_CREDENTIAL'
const SECRET_ENV_VAR = 'GATEWAY_TEST_DELEGATION_SECRET'
const API_KEY_ENV_VAR = 'GATEWAY_TEST_API_KEY'

describe('resolveCredentials', () => {
  afterEach(() => {
    delete process.env[ENV_VAR]
    delete process.env[SECRET_ENV_VAR]
    delete process.env[API_KEY_ENV_VAR]
  })

  it('returns an empty header list when auth_method is none', async () => {
    expect(await resolveCredentials({}, 'none')).toEqual([])
  })

  it('returns an empty header list when auth_method is not set at all', async () => {
    expect(await resolveCredentials({}, null)).toEqual([])
  })

  it('throws when a non-none, non-delegated auth_method has no credentials_policy.name to resolve', async () => {
    await expect(resolveCredentials({}, 'service_identity')).rejects.toBeInstanceOf(GatewayCredentialError)
  })

  it('throws when the referenced env var is not set', async () => {
    await expect(resolveCredentials({ name: ENV_VAR }, 'service_identity')).rejects.toBeInstanceOf(GatewayCredentialError)
  })

  it('resolves a Bearer auth header from the referenced env var when set', async () => {
    process.env[ENV_VAR] = 'super-secret-token'
    expect(await resolveCredentials({ name: ENV_VAR }, 'service_identity')).toEqual([{ header: 'Authorization', value: 'Bearer super-secret-token' }])
  })

  describe('delegated_user_identity', () => {
    it('throws when no delegation context (caller/Project) was provided', async () => {
      await expect(
        resolveCredentials({ delegationSecretEnvVar: SECRET_ENV_VAR, delegationIssuer: 'https://kbsandbox.tech', delegationAudience: 'orderlunch-mcp' }, 'delegated_user_identity')
      ).rejects.toBeInstanceOf(GatewayCredentialError)
    })

    it('throws when credentials_policy is missing delegation config', async () => {
      await expect(
        resolveCredentials({}, 'delegated_user_identity', { userId: 'user-1', projectId: 'proj-1', tools: ['get_menu'], roles: ['consultant'] })
      ).rejects.toBeInstanceOf(GatewayCredentialError)
    })

    it('mints a real, verifiable JWT carrying the expected claims', async () => {
      process.env[SECRET_ENV_VAR] = 'a-test-signing-secret'
      const headers = await resolveCredentials(
        { delegationSecretEnvVar: SECRET_ENV_VAR, delegationIssuer: 'https://kbsandbox.tech', delegationAudience: 'orderlunch-mcp' },
        'delegated_user_identity',
        { userId: 'user-1', projectId: 'proj-1', tools: ['place_order'], roles: ['consultant'] }
      )
      expect(headers).toHaveLength(1)
      expect(headers[0].header).toBe('Authorization')
      const token = headers[0].value.replace('Bearer ', '')

      const { payload } = await jwtVerify(token, new TextEncoder().encode('a-test-signing-secret'), {
        issuer: 'https://kbsandbox.tech',
        audience: 'orderlunch-mcp',
      })
      expect(payload.sub).toBe('user-1')
      expect(payload.project_id).toBe('proj-1')
      expect(payload.tools).toEqual(['place_order'])
      expect(payload.roles).toEqual(['consultant'])
      expect(payload.jti).toEqual(expect.any(String))
      expect((payload.exp as number) - (payload.iat as number)).toBe(90)
    })

    it('rejects a token signed with the wrong secret', async () => {
      process.env[SECRET_ENV_VAR] = 'a-test-signing-secret'
      const headers = await resolveCredentials(
        { delegationSecretEnvVar: SECRET_ENV_VAR, delegationIssuer: 'https://kbsandbox.tech', delegationAudience: 'orderlunch-mcp' },
        'delegated_user_identity',
        { userId: 'user-1', projectId: 'proj-1', tools: [], roles: [] }
      )
      const token = headers[0].value.replace('Bearer ', '')
      await expect(
        jwtVerify(token, new TextEncoder().encode('a-different-secret'), { issuer: 'https://kbsandbox.tech', audience: 'orderlunch-mcp' })
      ).rejects.toThrow()
    })

    it('adds a second, static gateway-API-key header only when the policy declares one', async () => {
      process.env[SECRET_ENV_VAR] = 'a-test-signing-secret'
      process.env[API_KEY_ENV_VAR] = 'a-test-gateway-key'
      const headers = await resolveCredentials(
        {
          delegationSecretEnvVar: SECRET_ENV_VAR,
          delegationIssuer: 'https://kbsandbox.tech',
          delegationAudience: 'orderlunch-mcp',
          gatewayApiKeyHeaderEnvVar: API_KEY_ENV_VAR,
        },
        'delegated_user_identity',
        { userId: 'user-1', projectId: 'proj-1', tools: [], roles: [] }
      )
      expect(headers).toHaveLength(2)
      expect(headers[1]).toEqual({ header: 'x-gateway-api-key', value: 'a-test-gateway-key' })
    })

    it('throws when the declared gateway-API-key env var is unset', async () => {
      process.env[SECRET_ENV_VAR] = 'a-test-signing-secret'
      await expect(
        resolveCredentials(
          {
            delegationSecretEnvVar: SECRET_ENV_VAR,
            delegationIssuer: 'https://kbsandbox.tech',
            delegationAudience: 'orderlunch-mcp',
            gatewayApiKeyHeaderEnvVar: API_KEY_ENV_VAR,
          },
          'delegated_user_identity',
          { userId: 'user-1', projectId: 'proj-1', tools: [], roles: [] }
        )
      ).rejects.toBeInstanceOf(GatewayCredentialError)
    })
  })
})
