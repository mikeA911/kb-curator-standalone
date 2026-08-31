import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Best-effort spending-limit correlation, not a general solution -- see the
// plan's own design note. Works when a quote/read tool (e.g. prepare_order)
// returns a total/amount-shaped numeric field, and a later write tool's
// input shares an id-shaped field (e.g. orderId) with that same quote. An
// integration whose tools don't share an id this way simply can't be
// amount-checked here; the human reviewing the confirmation card is the
// real backstop in that case, not this function.

const EXACT_AMOUNT_FIELD_PATTERN = /^(total|amount)$/i
const FUZZY_AMOUNT_FIELD_PATTERN = /total|amount/i
const ID_FIELD_PATTERN = /(^id$|Id$)/

// An exact key match ('total'/'amount') always wins over a substring match
// ('subtotal', 'totalAmount', ...) regardless of object key order --
// mock-lunch-agent's own prepare_order result has both `subtotal` (before
// delivery) and `total` (the real, spending-limit-relevant figure) on the
// same object, and Object.entries iterates in insertion order, so a plain
// substring scan can silently pick the smaller subtotal first. Only falls
// back to the fuzzy match when no exact 'total'/'amount' field exists.
export function extractCorrelatedAmount(output: unknown): number | null {
  if (!output || typeof output !== 'object') return null
  const entries = Object.entries(output as Record<string, unknown>)
  for (const [key, value] of entries) {
    if (EXACT_AMOUNT_FIELD_PATTERN.test(key) && typeof value === 'number') return value
  }
  for (const [key, value] of entries) {
    if (FUZZY_AMOUNT_FIELD_PATTERN.test(key) && typeof value === 'number') return value
  }
  return null
}

function extractCorrelationValue(input: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(input)) {
    if (ID_FIELD_PATTERN.test(key) && typeof value === 'string') return value
  }
  return null
}

function outputContainsValue(output: unknown, value: string): boolean {
  if (!output || typeof output !== 'object') return false
  return Object.values(output as Record<string, unknown>).some((v) => v === value)
}

export interface SpendingLimitCheck {
  ok: boolean
  reason?: string
  correlatedAmount: number | null
}

export async function checkSpendingLimit(
  supabase: SupabaseClient<Database>,
  params: {
    integrationId: string
    projectId: string
    spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
    toolInput: Record<string, unknown>
  }
): Promise<SpendingLimitCheck> {
  const { integrationId, projectId, spendingLimits, toolInput } = params
  if (!spendingLimits.perOrderMax && !spendingLimits.dailyMax) return { ok: true, correlatedAmount: null }

  const correlationValue = extractCorrelationValue(toolInput)
  let correlatedAmount: number | null = null

  if (correlationValue) {
    // Bounded scan of recent rows for this project+integration -- avoids a
    // dynamic jsonb-path query for a key name we don't know ahead of time.
    const { data: recent, error } = await supabase
      .from('builder_integration_invocations')
      .select('output')
      .eq('builder_integration_id', integrationId)
      .eq('project_id', projectId)
      .eq('status', 'executed')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    for (const row of recent ?? []) {
      const amount = outputContainsValue(row.output, correlationValue) ? extractCorrelatedAmount(row.output) : null
      if (amount !== null) {
        correlatedAmount = amount
        break
      }
    }
  }

  if (correlatedAmount === null) {
    // Couldn't establish an amount -- don't hard-block; the human reviewing
    // the confirmation card's raw JSON is the real backstop here.
    return { ok: true, correlatedAmount: null }
  }

  if (spendingLimits.perOrderMax && correlatedAmount > spendingLimits.perOrderMax) {
    return {
      ok: false,
      correlatedAmount,
      reason: `Proposed amount ${correlatedAmount} exceeds this integration's per-order limit of ${spendingLimits.perOrderMax}${spendingLimits.currency ? ` ${spendingLimits.currency}` : ''}`,
    }
  }

  if (spendingLimits.dailyMax) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data: today, error: todayError } = await supabase
      .from('builder_integration_invocations')
      .select('correlated_amount')
      .eq('builder_integration_id', integrationId)
      .eq('project_id', projectId)
      .eq('status', 'executed')
      .gte('created_at', startOfDay.toISOString())
    if (todayError) throw todayError
    const spentToday = (today ?? []).reduce((sum, row) => sum + (row.correlated_amount ?? 0), 0)
    if (spentToday + correlatedAmount > spendingLimits.dailyMax) {
      return {
        ok: false,
        correlatedAmount,
        reason: `Proposed amount ${correlatedAmount} would exceed this integration's daily limit of ${spendingLimits.dailyMax}${spendingLimits.currency ? ` ${spendingLimits.currency}` : ''} (already spent ${spentToday} today)`,
      }
    }
  }

  return { ok: true, correlatedAmount }
}
