import 'server-only'
import { AuthError } from '@/lib/auth'
import { ProjectValidationError } from '@/lib/projects/errors'
import type { WorkstreamObjectAccessMode } from '@/types/database'
import { getActiveProjectRole, type WorkbenchCallerContext } from './context'

// Builder Ontology, Part A (docs/kbs-ontology-dev-req-3.md):
// workstream_object_links (which objects a workstream reads/writes/creates)
// and workstream_flow (pipeline ordering between workstreams). Both are
// children of a Workstream via workstream_id/upstream_workstream_id, so the
// write guard resolves the workstream's project_id first, then applies the
// same curator-or-admin check createWorkstream/project-objects.ts use.

async function requireCuratorForWorkstream(ctx: WorkbenchCallerContext, workstreamId: string, actionLabel: string): Promise<string> {
  const { profile, supabase } = ctx
  if (profile.role === 'anonymous') throw new AuthError(`Create an account to ${actionLabel}`)
  const { data: workstream, error } = await supabase.from('project_workstreams').select('project_id').eq('id', workstreamId).single()
  if (error || !workstream) throw error ?? new ProjectValidationError('Workstream not found')
  if (profile.role !== 'admin') {
    const projectRole = await getActiveProjectRole(ctx, workstream.project_id)
    if (projectRole !== 'owner' && projectRole !== 'curator') {
      throw new AuthError(
        `To ${actionLabel} you need this project's owner or curator role (or platform admin) -- you're currently ${
          projectRole ? `a ${projectRole} on this project` : 'not an active member of this project'
        }.`
      )
    }
  }
  return workstream.project_id as string
}

// Upsert on (workstream_id, object_id) -- re-linking updates access_modes
// idempotently rather than erroring on the unique constraint.
export async function linkWorkstreamObject(
  ctx: WorkbenchCallerContext,
  input: { workstreamId: string; objectId: string; accessModes: WorkstreamObjectAccessMode[] }
) {
  const projectId = await requireCuratorForWorkstream(ctx, input.workstreamId, 'link an object to a workstream')
  const { data, error } = await ctx.supabase
    .from('workstream_object_links')
    .upsert(
      { workstream_id: input.workstreamId, object_id: input.objectId, access_modes: input.accessModes, created_by: ctx.user.id },
      { onConflict: 'workstream_id,object_id' }
    )
    .select('id')
    .single()
  if (error || !data) throw error ?? new ProjectValidationError('Failed to link object to workstream')
  return { linkId: data.id, projectId }
}

export async function unlinkWorkstreamObject(ctx: WorkbenchCallerContext, workstreamId: string, objectId: string) {
  const projectId = await requireCuratorForWorkstream(ctx, workstreamId, 'remove this object link')
  const { error } = await ctx.supabase.from('workstream_object_links').delete().eq('workstream_id', workstreamId).eq('object_id', objectId)
  if (error) throw error
  return { projectId }
}

export async function listWorkstreamObjectLinks(ctx: WorkbenchCallerContext, workstreamId: string) {
  const { data, error } = await ctx.supabase.from('workstream_object_links').select('*').eq('workstream_id', workstreamId)
  if (error) throw error
  return data ?? []
}

export async function createWorkstreamFlowEdge(
  ctx: WorkbenchCallerContext,
  input: { upstreamWorkstreamId: string; downstreamWorkstreamId: string }
) {
  const projectId = await requireCuratorForWorkstream(ctx, input.upstreamWorkstreamId, 'define workstream flow ordering')
  const { data, error } = await ctx.supabase
    .from('workstream_flow')
    .insert({
      upstream_workstream_id: input.upstreamWorkstreamId,
      downstream_workstream_id: input.downstreamWorkstreamId,
      created_by: ctx.user.id,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new ProjectValidationError('Failed to create workstream flow edge')
  return { edgeId: data.id, projectId }
}

export async function deleteWorkstreamFlowEdge(ctx: WorkbenchCallerContext, edgeId: string) {
  const { data, error } = await ctx.supabase.from('workstream_flow').delete().eq('id', edgeId).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new ProjectValidationError('You do not have permission to delete this workstream flow edge')
  return { deleted: true }
}

export async function listWorkstreamFlow(ctx: WorkbenchCallerContext, projectId: string) {
  const { data: workstreams, error: workstreamsError } = await ctx.supabase.from('project_workstreams').select('id').eq('project_id', projectId)
  if (workstreamsError) throw workstreamsError
  const ids = (workstreams ?? []).map((w) => w.id)
  if (ids.length === 0) return []
  const { data, error } = await ctx.supabase.from('workstream_flow').select('*').in('upstream_workstream_id', ids)
  if (error) throw error
  return data ?? []
}
