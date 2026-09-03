import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
import { listKnowledgeBasesForProject } from './queries'

// Read-only organization Explorer (docs/dev-request-role-aware-project-views-
// and-ember-first-workspace.md). A navigation aid built entirely from
// relationships that already exist -- project_knowledge_bases attachments
// and knowledge_sources -- not a new hierarchy. No parent_project_id, no
// name-derived inheritance: a "connected Project" is only ever one that
// genuinely shares an attached knowledge base with the root.
//
// Visibility is achieved entirely by using the caller's own RLS-scoped
// client, never the admin client. project_knowledge_bases' own SELECT
// policy (project_knowledge_bases_select_member, 20260824170001) is
// is_project_member_strict(project_id, auth.uid()) with zero admin bypass --
// so querying it for "who else is attached to this knowledge base" already
// returns only rows for projects the caller can actually see. Same for
// knowledge_sources (has_evidence_access-gated). No manual filtering here.
const MAX_SOURCES_PER_KB = 8

export interface ExplorerSource {
  id: string
  title: string
  // Only ever computed for the root Project's own directly-attached KBs
  // (getSourcesForRootKb below) -- a source reached through a connected
  // Project's shared KB stays silently omitted if restricted, same as
  // before; locking across a Project boundary the viewer isn't a member of
  // is a different, bigger question, deliberately out of scope here.
  locked: boolean
  alreadyRequested: boolean
}

export interface ExplorerKnowledgeBase {
  id: string
  name: string
  sources: ExplorerSource[]
  sourcesTruncated: boolean
}

export interface ExplorerConnectedProject {
  id: string
  name: string
  additionalKnowledgeBases: ExplorerKnowledgeBase[]
}

export interface ExplorerRootKnowledgeBase extends ExplorerKnowledgeBase {
  connectedProjects: ExplorerConnectedProject[]
}

export interface OrganizationExplorer {
  rootProjectId: string
  knowledgeBases: ExplorerRootKnowledgeBase[]
}

async function getSourcesForKb(supabase: SupabaseClient<Database>, kbId: string): Promise<{ sources: ExplorerSource[]; truncated: boolean }> {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('id, title')
    .eq('knowledge_base_id', kbId)
    .order('title')
    .limit(MAX_SOURCES_PER_KB + 1)
  if (error) throw error
  const rows = data ?? []
  const sources = rows.slice(0, MAX_SOURCES_PER_KB).map((r) => ({ ...r, locked: false, alreadyRequested: false }))
  return { sources, truncated: rows.length > MAX_SOURCES_PER_KB }
}

// Root-level-only counterpart to getSourcesForKb (see ExplorerSource.locked's
// comment) -- a restricted source is shown, not silently omitted, so a
// member can request it instead of never learning it exists. The admin-
// client query is the same "safe metadata via admin client" pattern as
// getOrganizationPortfolio (src/lib/projects/portfolio.ts): id+title only,
// never content. Lock state is computed by diffing that against the
// viewer's own RLS-scoped query (has_evidence_access already computes
// exactly the right accessible set), not by re-deriving has_evidence_access
// in application code.
async function getSourcesForRootKb(
  supabase: SupabaseClient<Database>,
  kbId: string,
  viewerId: string
): Promise<{ sources: ExplorerSource[]; truncated: boolean }> {
  const admin = createAdminClient()
  const [{ data: allRows, error: allError }, { data: viewerRows, error: viewerError }] = await Promise.all([
    admin.from('knowledge_sources').select('id, title').eq('knowledge_base_id', kbId).order('title'),
    supabase.from('knowledge_sources').select('id').eq('knowledge_base_id', kbId),
  ])
  if (allError) throw allError
  if (viewerError) throw viewerError

  const accessibleIds = new Set((viewerRows ?? []).map((r) => r.id))
  const rows = allRows ?? []
  const truncated = rows.length > MAX_SOURCES_PER_KB
  const capped = rows.slice(0, MAX_SOURCES_PER_KB)

  const lockedIds = capped.filter((r) => !accessibleIds.has(r.id)).map((r) => r.id)
  const requestedIds = new Set<string>()
  if (lockedIds.length > 0) {
    const { data: pending, error: pendingError } = await supabase
      .from('resource_access_requests')
      .select('resource_id')
      .eq('resource_type', 'knowledge_source')
      .eq('requester_id', viewerId)
      .eq('status', 'pending')
      .in('resource_id', lockedIds)
    if (pendingError) throw pendingError
    for (const r of pending ?? []) requestedIds.add(r.resource_id)
  }

  const sources = capped.map((r) => ({
    id: r.id,
    title: r.title,
    locked: !accessibleIds.has(r.id),
    alreadyRequested: requestedIds.has(r.id),
  }))
  return { sources, truncated }
}

// Bounded, non-recursive by construction (acceptance criteria 13, 18, 19):
// only ever explores one hop of "connected Project" from the root, and never
// looks at a connected Project's own connected Projects. A Project reachable
// through two different root knowledge bases is expanded once and referenced
// (not re-expanded) the second time -- dedupedProjectIds tracks that.
export async function getOrganizationExplorer(
  supabase: SupabaseClient<Database>,
  rootProjectId: string,
  viewerId: string | null
): Promise<OrganizationExplorer> {
  const rootKbs = await listKnowledgeBasesForProject(supabase, rootProjectId)
  if (rootKbs.length === 0) return { rootProjectId, knowledgeBases: [] }

  const expandedConnectedProjectIds = new Set<string>()
  const knowledgeBases: ExplorerRootKnowledgeBase[] = []

  for (const kb of rootKbs) {
    // Locked-source detection only applies at the root level, and only for
    // a real signed-in viewer -- an anonymous visitor gets today's plain
    // RLS-filtered behavior (no admin-client peek, no lock UI, nothing to
    // request as a non-member anyway).
    const { sources, truncated } = viewerId ? await getSourcesForRootKb(supabase, kb.id, viewerId) : await getSourcesForKb(supabase, kb.id)

    const { data: links, error: linksError } = await supabase
      .from('project_knowledge_bases')
      .select('project_id')
      .eq('knowledge_base_id', kb.id)
      .neq('project_id', rootProjectId)
    if (linksError) throw linksError
    const connectedProjectIds = [...new Set((links ?? []).map((l) => l.project_id))]

    const connectedProjects: ExplorerConnectedProject[] = []
    if (connectedProjectIds.length > 0) {
      const { data: projects, error: projectsError } = await supabase.from('projects').select('id, name').in('id', connectedProjectIds)
      if (projectsError) throw projectsError

      for (const project of projects ?? []) {
        // Already expanded once under a different root KB -- reference only,
        // don't re-fetch its additional KBs/sources again.
        if (expandedConnectedProjectIds.has(project.id)) {
          connectedProjects.push({ id: project.id, name: project.name, additionalKnowledgeBases: [] })
          continue
        }
        expandedConnectedProjectIds.add(project.id)

        const connectedKbs = await listKnowledgeBasesForProject(supabase, project.id)
        const additionalKbs = connectedKbs.filter((k) => k.id !== kb.id)
        const additionalKnowledgeBases: ExplorerKnowledgeBase[] = []
        for (const additionalKb of additionalKbs) {
          const { sources: additionalSources, truncated: additionalTruncated } = await getSourcesForKb(supabase, additionalKb.id)
          additionalKnowledgeBases.push({
            id: additionalKb.id,
            name: additionalKb.name,
            sources: additionalSources,
            sourcesTruncated: additionalTruncated,
          })
        }
        connectedProjects.push({ id: project.id, name: project.name, additionalKnowledgeBases })
      }
    }

    knowledgeBases.push({ id: kb.id, name: kb.name, sources, sourcesTruncated: truncated, connectedProjects })
  }

  return { rootProjectId, knowledgeBases }
}
