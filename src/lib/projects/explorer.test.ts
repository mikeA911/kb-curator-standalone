import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getOrganizationExplorer } from './explorer'

// getOrganizationExplorer relies entirely on the caller's own RLS-scoped
// client for visibility -- these tests exercise the traversal/shaping logic
// (depth, dedup, source truncation), not authorization, which is covered by
// the RLS policies themselves (project_knowledge_bases_select_member,
// has_evidence_access) -- see the function's own comment for why no manual
// filtering exists here to test.

describe('getOrganizationExplorer', () => {
  it('returns an empty explorer when the root project has no attached knowledge bases', async () => {
    const supabase = createFakeSupabase({
      project_knowledge_bases: [{ data: [], error: null }], // root's own KB links: none
    })

    const result = await getOrganizationExplorer(supabase as never, 'root-1')

    expect(result).toEqual({ rootProjectId: 'root-1', knowledgeBases: [] })
  })

  it('shows a knowledge base, its sources, and a project connected through it, plus that project\'s own additional knowledge base', async () => {
    const supabase = createFakeSupabase({
      project_knowledge_bases: [
        { data: [{ knowledge_base_id: 'kb-1' }], error: null }, // 1. root's own KB links
        { data: [{ project_id: 'connected-1' }], error: null }, // 2. who else is attached to kb-1
        { data: [{ knowledge_base_id: 'kb-2' }], error: null }, // 3. connected-1's own KB links
      ],
      knowledge_bases: [
        { data: [{ id: 'kb-1', name: 'KB One' }], error: null }, // 1. root's own KB names
        { data: [{ id: 'kb-2', name: 'KB Two' }], error: null }, // 2. connected-1's own KB names
      ],
      knowledge_sources: [
        { data: [{ id: 'src-1', title: 'Source One' }], error: null }, // kb-1's sources
        { data: [{ id: 'src-2', title: 'Source Two' }], error: null }, // kb-2's sources (connected-1's additional KB)
      ],
      projects: [{ data: [{ id: 'connected-1', name: 'Connected Project' }], error: null }],
    })

    const result = await getOrganizationExplorer(supabase as never, 'root-1')

    expect(result).toEqual({
      rootProjectId: 'root-1',
      knowledgeBases: [
        {
          id: 'kb-1',
          name: 'KB One',
          sources: [{ id: 'src-1', title: 'Source One' }],
          sourcesTruncated: false,
          connectedProjects: [
            {
              id: 'connected-1',
              name: 'Connected Project',
              additionalKnowledgeBases: [
                { id: 'kb-2', name: 'KB Two', sources: [{ id: 'src-2', title: 'Source Two' }], sourcesTruncated: false },
              ],
            },
          ],
        },
      ],
    })
  })

  it('collapses a project reachable through two shared root knowledge bases into one expanded node and one reference', async () => {
    const supabase = createFakeSupabase({
      project_knowledge_bases: [
        { data: [{ knowledge_base_id: 'kb-1' }, { knowledge_base_id: 'kb-3' }], error: null }, // 1. root's own KB links (two KBs)
        { data: [{ project_id: 'connected-1' }], error: null }, // 2. who else is on kb-1
        { data: [{ knowledge_base_id: 'kb-1' }, { knowledge_base_id: 'kb-3' }], error: null }, // 3. connected-1's own links (attached to both)
        { data: [{ project_id: 'connected-1' }], error: null }, // 4. who else is on kb-3 (same project again)
      ],
      knowledge_bases: [
        { data: [{ id: 'kb-1', name: 'KB One' }, { id: 'kb-3', name: 'KB Three' }], error: null }, // root's own KB names
        { data: [{ id: 'kb-1', name: 'KB One' }, { id: 'kb-3', name: 'KB Three' }], error: null }, // connected-1's own KB names (during expansion under kb-1)
      ],
      knowledge_sources: [
        { data: [], error: null }, // kb-1 sources (root's own)
        { data: [], error: null }, // kb-3 sources (connected-1's additional KB, during expansion)
        { data: [], error: null }, // kb-3 sources (root's own, second outer-loop iteration)
      ],
      projects: [
        { data: [{ id: 'connected-1', name: 'Connected Project' }], error: null }, // names for kb-1's connections
        { data: [{ id: 'connected-1', name: 'Connected Project' }], error: null }, // names for kb-3's connections
      ],
    })

    const result = await getOrganizationExplorer(supabase as never, 'root-1')

    const kb1 = result.knowledgeBases.find((k) => k.id === 'kb-1')!
    const kb3 = result.knowledgeBases.find((k) => k.id === 'kb-3')!
    // Expanded once, under kb-1 (the first KB it was discovered through).
    expect(kb1.connectedProjects[0]).toEqual({
      id: 'connected-1',
      name: 'Connected Project',
      additionalKnowledgeBases: [{ id: 'kb-3', name: 'KB Three', sources: [], sourcesTruncated: false }],
    })
    // Reference only under kb-3 -- not re-expanded.
    expect(kb3.connectedProjects[0]).toEqual({ id: 'connected-1', name: 'Connected Project', additionalKnowledgeBases: [] })
  })

  it('marks sources as truncated past the display cap without affecting what was actually returned', async () => {
    const manySources = Array.from({ length: 9 }, (_, i) => ({ id: `src-${i}`, title: `Source ${i}` }))
    const supabase = createFakeSupabase({
      project_knowledge_bases: [
        { data: [{ knowledge_base_id: 'kb-1' }], error: null },
        { data: [], error: null }, // no other projects attached to kb-1
      ],
      knowledge_bases: [{ data: [{ id: 'kb-1', name: 'KB One' }], error: null }],
      knowledge_sources: [{ data: manySources, error: null }], // 9 rows returned (limit was 8+1=9)
    })

    const result = await getOrganizationExplorer(supabase as never, 'root-1')

    expect(result.knowledgeBases[0].sources).toHaveLength(8)
    expect(result.knowledgeBases[0].sourcesTruncated).toBe(true)
  })
})
