import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import type { BuilderIntegrationRiskClassification } from '@/types/database'
import { connectAndCallTool } from './client'
import { resolveCredentials } from './credentials'
import { checkSpendingLimit, extractCorrelatedAmount } from './spending'
import { requiresConfirmation } from './risk'
import type { GatewayToolContext } from './discovery'

// The first code-level "propose, then confirm, then execute" gate in this
// codebase -- every other tool today only has a prompt-level confirmation
// instruction (see src/lib/chat/project-note-tool.ts's own comment). A
// read-only Gateway tool call still writes one audit row, but self-executes
// in the same turn (matches how every other read tool already behaves --
// no reason to add friction to a menu lookup). A gated call never touches
// the external server until a human explicitly confirms via
// executeConfirmedInvocation, called from
// src/app/actions/gateway-invocations.ts.

export interface PendingGatewayInvocation {
  invocationId: string
  toolName: string
  integrationSlug: string
  riskClassification: BuilderIntegrationRiskClassification
  input: Record<string, unknown>
  confirmationFields?: string[]
}

export interface GatewayCallOutcome {
  resultForModel: unknown
  pending?: PendingGatewayInvocation
}

export async function runGatewayToolCall(
  ctx: WorkbenchCallerContext,
  params: { projectId: string; conversationId: string; toolContext: GatewayToolContext; input: Record<string, unknown> }
): Promise<GatewayCallOutcome> {
  const { projectId, conversationId, toolContext, input } = params
  const admin = createAdminClient()

  if (!requiresConfirmation(toolContext.riskClassification)) {
    let output: unknown
    let errorMessage: string | null = null
    try {
      const auth = resolveCredentials(toolContext.credentialsPolicy, toolContext.authMethod)
      output = await connectAndCallTool(toolContext.endpointUrl, auth, toolContext.realToolName, input)
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
    }
    const { error: insertError } = await admin.from('builder_integration_invocations').insert({
      builder_integration_id: toolContext.integrationId,
      builder_integration_version_id: toolContext.versionId,
      project_id: projectId,
      conversation_id: conversationId,
      actor_id: ctx.user.id,
      tool_name: toolContext.realToolName,
      risk_classification: toolContext.riskClassification,
      input,
      output: errorMessage ? null : (output as Record<string, unknown>),
      status: errorMessage ? 'failed' : 'executed',
      error: errorMessage,
      correlated_amount: errorMessage ? null : extractCorrelatedAmount(output),
      executed_at: new Date().toISOString(),
    })
    if (insertError) throw insertError
    if (errorMessage) throw new Error(errorMessage)
    return { resultForModel: output }
  }

  const spendingCheck = await checkSpendingLimit(ctx.supabase, {
    integrationId: toolContext.integrationId,
    projectId,
    spendingLimits: toolContext.spendingLimits,
    toolInput: input,
  })
  if (!spendingCheck.ok) {
    return { resultForModel: { status: 'rejected', reason: spendingCheck.reason } }
  }

  const { data: proposed, error: proposeError } = await admin
    .from('builder_integration_invocations')
    .insert({
      builder_integration_id: toolContext.integrationId,
      builder_integration_version_id: toolContext.versionId,
      project_id: projectId,
      conversation_id: conversationId,
      actor_id: ctx.user.id,
      tool_name: toolContext.realToolName,
      risk_classification: toolContext.riskClassification,
      input,
      status: 'proposed',
      correlated_amount: spendingCheck.correlatedAmount,
    })
    .select('id')
    .single()
  if (proposeError || !proposed) throw proposeError ?? new Error('Failed to record proposed Gateway action')

  return {
    resultForModel: {
      status: 'awaiting_human_confirmation',
      invocationId: proposed.id,
      message:
        'This action requires explicit human confirmation before it executes. Tell the user what you are about to do and that a confirmation card has appeared for them to approve or cancel -- do not claim the action has already happened.',
    },
    pending: {
      invocationId: proposed.id,
      toolName: toolContext.realToolName,
      integrationSlug: toolContext.integrationSlug,
      riskClassification: toolContext.riskClassification,
      input,
      confirmationFields: toolContext.approvalPolicy.confirmationFields,
    },
  }
}

interface ExecuteResult {
  output?: unknown
  error?: string
}

async function requireProjectAccess(ctx: WorkbenchCallerContext, projectId: string): Promise<void> {
  if (ctx.profile.role === 'curator' || ctx.profile.role === 'admin') return
  const { data: membership } = await ctx.supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', ctx.user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) throw new Error('Not authorized to act on this Gateway invocation')
}

export async function executeConfirmedInvocation(ctx: WorkbenchCallerContext, invocationId: string): Promise<ExecuteResult> {
  const admin = createAdminClient()
  const { data: invocation, error } = await admin.from('builder_integration_invocations').select('*').eq('id', invocationId).single()
  if (error || !invocation) throw error ?? new Error('Gateway invocation not found')
  if (invocation.status !== 'proposed') throw new Error(`This action is no longer pending confirmation (status: ${invocation.status})`)

  await requireProjectAccess(ctx, invocation.project_id)

  const { data: integration } = await admin.from('builder_integrations').select('endpoint_url').eq('id', invocation.builder_integration_id).single()
  const { data: version } = await admin
    .from('builder_integration_versions')
    .select('credentials_policy, auth_method, spending_limits')
    .eq('id', invocation.builder_integration_version_id)
    .single()
  if (!integration?.endpoint_url || !version) throw new Error('This integration is no longer available')

  // Defends against a race between propose-time and confirm-time (another
  // order placed in between) -- re-checked, not just trusted from earlier.
  const spendingCheck = await checkSpendingLimit(admin, {
    integrationId: invocation.builder_integration_id,
    projectId: invocation.project_id,
    spendingLimits: version.spending_limits,
    toolInput: invocation.input,
  })
  if (!spendingCheck.ok) {
    await admin
      .from('builder_integration_invocations')
      .update({ status: 'failed', error: spendingCheck.reason, confirmed_at: new Date().toISOString(), confirmed_by: ctx.user.id })
      .eq('id', invocationId)
    return { error: spendingCheck.reason }
  }

  try {
    const auth = resolveCredentials(version.credentials_policy, version.auth_method)
    const output = await connectAndCallTool(integration.endpoint_url, auth, invocation.tool_name, invocation.input)
    await admin
      .from('builder_integration_invocations')
      .update({
        status: 'executed',
        output: output as Record<string, unknown>,
        correlated_amount: extractCorrelatedAmount(output) ?? invocation.correlated_amount,
        confirmed_at: new Date().toISOString(),
        confirmed_by: ctx.user.id,
        executed_at: new Date().toISOString(),
      })
      .eq('id', invocationId)
    return { output }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await admin
      .from('builder_integration_invocations')
      .update({ status: 'failed', error: message, confirmed_at: new Date().toISOString(), confirmed_by: ctx.user.id })
      .eq('id', invocationId)
    return { error: message }
  }
}

// Re-hydrates a still-pending GatewayInvocationCard when a conversation is
// reloaded from persisted history (toDisplayMessages), not just live in the
// same turn -- re-checked against current DB state (same "never trust what
// was true when the row was written" posture as resolveCreatedRecord),
// since the invocation may have already been confirmed/cancelled/expired in
// a previous session. Returns null for anything not still 'proposed', or
// not visible to this caller, or now-missing -- never throws.
export async function resolvePendingInvocation(ctx: WorkbenchCallerContext, invocationId: string): Promise<PendingGatewayInvocation | null> {
  try {
    const { data: invocation } = await ctx.supabase
      .from('builder_integration_invocations')
      .select('id, tool_name, risk_classification, input, status, builder_integration_id, builder_integration_version_id')
      .eq('id', invocationId)
      .maybeSingle()
    if (!invocation || invocation.status !== 'proposed') return null

    const { data: integration } = await ctx.supabase.from('builder_integrations').select('slug').eq('id', invocation.builder_integration_id).maybeSingle()
    const { data: version } = await ctx.supabase
      .from('builder_integration_versions')
      .select('approval_policy')
      .eq('id', invocation.builder_integration_version_id)
      .maybeSingle()
    if (!integration) return null

    return {
      invocationId: invocation.id,
      toolName: invocation.tool_name,
      integrationSlug: integration.slug,
      riskClassification: invocation.risk_classification,
      input: invocation.input,
      confirmationFields: version?.approval_policy?.confirmationFields,
    }
  } catch {
    return null
  }
}

export async function cancelInvocation(ctx: WorkbenchCallerContext, invocationId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: invocation, error } = await admin.from('builder_integration_invocations').select('project_id, status').eq('id', invocationId).single()
  if (error || !invocation) throw error ?? new Error('Gateway invocation not found')
  if (invocation.status !== 'proposed') throw new Error(`This action is no longer pending confirmation (status: ${invocation.status})`)

  await requireProjectAccess(ctx, invocation.project_id)

  const { error: updateError } = await admin.from('builder_integration_invocations').update({ status: 'cancelled' }).eq('id', invocationId)
  if (updateError) throw updateError
}
