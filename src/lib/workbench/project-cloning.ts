import 'server-only'
import { AuthError } from '@/lib/auth'
import { ProjectValidationError } from '@/lib/projects/errors'
import type { ProjectWorkstream, WorkstreamDeliverable } from '@/types/database'
import { getActiveProjectRole, type WorkbenchCallerContext } from './context'
import { insertStagedTree } from './projects'

// Builder Ontology, Part B (docs/kbs-ontology-dev-req-3.md): lets a builder
// duplicate a Project or a Workstream to compare two options side by side
// under otherwise-identical conditions (e.g. two VLM training partners run
// as siblings). Neither clone copies workstream_artifacts, ai_operation_logs,
// or eval_runs/eval_results -- a clone starts with no run history, that's
// the point of comparing it. Same owner/curator/admin bar as createWorkstream
// (OL-002) throughout.

async function requireCuratorForProject(ctx: WorkbenchCallerContext, projectId: string, actionLabel: string) {
  const { profile } = ctx
  if (profile.role === 'anonymous') throw new AuthError(`Create an account to ${actionLabel}`)
  if (profile.role !== 'admin') {
    const projectRole = await getActiveProjectRole(ctx, projectId)
    if (projectRole !== 'owner' && projectRole !== 'curator') {
      throw new AuthError(
        `To ${actionLabel} you need this project's owner or curator role (or platform admin) -- you're currently ${
          projectRole ? `a ${projectRole} on this project` : 'not an active member of this project'
        }.`
      )
    }
  }
}

// Deep-copies a Project's own project_objects and project_workstreams trees
// into a brand-new Project (owner = caller). Both trees land in an empty
// project, so original slugs never collide (project_id differs) and can be
// reused verbatim -- unlike cloneWorkstream below, which clones within the
// *same* project and must mangle slugs to satisfy the unique(project_id,
// slug) constraint.
export async function cloneProject(ctx: WorkbenchCallerContext, projectId: string) {
  const { user, supabase } = ctx
  await requireCuratorForProject(ctx, projectId, 'clone this project')

  const { data: source, error: sourceError } = await supabase
    .from('projects')
    .select('name, project_type, objective, details')
    .eq('id', projectId)
    .single()
  if (sourceError || !source) throw sourceError ?? new ProjectValidationError('Project not found')

  const [{ data: objects, error: objectsError }, { data: workstreams, error: workstreamsError }] = await Promise.all([
    supabase.from('project_objects').select('*').eq('project_id', projectId),
    supabase.from('project_workstreams').select('*').eq('project_id', projectId),
  ])
  if (objectsError) throw objectsError
  if (workstreamsError) throw workstreamsError

  const { data: clone, error: cloneError } = await supabase
    .from('projects')
    .insert({
      name: `${source.name} (Copy)`,
      project_type: source.project_type,
      objective: source.objective,
      status: 'draft',
      notes: null,
      details: source.details,
      owner_id: user.id,
      cloned_from_project_id: projectId,
    })
    .select('id')
    .single()
  if (cloneError || !clone) throw cloneError ?? new ProjectValidationError('Failed to clone project')

  if (objects && objects.length > 0) {
    const items = objects.map((o) => ({ ...o, tempId: o.id as string, parentTempId: o.parent_object_id as string | null }))
    await insertStagedTree(supabase, 'project_objects', items, (item, parentId) => ({
      project_id: clone.id,
      parent_object_id: parentId,
      name: item.name,
      slug: item.slug,
      description: item.description,
      created_by: user.id,
    }))
  }

  if (workstreams && workstreams.length > 0) {
    const items = workstreams.map((w) => ({ ...w, tempId: w.id as string, parentTempId: w.parent_workstream_id as string | null }))
    await insertStagedTree(supabase, 'project_workstreams', items, (item, parentId) => ({
      project_id: clone.id,
      parent_workstream_id: parentId,
      name: item.name,
      slug: item.slug,
      status: 'draft',
      repository_scope: item.repository_scope,
      goal: item.goal,
      guardrail: item.guardrail,
      // Deliverables are reset, not carried over as already-done -- a clone
      // is a fresh run of the same structure, not a copy of prior progress.
      deliverables: (item.deliverables as WorkstreamDeliverable[]).map((d) => ({ ...d, completed: false })),
      lifecycle_stage: item.lifecycle_stage,
      operational_status: 'open',
      planned_duration: item.planned_duration,
      actual_duration: null,
      cloned_from_workstream_id: item.id,
      created_by: user.id,
    }))
  }

  return { projectId: clone.id }
}

// Every workstream in the project reachable from `rootId` by walking
// parent_workstream_id downward -- root included. project_workstreams is a
// cycle-guarded tree (prevent_workstream_cycle), not a general graph, so a
// plain breadth-first walk from children-by-parent is sufficient.
function collectSubtree(all: ProjectWorkstream[], rootId: string): ProjectWorkstream[] {
  const childrenByParent = new Map<string, ProjectWorkstream[]>()
  for (const w of all) {
    if (w.parent_workstream_id) {
      childrenByParent.set(w.parent_workstream_id, [...(childrenByParent.get(w.parent_workstream_id) ?? []), w])
    }
  }
  const root = all.find((w) => w.id === rootId)
  if (!root) return []
  const result = [root]
  let frontier = [root]
  while (frontier.length > 0) {
    const next = frontier.flatMap((w) => childrenByParent.get(w.id) ?? [])
    result.push(...next)
    frontier = next
  }
  return result
}

// Clones one workstream's own subtree, within the same project only --
// cross-project cloning is explicitly out of scope: workstream_object_links
// can't be copied as-is across projects, since the target project has
// different project_objects rows and there's no reliable way to re-map to
// an equivalent object. The clone's root is deliberately reparented to null
// (a new top-level tree), not nested under the original's own parent --
// simpler than resolving an external, not-being-cloned parent id, and the
// clone can be manually organized afterward like any other workstream.
export async function cloneWorkstream(ctx: WorkbenchCallerContext, workstreamId: string) {
  const { user, profile, supabase } = ctx
  if (profile.role === 'anonymous') throw new AuthError('Create an account to clone a workstream')

  const { data: source, error: sourceError } = await supabase.from('project_workstreams').select('*').eq('id', workstreamId).single()
  if (sourceError || !source) throw sourceError ?? new ProjectValidationError('Workstream not found')

  if (profile.role !== 'admin') {
    const projectRole = await getActiveProjectRole(ctx, source.project_id)
    if (projectRole !== 'owner' && projectRole !== 'curator') {
      throw new AuthError(
        `Cloning a workstream needs this project's owner or curator role (or platform admin) -- you're currently ${
          projectRole ? `a ${projectRole} on this project` : 'not an active member of this project'
        }.`
      )
    }
  }

  const { data: allWorkstreams, error: allError } = await supabase.from('project_workstreams').select('*').eq('project_id', source.project_id)
  if (allError) throw allError
  const subtree = collectSubtree((allWorkstreams ?? []) as ProjectWorkstream[], workstreamId)

  const items = subtree.map((w) => ({
    ...w,
    tempId: w.id,
    parentTempId: w.id === workstreamId ? null : w.parent_workstream_id,
  }))
  const idByTempId = await insertStagedTree(supabase, 'project_workstreams', items, (item, parentId) => ({
    project_id: source.project_id,
    parent_workstream_id: parentId,
    name: item.name,
    // unique(project_id, slug) -- this clone lands in the SAME project as
    // the original, so the original slug must be mangled (unlike
    // cloneProject, whose clone lands in a brand-new, empty project).
    slug: `${item.slug}-copy-${crypto.randomUUID().slice(0, 6)}`,
    status: 'draft',
    repository_scope: item.repository_scope,
    goal: item.goal,
    guardrail: item.guardrail,
    deliverables: item.deliverables.map((d) => ({ ...d, completed: false })),
    lifecycle_stage: item.lifecycle_stage,
    operational_status: 'open',
    planned_duration: item.planned_duration,
    actual_duration: null,
    cloned_from_workstream_id: item.id,
    created_by: user.id,
  }))

  // Shares the project's existing project_objects (no copy) -- only the
  // links themselves are duplicated, pointing the cloned subtree at the same
  // (shared) objects.
  const { data: links, error: linksError } = await supabase
    .from('workstream_object_links')
    .select('*')
    .in(
      'workstream_id',
      subtree.map((w) => w.id)
    )
  if (linksError) throw linksError
  if (links && links.length > 0) {
    const newLinks = links.map((l) => ({
      workstream_id: idByTempId.get(l.workstream_id) as string,
      object_id: l.object_id,
      access_modes: l.access_modes,
      created_by: user.id,
    }))
    const { error: insertLinksError } = await supabase.from('workstream_object_links').insert(newLinks)
    if (insertLinksError) throw insertLinksError
  }

  return { workstreamId: idByTempId.get(workstreamId) as string, projectId: source.project_id }
}
