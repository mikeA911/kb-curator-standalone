import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getProjectStats, listProjectsWithDraftUpdates, listProjectsWithKnowledge } from './queries'

describe('getProjectStats', () => {
  it('counts total projects and how many are active', async () => {
    const supabase = createFakeSupabase({
      projects: [{ data: [{ status: 'active' }, { status: 'draft' }, { status: 'active' }, { status: 'archived' }], error: null }],
    }) as never

    const result = await getProjectStats(supabase)

    expect(result).toEqual({ total: 4, active: 2 })
  })
})

describe('listProjectsWithDraftUpdates', () => {
  it('queries private projects with a non-null public_profile', async () => {
    const rows = [{ id: '1', name: 'Draft Project', public_profile: { title: 'x' } }]
    const supabase = createFakeSupabase({
      projects: [{ data: rows, error: null }],
    }) as never

    const result = await listProjectsWithDraftUpdates(supabase)

    expect(result).toEqual(rows)
  })
})

describe('listProjectsWithKnowledge', () => {
  it('returns an empty array when no knowledge base is project-scoped', async () => {
    const supabase = createFakeSupabase({
      knowledge_bases: [{ data: [], error: null }],
    }) as never

    const result = await listProjectsWithKnowledge(supabase)

    expect(result).toEqual([])
  })

  it('sums documents and wiki articles per project across its attached KBs', async () => {
    const supabase = createFakeSupabase({
      knowledge_bases: [
        {
          data: [
            { id: 'kb-a', project_id: 'proj-1' },
            { id: 'kb-b', project_id: 'proj-1' },
            { id: 'kb-c', project_id: 'proj-2' },
          ],
          error: null,
        },
      ],
      projects: [
        {
          data: [
            { id: 'proj-1', name: 'RAG Experiment' },
            { id: 'proj-2', name: 'Legacy Modernization' },
          ],
          error: null,
        },
      ],
      documents: [
        {
          data: [{ doc_type: 'kb-a' }, { doc_type: 'kb-a' }, { doc_type: 'kb-b' }, { doc_type: 'kb-c' }],
          error: null,
        },
      ],
      wiki_articles: [
        {
          data: [{ knowledge_base_id: 'kb-a' }, { knowledge_base_id: 'kb-c' }, { knowledge_base_id: 'kb-c' }],
          error: null,
        },
      ],
    }) as never

    const result = await listProjectsWithKnowledge(supabase)

    expect(result).toEqual([
      { id: 'proj-1', name: 'RAG Experiment', documentCount: 3, wikiArticleCount: 1 },
      { id: 'proj-2', name: 'Legacy Modernization', documentCount: 1, wikiArticleCount: 2 },
    ])
  })
})
