'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import * as registry from '@/lib/builder-integrations/registry'
import type { BuilderIntegrationKind, BuilderIntegrationRiskClassification, ExternalAgentCertificationStatus, ExternalAgentProtocol } from '@/types/database'

export async function registerBuilderIntegrationAction(input: {
  name: string
  purpose: string
  kind: BuilderIntegrationKind
  protocol: ExternalAgentProtocol
  endpointUrl?: string | null
  projectId?: string | null
  skills: { name: string; description: string; provider?: string }[]
  credentialsPolicy: Record<string, unknown>
  spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
  approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
  permittedScope?: { projectIds?: string[]; userIds?: string[] }
  riskClassification?: BuilderIntegrationRiskClassification
  authMethod?: string | null
}) {
  const ctx = await requireUser()
  const result = await registry.registerBuilderIntegration(ctx, input)
  revalidatePath('/agent-registry')
  return result
}

export async function createBuilderIntegrationVersionAction(
  integrationId: string,
  input: {
    skills: { name: string; description: string; provider?: string }[]
    credentialsPolicy: Record<string, unknown>
    spendingLimits: { perOrderMax?: number; dailyMax?: number; currency?: string }
    approvalPolicy: { requiresHumanConfirmation?: boolean; confirmationFields?: string[] }
    permittedScope?: { projectIds?: string[]; userIds?: string[] }
    riskClassification?: BuilderIntegrationRiskClassification
    authMethod?: string | null
    notes?: string | null
  }
) {
  const ctx = await requireUser()
  const result = await registry.createBuilderIntegrationVersion(ctx, integrationId, input)
  revalidatePath(`/agent-registry/${integrationId}`)
  return result
}

export async function updateCertificationStatusAction(integrationId: string, versionId: string, newStatus: ExternalAgentCertificationStatus) {
  const ctx = await requireUser()
  await registry.updateCertificationStatus(ctx, versionId, newStatus)
  revalidatePath(`/agent-registry/${integrationId}`)
  revalidatePath('/agent-registry')
}

export async function grantProjectAvailabilityAction(integrationId: string, projectId: string) {
  const ctx = await requireUser()
  await registry.grantProjectAvailability(ctx, integrationId, projectId)
  revalidatePath(`/agent-registry/${integrationId}`)
}

export async function revokeProjectAvailabilityAction(integrationId: string, availabilityId: string) {
  const ctx = await requireUser()
  await registry.revokeProjectAvailability(ctx, integrationId, availabilityId)
  revalidatePath(`/agent-registry/${integrationId}`)
}
