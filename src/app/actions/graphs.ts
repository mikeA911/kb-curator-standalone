'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, AuthError } from '@/lib/auth'
import { GraphValidationError } from '@/lib/graph/errors'

// Real enforcement is RLS (graphs_manage_staff for platform-global graphs,
// graphs_manage_project_owner for project-scoped ones -- see
// 20260811100001_graph_runtime.sql). requireUser + the anonymous check here
// are the same defense-in-depth convention as every other action in this
// codebase; an unauthorized update simply matches zero rows under RLS
// rather than erroring, so that's checked explicitly for a clear message.
export async function activateGraphVersionAction(graphId: string, versionId: string) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to manage graphs')

  const { data, error } = await supabase.from('graphs').update({ active_version_id: versionId }).eq('id', graphId).select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new GraphValidationError('You do not have permission to activate a version on this graph')
  }

  revalidatePath('/graphs')
}
