'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import {
  createMethodFromWorkstream,
  updateMethodDraft,
  publishMethod,
  listPublishedMethods,
  listPendingMethods,
  getMethod,
  instantiateMethodAsWorkstream,
} from '@/lib/workbench/methods'

export async function createMethodFromWorkstreamAction(
  projectId: string,
  workstreamId: string,
  input: { name: string; description?: string; guardrails?: string }
) {
  const ctx = await requireUser()
  const result = await createMethodFromWorkstream(ctx, workstreamId, input)
  revalidatePath(`/projects/${projectId}/workstreams/${workstreamId}`)
  return result
}

export async function updateMethodDraftAction(
  methodId: string,
  patch: {
    name?: string
    description?: string | null
    requirements?: string | null
    evidence?: string | null
    deliverables?: string | null
    guardrails?: string | null
    reviewPoints?: string | null
  }
) {
  const ctx = await requireUser()
  const result = await updateMethodDraft(ctx, methodId, patch)
  revalidatePath(`/methods/${methodId}`)
  return result
}

export async function publishMethodAction(methodId: string) {
  const ctx = await requireUser()
  const result = await publishMethod(ctx, methodId)
  revalidatePath('/admin')
  revalidatePath('/methods')
  revalidatePath(`/methods/${methodId}`)
  return result
}

export async function listPublishedMethodsAction() {
  const ctx = await requireUser()
  return listPublishedMethods(ctx)
}

export async function listPendingMethodsAction() {
  const ctx = await requireUser()
  return listPendingMethods(ctx)
}

export async function getMethodAction(methodId: string) {
  const ctx = await requireUser()
  return getMethod(ctx, methodId)
}

export async function instantiateMethodAsWorkstreamAction(input: { methodId: string; projectId: string; name: string }) {
  const ctx = await requireUser()
  const result = await instantiateMethodAsWorkstream(ctx, input)
  revalidatePath(`/projects/${input.projectId}`)
  return result
}
