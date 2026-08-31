import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { checkSpendingLimit, extractCorrelatedAmount } from './spending'

describe('extractCorrelatedAmount', () => {
  it('finds a total-shaped numeric field', () => {
    expect(extractCorrelatedAmount({ orderId: 'o1', total: 305, currency: 'PHP' })).toBe(305)
  })

  it('finds an amount-shaped numeric field', () => {
    expect(extractCorrelatedAmount({ amount: 42 })).toBe(42)
  })

  it('returns null when nothing matches', () => {
    expect(extractCorrelatedAmount({ status: 'ok' })).toBeNull()
    expect(extractCorrelatedAmount(null)).toBeNull()
    expect(extractCorrelatedAmount('not an object')).toBeNull()
  })

  it('prefers an exact total field over a subtotal that appears first, regardless of key order', () => {
    // Regression: mock-lunch-agent's own prepare_order result has subtotal
    // before total (subtotal, deliveryFee, total) -- a plain substring scan
    // over Object.entries insertion order previously matched 'subtotal'
    // (it contains 'total') before ever reaching the real 'total' field.
    expect(extractCorrelatedAmount({ orderId: 'o1', subtotal: 220, deliveryFee: 100, total: 320 })).toBe(320)
  })

  it('falls back to a fuzzy match (e.g. totalAmount) when no exact total/amount field exists', () => {
    expect(extractCorrelatedAmount({ totalAmount: 42 })).toBe(42)
  })
})

describe('checkSpendingLimit', () => {
  const baseParams = { integrationId: 'int-1', projectId: 'proj-1' }

  it('allows immediately when no spending limits are declared, with no DB call', async () => {
    const fakeSupabase = createFakeSupabase({})
    const result = await checkSpendingLimit(fakeSupabase as never, { ...baseParams, spendingLimits: {}, toolInput: { orderId: 'o1' } })
    expect(result).toEqual({ ok: true, correlatedAmount: null })
    expect(fakeSupabase._calls.length).toBe(0)
  })

  it('does not block when a perOrderMax is set but no correlation id is found in the input', async () => {
    const fakeSupabase = createFakeSupabase({})
    const result = await checkSpendingLimit(fakeSupabase as never, {
      ...baseParams,
      spendingLimits: { perOrderMax: 500 },
      toolInput: { note: 'no id field here' },
    })
    expect(result).toEqual({ ok: true, correlatedAmount: null })
  })

  it('rejects a proposal whose correlated amount exceeds perOrderMax', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_invocations: [{ data: [{ output: { orderId: 'o1', total: 999 } }], error: null }],
    })
    const result = await checkSpendingLimit(fakeSupabase as never, {
      ...baseParams,
      spendingLimits: { perOrderMax: 500, currency: 'PHP' },
      toolInput: { orderId: 'o1' },
    })
    expect(result.ok).toBe(false)
    expect(result.correlatedAmount).toBe(999)
    expect(result.reason).toMatch(/exceeds/)
  })

  it('allows a proposal whose correlated amount is within perOrderMax', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_invocations: [{ data: [{ output: { orderId: 'o1', total: 305 } }], error: null }],
    })
    const result = await checkSpendingLimit(fakeSupabase as never, {
      ...baseParams,
      spendingLimits: { perOrderMax: 500 },
      toolInput: { orderId: 'o1' },
    })
    expect(result).toEqual({ ok: true, correlatedAmount: 305 })
  })

  it('rejects when the correlated amount would push today\'s total over dailyMax', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_invocations: [
        { data: [{ output: { orderId: 'o1', total: 305 } }], error: null }, // recent-rows lookup for perOrderMax correlation
        { data: [{ correlated_amount: 800 }], error: null }, // today's executed rows for dailyMax
      ],
    })
    const result = await checkSpendingLimit(fakeSupabase as never, {
      ...baseParams,
      spendingLimits: { dailyMax: 1000 },
      toolInput: { orderId: 'o1' },
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/daily limit/)
  })
})
