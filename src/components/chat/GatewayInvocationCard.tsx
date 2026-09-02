'use client'

import { useState, useTransition } from 'react'
import type { PendingGatewayInvocation } from '@/lib/mcp-gateway/execute'
import { confirmGatewayInvocationAction, cancelGatewayInvocationAction } from '@/app/actions/gateway-invocations'

// Renders standalone under the assistant's reply (not inside the collapsed
// Details/Artifacts panel, unlike createdRecords chips) -- a pending action
// that spends money or otherwise writes to an external system deserves to
// be visible without an extra click to expand it. Self-contained: resolves
// its own confirmed/failed/cancelled result locally, same startTransition +
// try/catch shape as CertificationActions.tsx, but without router.refresh()
// -- ChatPanel's message list is client-managed state this card has no
// reason to touch.

// Must match execute.ts's ORDERLUNCH_CONFIRM_APPROVAL_TOOL/
// ORDERLUNCH_CONFIRM_CANCELLATION_TOOL exactly -- duplicated as plain string
// literals rather than imported, since execute.ts is server-only and this
// is a client component.
const ORDERLUNCH_CONFIRM_APPROVAL_TOOL = 'confirm_order_placement'
const ORDERLUNCH_CONFIRM_CANCELLATION_TOOL = 'confirm_order_cancellation'

function formatPhp(minor: unknown): string | null {
  if (typeof minor !== 'number') return null
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(minor / 100)
}

function formatExpiry(iso: unknown): string | null {
  if (typeof iso !== 'string') return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString()
}

interface OrderLunchItem {
  name?: string
  quantity?: number
  lineTotalMinor?: number
}

// The order-placement confirmation: everything the spec asks for --
// outlet, exact items/quantities, total in PHP, fulfilment method,
// "Pay upon delivery", and quote expiry -- read straight from
// request_order_approval's own real output (see execute.ts's
// runOrderLunchRequestApproval), not generic key/value dump.
function OrderPlacementFields({ input }: { input: Record<string, unknown> }) {
  const items = Array.isArray(input.items) ? (input.items as OrderLunchItem[]) : []
  const total = formatPhp(input.totalMinor)
  const expiry = formatExpiry(input.expiresAt)

  return (
    <dl className="flex flex-col gap-1 text-xs text-amber-800">
      <div>
        <dt className="inline font-medium">Outlet: </dt>
        <dd className="inline">{typeof input.outletId === 'string' ? input.outletId : '—'}</dd>
      </div>
      {items.length > 0 && (
        <div>
          <dt className="font-medium">Items:</dt>
          <dd>
            <ul className="ml-3 list-disc">
              {items.map((item, i) => (
                <li key={i}>
                  {item.quantity ?? '?'}× {item.name ?? 'Unknown item'}
                  {typeof item.lineTotalMinor === 'number' ? ` — ${formatPhp(item.lineTotalMinor)}` : ''}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      <div>
        <dt className="inline font-medium">Total: </dt>
        <dd className="inline font-semibold">{total ?? '—'}</dd>
      </div>
      <div>
        <dt className="inline font-medium">Fulfilment: </dt>
        <dd className="inline">{typeof input.fulfilment === 'string' ? input.fulfilment : '—'}</dd>
      </div>
      <div>
        <dt className="inline font-medium">Payment: </dt>
        <dd className="inline">{input.paymentTerms === 'pay_on_delivery' ? 'Pay upon delivery' : String(input.paymentTerms ?? '—')}</dd>
      </div>
      <div>
        <dt className="inline font-medium">Quote expires: </dt>
        <dd className="inline">{expiry ?? '—'}</dd>
      </div>
    </dl>
  )
}

export function GatewayInvocationCard({ invocation }: { invocation: PendingGatewayInvocation }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: 'confirmed'; output: unknown } | { status: 'cancelled' } | null>(null)

  function confirm() {
    setError(null)
    startTransition(async () => {
      const outcome = await confirmGatewayInvocationAction(invocation.invocationId)
      if (outcome.error) setError(outcome.error)
      else setResult({ status: 'confirmed', output: outcome.output })
    })
  }

  function cancel() {
    setError(null)
    startTransition(async () => {
      try {
        await cancelGatewayInvocationAction(invocation.invocationId)
        setResult({ status: 'cancelled' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel')
      }
    })
  }

  const isCancellation = invocation.toolName === ORDERLUNCH_CONFIRM_CANCELLATION_TOOL
  const isPlacement = invocation.toolName === ORDERLUNCH_CONFIRM_APPROVAL_TOOL

  const fields = invocation.confirmationFields?.length
    ? invocation.confirmationFields.filter((f) => f in invocation.input).map((f) => [f, invocation.input[f]] as const)
    : Object.entries(invocation.input)

  // Cancellation gets distinct copy and a warning (not the default amber)
  // treatment -- confirming it may undo something already placed, which
  // reads differently from every other gated action this card renders.
  const colors = isCancellation
    ? { border: 'border-red-300', bg: 'bg-red-50', title: 'text-red-900', sub: 'text-red-700', body: 'text-red-800', button: 'bg-red-800' }
    : { border: 'border-amber-300', bg: 'bg-amber-50', title: 'text-amber-900', sub: 'text-amber-700', body: 'text-amber-800', button: 'bg-amber-900' }

  return (
    <div className={`mt-2 flex flex-col gap-2 rounded border ${colors.border} ${colors.bg} p-3 text-sm`}>
      <p className={`font-medium ${colors.title}`}>
        {isCancellation ? 'Confirm: cancel this order' : isPlacement ? 'Confirm: place this order' : `Confirm: ${invocation.toolName.replace(/_/g, ' ')}`}{' '}
        <span className={`font-normal ${colors.sub}`}>({invocation.integrationSlug})</span>
      </p>
      {isCancellation && <p className={`text-xs ${colors.body}`}>This will cancel an order that may already be placed.</p>}

      {isPlacement ? (
        <OrderPlacementFields input={invocation.input} />
      ) : (
        <dl className={`grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs ${colors.body}`}>
          {fields.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-medium">{key}</dt>
              <dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {!result && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={confirm}
            className={`rounded ${colors.button} px-3 py-1 text-xs font-medium text-white disabled:opacity-50`}
          >
            {isPending ? 'Working…' : 'Confirm'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={cancel}
            className={`rounded border ${colors.border} px-3 py-1 text-xs font-medium ${colors.body} disabled:opacity-50`}
          >
            Cancel
          </button>
        </div>
      )}

      {result?.status === 'confirmed' && (
        <p className="text-xs text-emerald-800">Confirmed. Result: {JSON.stringify(result.output)}</p>
      )}
      {result?.status === 'cancelled' && <p className="text-xs text-zinc-600">Cancelled -- no action was taken.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
