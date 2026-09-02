import { describe, it, expect, afterEach } from 'vitest'
import { jwtVerify } from 'jose'
import { mintDelegationToken, DelegationSigningError, computeDelegationRoles, isTestOperatorOnlyTool } from './delegation'

const SECRET_ENV_VAR = 'DELEGATION_TEST_SECRET'
const CONFIG = { secretEnvVar: SECRET_ENV_VAR, issuer: 'https://kbsandbox.tech', audience: 'orderlunch-mcp' }

describe('mintDelegationToken', () => {
  afterEach(() => {
    delete process.env[SECRET_ENV_VAR]
  })

  it('throws a clear, typed error when the signing secret env var is unset', async () => {
    await expect(
      mintDelegationToken({ userId: 'user-1', projectId: 'proj-1', tools: [], roles: [] }, CONFIG)
    ).rejects.toBeInstanceOf(DelegationSigningError)
  })

  it('produces a JWT that verifies against the configured secret/issuer/audience with a short expiry', async () => {
    process.env[SECRET_ENV_VAR] = 'a-test-signing-secret'
    const token = await mintDelegationToken({ userId: 'user-1', projectId: 'proj-1', tools: ['get_menu', 'place_order'], roles: ['consultant'] }, CONFIG)

    const { payload } = await jwtVerify(token, new TextEncoder().encode('a-test-signing-secret'), {
      issuer: 'https://kbsandbox.tech',
      audience: 'orderlunch-mcp',
    })
    expect(payload.sub).toBe('user-1')
    expect(payload.project_id).toBe('proj-1')
    expect(payload.tools).toEqual(['get_menu', 'place_order'])
    expect(payload.roles).toEqual(['consultant'])
    expect((payload.exp as number) - (payload.iat as number)).toBe(90)
  })

  it('mints a unique jti on every call, even for identical claims', async () => {
    process.env[SECRET_ENV_VAR] = 'a-test-signing-secret'
    const secretKey = new TextEncoder().encode('a-test-signing-secret')
    const [tokenA, tokenB] = await Promise.all([
      mintDelegationToken({ userId: 'user-1', projectId: 'proj-1', tools: [], roles: [] }, CONFIG),
      mintDelegationToken({ userId: 'user-1', projectId: 'proj-1', tools: [], roles: [] }, CONFIG),
    ])
    const [{ payload: a }, { payload: b }] = await Promise.all([
      jwtVerify(tokenA, secretKey, { issuer: CONFIG.issuer, audience: CONFIG.audience }),
      jwtVerify(tokenB, secretKey, { issuer: CONFIG.issuer, audience: CONFIG.audience }),
    ])
    expect(a.jti).not.toEqual(b.jti)
  })
})

describe('computeDelegationRoles', () => {
  it('includes the caller\'s own Project role when they have one', () => {
    expect(computeDelegationRoles({ projectRole: 'consultant', platformRole: 'consultant', isProjectMember: true })).toEqual(['consultant'])
  })

  it('omits test_operator for a platform admin who is not a member of the Project', () => {
    expect(computeDelegationRoles({ projectRole: null, platformRole: 'admin', isProjectMember: false })).toEqual([])
  })

  it('omits test_operator for a Project member who is not a platform admin', () => {
    expect(computeDelegationRoles({ projectRole: 'owner', platformRole: 'curator', isProjectMember: true })).toEqual(['owner'])
  })

  it('grants test_operator only when both a platform admin and an active Project member', () => {
    expect(computeDelegationRoles({ projectRole: 'consultant', platformRole: 'admin', isProjectMember: true })).toEqual(['consultant', 'test_operator'])
  })

  it('returns an empty list for a non-member with no platform role match', () => {
    expect(computeDelegationRoles({ projectRole: null, platformRole: 'consultant', isProjectMember: false })).toEqual([])
  })
})

describe('isTestOperatorOnlyTool', () => {
  it('flags advance_order_state', () => {
    expect(isTestOperatorOnlyTool('advance_order_state')).toBe(true)
  })

  it('does not flag an ordinary tool', () => {
    expect(isTestOperatorOnlyTool('place_order')).toBe(false)
  })
})
