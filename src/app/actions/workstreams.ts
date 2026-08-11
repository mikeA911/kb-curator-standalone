'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, AuthError } from '@/lib/auth'
import { ProjectValidationError } from '@/lib/projects/errors'
import type { WorkstreamDeliverable, ArtifactType } from '@/types/database'

// requireUser() + an anonymous check, then RLS (project_workstreams_manage_curator
// -- can_curate_project, project-role-aware) is the real gate -- not
// requireRole('curator'), which checks PLATFORM role and would incorrectly
// block a project-scoped curator whose platform role is merely
// 'consultant'. An INSERT blocked by RLS surfaces as a real Postgres
// policy-violation error already, no manual zero-rows check needed (that's
// only necessary for UPDATE, where a non-matching row updates zero rows
// without erroring).
export async function createWorkstreamAction(input: {
  projectId: string
  name: string
  slug: string
  repositoryScope: string[]
  goal?: string
  guardrail?: string
  deliverables: string[]
}) {
  const { profile, supabase } = await requireUser()
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

  revalidatePath(`/projects/${input.projectId}`)
  return { workstreamId: data.id }
}

// A deliverable being marked done is treated as a reviewed claim, not a
// self-report -- deliberately the same curator+ gate as creation, not the
// broader consultant bar attachArtifactAction uses below.
export async function toggleDeliverableAction(workstreamId: string, index: number) {
  const { supabase } = await requireUser()

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

  revalidatePath(`/projects/${workstream.project_id}/workstreams/${workstreamId}`)
}

// Broader than curator -- the consultant who did the external work is who
// attaches the evidence (workstream_artifacts_insert_consultant: owner/
// curator/consultant, excludes viewer).
export async function attachArtifactAction(input: {
  workstreamId: string
  artifactType: ArtifactType
  title: string
  externalTool?: string
  content?: string
  externalUrl?: string
  notes?: string
}) {
  const { profile, supabase } = await requireUser()
  if (profile.role === 'anonymous') throw new AuthError('Create an account to attach an artifact')
  if (!input.content?.trim() && !input.externalUrl?.trim()) {
    throw new ProjectValidationError('Provide either content or a link to attach as evidence')
  }

  const { data: workstream, error: workstreamError } = await supabase
    .from('project_workstreams')
    .select('project_id')
    .eq('id', input.workstreamId)
    .single()
  if (workstreamError || !workstream) throw workstreamError ?? new ProjectValidationError('Workstream not found')

  const { error } = await supabase.from('workstream_artifacts').insert({
    workstream_id: input.workstreamId,
    artifact_type: input.artifactType,
    title: input.title,
    external_tool: input.externalTool || null,
    content: input.content || null,
    external_url: input.externalUrl || null,
    notes: input.notes || null,
    created_by: profile.id,
  })
  if (error) throw error

  revalidatePath(`/projects/${workstream.project_id}/workstreams/${input.workstreamId}`)
}
