'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import * as registry from '@/lib/external-agents/registry'
import type { ExternalAgentCertificationStatus, ExternalAgentProtocol } from '@/types/database'

export async function registerExternalAgentAction(input: {
  name: string
  purpose: string
  protocol: ExternalAgentProtocol
  endpointUrl?: string | null
  projectId?: string | null
  skills: { name: string; description: string; provider?: string }[]
  credentialsPolicy: Record<string, unknown>
  spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
  approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
  permittedScope?: { projectIds?: string[]; userIds?: string[] }
}) {
  const ctx = await requireUser()
  const result = await registry.registerExternalAgent(ctx, input)
  revalidatePath('/agent-registry')
  return result
}

export async function createExternalAgentVersionAction(
  agentId: string,
  input: {
    skills: { name: string; description: string; provider?: string }[]
    credentialsPolicy: Record<string, unknown>
    spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
    approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
    permittedScope?: { projectIds?: string[]; userIds?: string[] }
    notes?: string | null
  }
) {
  const ctx = await requireUser()
  const result = await registry.createExternalAgentVersion(ctx, agentId, input)
  revalidatePath(`/agent-registry/${agentId}`)
  return result
}

export async function updateCertificationStatusAction(agentId: string, versionId: string, newStatus: ExternalAgentCertificationStatus) {
  const ctx = await requireUser()
  await registry.updateCertificationStatus(ctx, versionId, newStatus)
  revalidatePath(`/agent-registry/${agentId}`)
  revalidatePath('/agent-registry')
}
