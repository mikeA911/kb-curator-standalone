import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type { GatewayToolContext } from './discovery'

const connectAndCallToolMock = vi.fn()
vi.mock('./client', () => ({ connectAndCallTool: (...args: unknown[]) => connectAndCallToolMock(...args) }))

const resolveCredentialsMock = vi.fn().mockResolvedValue([])
vi.mock('./credentials', () => ({ resolveCredentials: (...args: unknown[]) => resolveCredentialsMock(...args) }))

const confirmApprovalMock = vi.fn()
const confirmCancellationMock = vi.fn()
vi.mock('./orderlunch-confirmation', () => ({
  confirmApproval: (...args: unknown[]) => confirmApprovalMock(...args),
  confirmCancellation: (...args: unknown[]) => confirmCancellationMock(...args),
}))

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createAdminClientMock() }))

const { runGatewayToolCall, executeConfirmedInvocation, cancelInvocation } = await import('./execute')

beforeEach(() => {
  connectAndCallToolMock.mockReset()
  resolveCredentialsMock.mockReset().mockResolvedValue([])
  confirmApprovalMock.mockReset()
  confirmCancellationMock.mockReset()
  createAdminClientMock.mockReset()
})

function fakeCtx(supabase: ReturnType<typeof createFakeSupabase>, overrides: Partial<{ userId: string; role: string }> = {}): WorkbenchCallerContext {
  return {
    user: { id: overrides.userId ?? 'user-1' },
    profile: { role: overrides.role ?? 'consultant' },
    supabase,
  } as unknown as WorkbenchCallerContext
}

function baseToolContext(overrides: Partial<GatewayToolContext> = {}): GatewayToolContext {
  return {
    integrationId: 'int-1',
    integrationSlug: 'orderlunch-mcp-showcase',
    versionId: 'ver-1',
    endpointUrl: 'https://orderlunch-mcp-showcase-production.up.railway.app/mcp',
    protocol: 'mcp',
    realToolName: 'cancel_order',
    riskClassification: 'consequential_write',
    credentialsPolicy: {},
    authMethod: 'delegated_user_identity',
    spendingLimits: {},
    approvalPolicy: {},
    callerUserId: 'user-1',
    projectId: 'proj-1',
    delegationRoles: ['consultant'],
    ...overrides,
  }
}

describe('runOrderLunchCancelOrder (via runGatewayToolCall)', () => {
  it('ignores any model-supplied confirmationId and always mints one via the trusted REST call', async () => {
    confirmCancellationMock.mockResolvedValue({ confirmationId: 'real-confirmation-id' })
    const supabase = createFakeSupabase({})
    const admin = createFakeSupabase({
      builder_integration_invocations: [{ data: { id: 'pending-row-1' }, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    const outcome = await runGatewayToolCall(fakeCtx(supabase), {
      projectId: 'proj-1',
      conversationId: 'conv-1',
      toolContext: baseToolContext(),
      // A model trying to smuggle its own confirmationId -- must be ignored.
      input: { orderId: 'order-1', confirmationId: 'model-supplied-fake-id' },
    })

    expect(confirmCancellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      'delegated_user_identity',
      expect.objectContaining({ userId: 'user-1', projectId: 'proj-1' }),
      'order-1'
    )
    const insertCall = admin._calls.find((c) => c.table === 'builder_integration_invocations' && c.method === 'insert')
    expect(insertCall?.args).toMatchObject({
      tool_name: 'confirm_order_cancellation',
      status: 'proposed',
      input: { orderId: 'order-1', confirmationId: 'real-confirmation-id' },
    })
    expect(connectAndCallToolMock).not.toHaveBeenCalled() // cancel_order itself never called yet -- only on confirm
    expect(outcome.pending?.invocationId).toBe('pending-row-1')
  })

  it('throws before calling anything remote when orderId is missing', async () => {
    const supabase = createFakeSupabase({})
    createAdminClientMock.mockReturnValue(createFakeSupabase({}))

    await expect(
      runGatewayToolCall(fakeCtx(supabase), {
        projectId: 'proj-1',
        conversationId: 'conv-1',
        toolContext: baseToolContext(),
        input: {},
      })
    ).rejects.toThrow('cancel_order requires an orderId')
    expect(confirmCancellationMock).not.toHaveBeenCalled()
  })
})

describe('executeConfirmedInvocation -- OrderLunch confirm_order_placement branch', () => {
  it('calls the REST approval-confirm before place_order, and always mints a fresh server-side idempotency key', async () => {
    const supabase = createFakeSupabase({
      project_members: [{ data: { role: 'owner' }, error: null }],
    })
    const admin = createFakeSupabase({
      builder_integration_invocations: [
        {
          data: {
            id: 'inv-1',
            status: 'proposed',
            project_id: 'proj-1',
            tool_name: 'confirm_order_placement',
            input: { approvalId: 'approval-1', quoteHash: 'hash-1', totalMinor: 42000 },
            builder_integration_id: 'int-1',
            builder_integration_version_id: 'ver-1',
            correlated_amount: null,
          },
          error: null,
        },
      ],
      builder_integrations: [{ data: { endpoint_url: 'https://orderlunch-mcp-showcase-production.up.railway.app/mcp' }, error: null }],
      builder_integration_versions: [{ data: { credentials_policy: {}, auth_method: 'delegated_user_identity', spending_limits: {} }, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)
    confirmApprovalMock.mockResolvedValue({})
    connectAndCallToolMock.mockResolvedValue({ orderId: 'order-1', status: 'placed' })

    const callOrder: string[] = []
    confirmApprovalMock.mockImplementation(async () => {
      callOrder.push('confirm')
      return {}
    })
    connectAndCallToolMock.mockImplementation(async () => {
      callOrder.push('place_order')
      return { orderId: 'order-1', status: 'placed' }
    })

    await executeConfirmedInvocation(fakeCtx(supabase, { userId: 'owner-1', role: 'consultant' }), 'inv-1')

    expect(callOrder).toEqual(['confirm', 'place_order'])
    expect(confirmApprovalMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      'delegated_user_identity',
      expect.anything(),
      'approval-1',
      'hash-1'
    )

    const placeOrderCall = connectAndCallToolMock.mock.calls[0]
    expect(placeOrderCall[2]).toBe('place_order')
    const placeOrderInput = placeOrderCall[3] as { approvalId: string; idempotencyKey: string }
    expect(placeOrderInput.approvalId).toBe('approval-1')
    // Server-generated -- a real UUID, never anything from the stored invocation input (which never had an idempotencyKey at all).
    expect(placeOrderInput.idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('never calls place_order when the REST confirm rejects', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: { role: 'owner' }, error: null }] })
    const admin = createFakeSupabase({
      builder_integration_invocations: [
        {
          data: {
            id: 'inv-2',
            status: 'proposed',
            project_id: 'proj-1',
            tool_name: 'confirm_order_placement',
            input: { approvalId: 'approval-2', quoteHash: 'hash-2' },
            builder_integration_id: 'int-1',
            builder_integration_version_id: 'ver-1',
            correlated_amount: null,
          },
          error: null,
        },
      ],
      builder_integrations: [{ data: { endpoint_url: 'https://orderlunch-mcp-showcase-production.up.railway.app/mcp' }, error: null }],
      builder_integration_versions: [{ data: { credentials_policy: {}, auth_method: 'delegated_user_identity', spending_limits: {} }, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)
    confirmApprovalMock.mockRejectedValue(new Error('Approval is expired'))

    const result = await executeConfirmedInvocation(fakeCtx(supabase, { userId: 'owner-1' }), 'inv-2')

    expect(result.error).toBe('Approval is expired')
    expect(connectAndCallToolMock).not.toHaveBeenCalled()
  })

  it('refuses to confirm when quoteHash is missing from the stored invocation, rather than sending an empty/omitted value', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: { role: 'owner' }, error: null }] })
    const admin = createFakeSupabase({
      builder_integration_invocations: [
        {
          data: {
            id: 'inv-3',
            status: 'proposed',
            project_id: 'proj-1',
            tool_name: 'confirm_order_placement',
            input: { approvalId: 'approval-3' }, // no quoteHash
            builder_integration_id: 'int-1',
            builder_integration_version_id: 'ver-1',
            correlated_amount: null,
          },
          error: null,
        },
      ],
      builder_integrations: [{ data: { endpoint_url: 'https://orderlunch-mcp-showcase-production.up.railway.app/mcp' }, error: null }],
      builder_integration_versions: [{ data: { credentials_policy: {}, auth_method: 'delegated_user_identity', spending_limits: {} }, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    const result = await executeConfirmedInvocation(fakeCtx(supabase, { userId: 'owner-1' }), 'inv-3')

    expect(result.error).toBe('This confirmation is missing its quoteHash')
    expect(confirmApprovalMock).not.toHaveBeenCalled()
    expect(connectAndCallToolMock).not.toHaveBeenCalled()
  })
})

// The original "awaiting_human_confirmation" tool-result message persisted
// when the call was first proposed is otherwise frozen forever -- without
// this, the model reloads that same stale placeholder as its own context on
// every later turn and never learns a human already resolved it. Caught
// live 2026-09-04: a real user stuck in a loop where Ember kept asking for
// re-confirmation of an already-confirmed menu lookup.
describe('confirming/cancelling a Gateway invocation syncs the persisted chat_messages row', () => {
  function baseInvocation(overrides: Record<string, unknown> = {}) {
    return {
      id: 'inv-sync-1',
      status: 'proposed',
      project_id: 'proj-1',
      conversation_id: 'conv-1',
      tool_name: 'browse_menu',
      input: { outletId: 'bento-sim' },
      builder_integration_id: 'int-1',
      builder_integration_version_id: 'ver-1',
      correlated_amount: null,
      ...overrides,
    }
  }

  it('on successful execution, overwrites the matching chat_messages row with the real result', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: { role: 'owner' }, error: null }] })
    const admin = createFakeSupabase({
      builder_integration_invocations: [{ data: baseInvocation(), error: null }],
      builder_integrations: [{ data: { endpoint_url: 'https://orderlunch-mcp-showcase-production.up.railway.app/mcp' }, error: null }],
      builder_integration_versions: [{ data: { credentials_policy: {}, auth_method: 'delegated_user_identity', spending_limits: {} }, error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)
    connectAndCallToolMock.mockResolvedValue([{ id: 'bento-chicken', name: 'Chicken Bento' }])

    await executeConfirmedInvocation(fakeCtx(supabase, { userId: 'owner-1' }), 'inv-sync-1')

    const messageUpdate = admin._calls.find((c) => c.table === 'chat_messages' && c.method === 'update')
    expect(messageUpdate).toBeDefined()
    const content = JSON.parse((messageUpdate!.args as { content: string }).content)
    expect(content).toMatchObject({ status: 'confirmed_and_executed', result: [{ id: 'bento-chicken', name: 'Chicken Bento' }] })
    // Located by conversation_id + role 'tool' + this invocation's id embedded
    // in the original message, never a blanket update.
    const eqCalls = admin._calls.filter((c) => c.method === 'eq')
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        { table: 'chat_messages', method: 'eq', args: { column: 'conversation_id', value: 'conv-1' } },
        { table: 'chat_messages', method: 'eq', args: { column: 'role', value: 'tool' } },
      ])
    )
  })

  it('on cancellation, overwrites the matching chat_messages row with cancelled_by_user', async () => {
    const supabase = createFakeSupabase({ project_members: [{ data: { role: 'owner' }, error: null }] })
    const admin = createFakeSupabase({
      builder_integration_invocations: [{ data: baseInvocation({ id: 'inv-sync-2' }), error: null }],
    })
    createAdminClientMock.mockReturnValue(admin)

    await cancelInvocation(fakeCtx(supabase, { userId: 'owner-1' }), 'inv-sync-2')

    const messageUpdate = admin._calls.find((c) => c.table === 'chat_messages' && c.method === 'update')
    expect(messageUpdate).toBeDefined()
    const content = JSON.parse((messageUpdate!.args as { content: string }).content)
    expect(content).toMatchObject({ status: 'cancelled_by_user' })
  })
})
