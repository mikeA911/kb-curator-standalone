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

  const fields = invocation.confirmationFields?.length
    ? invocation.confirmationFields.filter((f) => f in invocation.input).map((f) => [f, invocation.input[f]] as const)
    : Object.entries(invocation.input)

  return (
    <div className="mt-2 flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-medium text-amber-900">
        Confirm: {invocation.toolName.replace(/_/g, ' ')} <span className="font-normal text-amber-700">({invocation.integrationSlug})</span>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-amber-800">
        {fields.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="font-medium">{key}</dt>
            <dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
          </div>
        ))}
      </dl>

      {!result && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={confirm}
            className="rounded bg-amber-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Working…' : 'Confirm'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={cancel}
            className="rounded border border-amber-300 px-3 py-1 text-xs font-medium text-amber-800 disabled:opacity-50"
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
