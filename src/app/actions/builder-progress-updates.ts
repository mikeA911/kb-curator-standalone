'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import {
  shareBuilderUpdate,
  withdrawBuilderUpdate,
  listBuilderOperationsRows,
  type ShareBuilderUpdateInput,
} from '@/lib/workbench/builder-progress-updates'

export async function shareBuilderUpdateAction(projectId: string, workstreamId: string, input: ShareBuilderUpdateInput) {
  const ctx = await requireUser()
  await shareBuilderUpdate(ctx, workstreamId, input)
  revalidatePath(`/projects/${projectId}/workstreams/${workstreamId}`)
}

export async function withdrawBuilderUpdateAction(projectId: string, workstreamId: string) {
  const ctx = await requireUser()
  await withdrawBuilderUpdate(ctx, workstreamId)
  revalidatePath(`/projects/${projectId}/workstreams/${workstreamId}`)
}

export async function listBuilderOperationsRowsAction() {
  const ctx = await requireUser()
  return listBuilderOperationsRows(ctx)
}
