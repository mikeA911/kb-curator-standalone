import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
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
  return { sources: rows.slice(0, MAX_SOURCES_PER_KB), truncated: rows.length > MAX_SOURCES_PER_KB }
}

// Bounded, non-recursive by construction (acceptance criteria 13, 18, 19):
// only ever explores one hop of "connected Project" from the root, and never
// looks at a connected Project's own connected Projects. A Project reachable
// through two different root knowledge bases is expanded once and referenced
// (not re-expanded) the second time -- dedupedProjectIds tracks that.
export async function getOrganizationExplorer(supabase: SupabaseClient<Database>, rootProjectId: string): Promise<OrganizationExplorer> {
  const rootKbs = await listKnowledgeBasesForProject(supabase, rootProjectId)
  if (rootKbs.length === 0) return { rootProjectId, knowledgeBases: [] }

  const expandedConnectedProjectIds = new Set<string>()
  const knowledgeBases: ExplorerRootKnowledgeBase[] = []

  for (const kb of rootKbs) {
    const { sources, truncated } = await getSourcesForKb(supabase, kb.id)

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
