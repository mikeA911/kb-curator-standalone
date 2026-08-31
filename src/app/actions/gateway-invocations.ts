'use server'

import { requireUser } from '@/lib/auth'
import { executeConfirmedInvocation, cancelInvocation } from '@/lib/mcp-gateway/execute'

// No revalidatePath here, deliberately -- ChatPanel's message list is
// client-managed state (populated from sendChatMessageAction's own return
// value, not re-derived from server props on each render), and
// GatewayInvocationCard renders its own confirmed/failed/cancelled result
// locally from this action's return value. A page revalidate wouldn't reach
// into that in-memory state anyway.

export async function confirmGatewayInvocationAction(invocationId: string) {
  const ctx = await requireUser()
  return executeConfirmedInvocation(ctx, invocationId)
}

export async function cancelGatewayInvocationAction(invocationId: string) {
  const ctx = await requireUser()
  await cancelInvocation(ctx, invocationId)
}
