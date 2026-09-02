import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const connectAndListToolsMock = vi.fn()
vi.mock('./client', () => ({ connectAndListTools: (...args: unknown[]) => connectAndListToolsMock(...args) }))

const { listAvailableTools, makeGatewayToolName, parseGatewayToolName } = await import('./discovery')

beforeEach(() => {
  connectAndListToolsMock.mockReset()
})

describe('makeGatewayToolName / parseGatewayToolName', () => {
  it('round-trips an integration slug and real tool name', () => {
    const name = makeGatewayToolName('orderlunch-mcp-server', 'place_order')
    expect(name).toBe('gw__orderlunch-mcp-server__place_order')
    expect(parseGatewayToolName(name)).toEqual({ integrationSlug: 'orderlunch-mcp-server', realToolName: 'place_order' })
  })

  it('returns null for a non-Gateway tool name', () => {
    expect(parseGatewayToolName('search_wiki')).toBeNull()
  })
})

describe('listAvailableTools', () => {
  it('returns nothing and makes no further queries when the Project has no granted integrations', async () => {
    const fakeSupabase = createFakeSupabase({ builder_integration_project_availability: [{ data: [], error: null }] })
    const result = await listAvailableTools(fakeSupabase as never, 'proj-1', { userId: 'user-1', platformRole: 'consultant' })
    expect(result.toolSpecs).toEqual([])
    expect(connectAndListToolsMock).not.toHaveBeenCalled()
  })

  it('discovers and namespaces tools from a qualifying, reachable integration', async () => {
    connectAndListToolsMock.mockResolvedValue([
      { name: 'get_menu', description: 'Get the menu', inputSchema: { type: 'object' } },
      { name: 'place_order', description: 'Place an order', inputSchema: { type: 'object' } },
    ])
    const fakeSupabase = createFakeSupabase({
      builder_integration_project_availability: [{ data: [{ builder_integration_id: 'int-1' }], error: null }],
      builder_integrations: [
        {
          data: [{ id: 'int-1', slug: 'orderlunch-mcp', protocol: 'mcp', endpoint_url: 'http://localhost:8787/mcp', active_version_id: 'v1', status: 'active' }],
          error: null,
        },
      ],
      builder_integration_versions: [
        {
          data: [
            {
              id: 'v1',
              builder_integration_id: 'int-1',
              risk_classification: 'consequential_write',
              credentials_policy: {},
              auth_method: null,
              spending_limits: { perOrderMax: 500 },
              approval_policy: {},
              certification_status: 'sandbox_tested',
            },
          ],
          error: null,
        },
      ],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })

    const result = await listAvailableTools(fakeSupabase as never, 'proj-1', { userId: 'user-1', platformRole: 'consultant' })

    expect(result.toolSpecs.map((t) => t.name)).toEqual(['gw__orderlunch-mcp__get_menu', 'gw__orderlunch-mcp__place_order'])
    const getMenuContext = result.contextByToolName.get('gw__orderlunch-mcp__get_menu')
    expect(getMenuContext).toMatchObject({ integrationId: 'int-1', realToolName: 'get_menu', riskClassification: 'read_only' })
    const placeOrderContext = result.contextByToolName.get('gw__orderlunch-mcp__place_order')
    expect(placeOrderContext).toMatchObject({ realToolName: 'place_order', riskClassification: 'consequential_write' })
  })

  it('skips a version whose integration was excluded upstream (e.g. wrong status/no endpoint) without throwing', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_project_availability: [{ data: [{ builder_integration_id: 'int-1' }], error: null }],
      builder_integrations: [{ data: [], error: null }], // simulates the status='active'/endpoint_url-not-null filter excluding it
      builder_integration_versions: [{ data: [], error: null }],
    })
    const result = await listAvailableTools(fakeSupabase as never, 'proj-1', { userId: 'user-1', platformRole: 'consultant' })
    expect(result.toolSpecs).toEqual([])
    expect(connectAndListToolsMock).not.toHaveBeenCalled()
  })

  it('skips an unreachable integration rather than failing the whole discovery call', async () => {
    connectAndListToolsMock.mockRejectedValue(new Error('ECONNREFUSED'))
    const fakeSupabase = createFakeSupabase({
      builder_integration_project_availability: [{ data: [{ builder_integration_id: 'int-1' }], error: null }],
      builder_integrations: [
        { data: [{ id: 'int-1', slug: 'down-server', protocol: 'mcp', endpoint_url: 'http://localhost:9999/mcp', active_version_id: 'v1', status: 'active' }], error: null },
      ],
      builder_integration_versions: [
        {
          data: [
            {
              id: 'v1',
              builder_integration_id: 'int-1',
              risk_classification: 'read_only',
              credentials_policy: {},
              auth_method: null,
              spending_limits: {},
              approval_policy: {},
              certification_status: 'sandbox_tested',
            },
          ],
          error: null,
        },
      ],
      project_members: [{ data: { role: 'consultant' }, error: null }],
    })

    const result = await listAvailableTools(fakeSupabase as never, 'proj-1', { userId: 'user-1', platformRole: 'consultant' })
    expect(result.toolSpecs).toEqual([])
  })

  it('excludes a test-operator-only tool from a non-admin caller, but includes it for a platform admin who is also a Project member', async () => {
    const integrationRows = {
      builder_integration_project_availability: [{ data: [{ builder_integration_id: 'int-1' }], error: null }],
      builder_integrations: [
        { data: [{ id: 'int-1', slug: 'orderlunch-mcp', protocol: 'mcp', endpoint_url: 'http://localhost:8787/mcp', active_version_id: 'v1', status: 'active' }], error: null },
      ],
      builder_integration_versions: [
        {
          data: [
            {
              id: 'v1',
              builder_integration_id: 'int-1',
              risk_classification: 'read_only',
              credentials_policy: {},
              auth_method: null,
              spending_limits: {},
              approval_policy: {},
              certification_status: 'sandbox_tested',
            },
          ],
          error: null,
        },
      ],
    }
    connectAndListToolsMock.mockResolvedValue([
      { name: 'get_menu', description: 'Get the menu' },
      { name: 'advance_order_state', description: 'Test-only: advance an order to the next state' },
    ])

    const nonAdmin = createFakeSupabase({ ...integrationRows, project_members: [{ data: { role: 'consultant' }, error: null }] })
    const nonAdminResult = await listAvailableTools(nonAdmin as never, 'proj-1', { userId: 'user-1', platformRole: 'consultant' })
    expect(nonAdminResult.toolSpecs.map((t) => t.name)).toEqual(['gw__orderlunch-mcp__get_menu'])

    const adminMember = createFakeSupabase({ ...integrationRows, project_members: [{ data: { role: 'consultant' }, error: null }] })
    const adminResult = await listAvailableTools(adminMember as never, 'proj-1', { userId: 'admin-1', platformRole: 'admin' })
    expect(adminResult.toolSpecs.map((t) => t.name)).toEqual(['gw__orderlunch-mcp__get_menu', 'gw__orderlunch-mcp__advance_order_state'])
  })
})
