'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import {
  setBuilderLlmCredential,
  clearBuilderLlmCredential,
  getBuilderLlmCredentialStatus,
  type SetBuilderLlmCredentialInput,
  type BuilderLlmCredentialStatus,
} from '@/lib/workbench/builder-llm-credentials'

export async function setBuilderLlmCredentialAction(input: SetBuilderLlmCredentialInput): Promise<void> {
  const ctx = await requireUser()
  await setBuilderLlmCredential(ctx, input)
  revalidatePath('/profile')
}

export async function clearBuilderLlmCredentialAction(): Promise<void> {
  const ctx = await requireUser()
  await clearBuilderLlmCredential(ctx)
  revalidatePath('/profile')
}

export async function getBuilderLlmCredentialStatusAction(): Promise<BuilderLlmCredentialStatus | null> {
  const ctx = await requireUser()
  return getBuilderLlmCredentialStatus(ctx)
}
