import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { listRelatedExamples } from './public'

function project(id: string, relatedWikiSlugs?: string[]) {
  return {
    id,
    public_slug: `slug-${id}`,
    name: `Project ${id}`,
    project_type: 'experiment',
    public_profile: relatedWikiSlugs ? { title: `Project ${id}`, relatedWikiSlugs } : {},
    published_at: '2026-01-01T00:00:00Z',
  }
}

describe('listRelatedExamples', () => {
  it('returns only published projects whose relatedWikiSlugs includes the given article slug', async () => {
    const supabase = createFakeSupabase({
      projects: [
        {
          data: [
            project('1', ['retrieval-augmented-generation', 'ai-agents']),
            project('2', ['embeddings']),
            project('3'), // no relatedWikiSlugs at all
          ],
          error: null,
        },
      ],
    }) as never

    const result = await listRelatedExamples(supabase, 'retrieval-augmented-generation')

    expect(result.map((p) => p.id)).toEqual(['1'])
  })

  it('returns an empty array when nothing references the slug', async () => {
    const supabase = createFakeSupabase({
      projects: [{ data: [project('1', ['embeddings'])], error: null }],
    }) as never

    const result = await listRelatedExamples(supabase, 'retrieval-augmented-generation')

    expect(result).toEqual([])
  })
})
