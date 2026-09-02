import 'server-only'
import type { AuthHeader } from './client'
import { resolveCredentials, type DelegationRequestContext } from './credentials'

// The live OrderLunch MCP Showcase's trusted confirmation boundary is
// deliberately NOT exposed as MCP tools -- POST /approvals/{id}/confirm and
// POST /orders/{id}/cancellation-confirmations only ever get called from
// here, server-side, never reachable from the model's own tool-call path
// (see execute.ts's request_order_approval/cancel_order special-casing).
//
// Body shape ({ confirmed: true }) confirmed live against the real approval-
// confirm endpoint (a bare {} or several other guesses returned 422
// INVALID_REQUEST "confirmation control was not accepted"; { confirmed:
// true } got past validation into a 409 business-logic response instead).
// The cancellation-confirmation endpoint's exact body was never reached
// live (blocked upstream -- see the confirmApproval comment below) --
// assumed identical to its sibling for now, flagged for re-verification
// once that's unblocked.
//
// Base URL is derived from the integration's own endpointUrl (strip the
// /mcp suffix) rather than hardcoded, so this stays reusable if a second
// REST-confirmation-boundary integration is ever registered.

export class OrderLunchConfirmationError extends Error {}

function restBaseUrl(mcpEndpointUrl: string): string {
  return new URL(mcpEndpointUrl).origin
}

async function restPost(url: string, auth: AuthHeader[], body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  for (const a of auth) headers[a.header] = a.value

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // Non-JSON error body -- parsed stays null, generic message below.
  }

  if (!res.ok) {
    const message = (parsed as { error?: { message?: string; code?: string } } | null)?.error?.message ?? `Confirmation request failed (HTTP ${res.status})`
    throw new OrderLunchConfirmationError(message)
  }
  return (parsed ?? {}) as Record<string, unknown>
}

// Live-verified as of this pass: known blocked by what looks like a genuine
// upstream bug -- every request_order_approval observed so far has an
// expiresAt only ~1 second after creation (not the ~10 minutes its own
// quote's expiry would suggest), so every real confirm attempt so far has
// returned 409 CONFLICT ("Approval is expired, already approved/used,
// outside this user/project, or does not match the quote") even when
// confirmed within roughly a second of creation. Flagged to the colleague
// who owns the Railway deployment; this function's shape (endpoint, method,
// body) is still believed correct, just not yet provably successful
// end-to-end.
export async function confirmApproval(
  mcpEndpointUrl: string,
  credentialsPolicy: Record<string, unknown>,
  authMethod: string | null,
  delegation: DelegationRequestContext,
  approvalId: string
): Promise<Record<string, unknown>> {
  const auth = await resolveCredentials(credentialsPolicy, authMethod, delegation)
  return restPost(`${restBaseUrl(mcpEndpointUrl)}/approvals/${approvalId}/confirm`, auth, { confirmed: true })
}

export async function confirmCancellation(
  mcpEndpointUrl: string,
  credentialsPolicy: Record<string, unknown>,
  authMethod: string | null,
  delegation: DelegationRequestContext,
  orderId: string
): Promise<{ confirmationId: string }> {
  const auth = await resolveCredentials(credentialsPolicy, authMethod, delegation)
  const result = await restPost(`${restBaseUrl(mcpEndpointUrl)}/orders/${orderId}/cancellation-confirmations`, auth, { confirmed: true })
  const confirmationId = typeof result.confirmationId === 'string' ? result.confirmationId : null
  if (!confirmationId) {
    throw new OrderLunchConfirmationError('Cancellation-confirmation endpoint did not return a confirmationId')
  }
  return { confirmationId }
}
