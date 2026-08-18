import 'server-only'
import { AuthError } from '@/lib/auth'
import { ProjectValidationError } from '@/lib/projects/errors'
import type { WorkstreamDeliverable, ArtifactType } from '@/types/database'
import type { WorkbenchCallerContext } from './context'

// A generic repo URL (or a local filesystem path) drifts or breaks -- a
// PR/commit link is durable. This is the authoritative check; the form has
// the same check client-side only to fail fast.
function isGithubUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname === 'github.com' || u.hostname === 'www.github.com')
  } catch {
    return false
  }
}

// Caller (an already-resolved WorkbenchCallerContext) + an anonymous check,
// then RLS (project_workstreams_manage_curator -- can_curate_project,
// project-role-aware) is the real gate -- not a platform-role check, which
// would incorrectly block a project-scoped curator whose platform role is
// merely 'consultant'. An INSERT blocked by RLS surfaces as a real Postgres
// policy-violation error already, no manual zero-rows check needed (that's
// only necessary for UPDATE, where a non-matching row updates zero rows
// without erroring).
export async function createWorkstream(
  ctx: WorkbenchCallerContext,
  input: {
    projectId: string
    name: string
    slug: string
    repositoryScope: string[]
    goal?: string
    guardrail?: string
    deliverables: string[]
  }
) {
  const { profile, supabase } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to create a workstream')

  const deliverables: WorkstreamDeliverable[] = input.deliverables.filter((label) => label.trim()).map((label) => ({ label, completed: false }))

  const { data, error } = await supabase
    .from('project_workstreams')
    .insert({
      project_id: input.projectId,
      name: input.name,
      slug: input.slug,
      status: 'draft',
      repository_scope: input.repositoryScope.filter((p) => p.trim()),
      goal: input.goal || null,
      guardrail: input.guardrail || null,
      deliverables,
      created_by: profile.id,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new ProjectValidationError('Failed to create workstream')

  return { workstreamId: data.id, projectId: input.projectId }
}

// A deliverable being marked done is treated as a reviewed claim, not a
// self-report -- deliberately the same curator+ gate as creation, not the
// broader consultant bar attachArtifact uses below.
export async function toggleDeliverable(ctx: WorkbenchCallerContext, workstreamId: string, index: number) {
  const { supabase } = ctx

  const { data: workstream, error: fetchError } = await supabase
    .from('project_workstreams')
    .select('id, project_id, deliverables')
    .eq('id', workstreamId)
    .single()
  if (fetchError || !workstream) throw fetchError ?? new ProjectValidationError('Workstream not found')

  const deliverables = [...workstream.deliverables]
  if (!deliverables[index]) throw new ProjectValidationError('Deliverable not found')
  deliverables[index] = { ...deliverables[index], completed: !deliverables[index].completed }

  const { data, error } = await supabase.from('project_workstreams').update({ deliverables }).eq('id', workstreamId).select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new ProjectValidationError('You do not have permission to update this workstream')
  }

  return { projectId: workstream.project_id }
}

// Same curator+ gate as toggleDeliverable -- the outcome summary is a
// reviewed claim about what the evidence shows, not a self-report.
export async function updateWorkstreamSummary(ctx: WorkbenchCallerContext, workstreamId: string, summary: string) {
  const { supabase } = ctx

  const { data: workstream, error: fetchError } = await supabase
    .from('project_workstreams')
    .select('project_id')
    .eq('id', workstreamId)
    .single()
  if (fetchError || !workstream) throw fetchError ?? new ProjectValidationError('Workstream not found')

  const { data, error } = await supabase
    .from('project_workstreams')
    .update({ summary: summary.trim() || null })
    .eq('id', workstreamId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new ProjectValidationError('You do not have permission to update this workstream')
  }

  return { projectId: workstream.project_id }
}

// Broader than curator -- the consultant who did the external work is who
// attaches the evidence (workstream_artifacts_insert_consultant: owner/
// curator/consultant, excludes viewer).
export async function attachArtifact(
  ctx: WorkbenchCallerContext,
  input: {
    workstreamId: string
    artifactType: ArtifactType
    title: string
    externalTool?: string
    content?: string
    externalUrl?: string
    notes?: string
  }
) {
  const { profile, supabase } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to attach an artifact')
  if (!input.content?.trim() && !input.externalUrl?.trim()) {
    throw new ProjectValidationError('Provide either content or a link to attach as evidence')
  }
  if (input.externalUrl?.trim() && !isGithubUrl(input.externalUrl.trim())) {
    throw new ProjectValidationError('Link must be a github.com URL (ideally the PR or commit, not just the repo root)')
  }

  const { data: workstream, error: workstreamError } = await supabase
    .from('project_workstreams')
    .select('project_id')
    .eq('id', input.workstreamId)
    .single()
  if (workstreamError || !workstream) throw workstreamError ?? new ProjectValidationError('Workstream not found')

  const { data: artifact, error } = await supabase
    .from('workstream_artifacts')
    .insert({
      workstream_id: input.workstreamId,
      artifact_type: input.artifactType,
      title: input.title,
      external_tool: input.externalTool || null,
      content: input.content || null,
      external_url: input.externalUrl || null,
      notes: input.notes || null,
      created_by: profile.id,
    })
    .select('id')
    .single()
  if (error || !artifact) throw error ?? new ProjectValidationError('Failed to attach artifact')

  return { projectId: workstream.project_id, artifactId: artifact.id }
}
