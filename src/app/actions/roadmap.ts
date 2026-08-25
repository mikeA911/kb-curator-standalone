'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { updateRoadmapItem } from '@/lib/roadmap/queries'
import type { RoadmapItemTriageInput } from '@/lib/roadmap/queries'

export async function updateRoadmapItemAction(id: string, input: RoadmapItemTriageInput) {
  const ctx = await requireUser()
  await updateRoadmapItem(ctx, id, input)
  revalidatePath('/roadmap')
}
