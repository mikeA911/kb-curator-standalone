import 'server-only'
import { AuthError } from '@/lib/auth'
import type { RoadmapItem, RoadmapStatus } from '@/types/database'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { isPlatformOwner } from '@/lib/feedback/queries'

// Owner Roadmap register, in-app. Every function uses the caller's own
// RLS-scoped client -- roadmap_items_owner (RLS) is the real gate.

export async function listRoadmapItems(ctx: WorkbenchCallerContext): Promise<RoadmapItem[]> {
  const { data, error } = await ctx.supabase.from('roadmap_items').select('*').order('item_ref')
  if (error) throw error
  return data ?? []
}

export interface RoadmapItemTriageInput {
  status?: RoadmapStatus
  decisionNextAction?: string | null
}

export async function updateRoadmapItem(ctx: WorkbenchCallerContext, id: string, input: RoadmapItemTriageInput): Promise<void> {
  if (!(await isPlatformOwner(ctx))) throw new AuthError('Only an authorized owner may update the roadmap register')

  const { error } = await ctx.supabase
    .from('roadmap_items')
    .update({
      ...(input.status ? { status: input.status } : {}),
      ...(input.decisionNextAction !== undefined ? { decision_next_action: input.decisionNextAction } : {}),
    })
    .eq('id', id)
  if (error) throw error
}
