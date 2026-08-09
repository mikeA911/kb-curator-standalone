import { describe, it, expect } from 'vitest'
import { linkSource, getSourcesForVersion } from './sources'
import { WikiValidationError } from './articles'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

describe('linkSource', () => {
  it('links a version to a supporting chunk', async () => {
    const supabase = createFakeSupabase({
      wiki_sources: [{ data: { id: 'source-1', chunk_id: 'chunk-1' }, error: null }],
    }) as never

    const source = await linkSource(supabase, { wikiVersionId: 'version-1', chunkId: 'chunk-1', sourceType: 'chunk' })
    expect(source.chunk_id).toBe('chunk-1')
  })

  it('requires a document or chunk id unless the source is external', async () => {
    const supabase = createFakeSupabase({}) as never
    await expect(linkSource(supabase, { wikiVersionId: 'version-1', sourceType: 'chunk' })).rejects.toBeInstanceOf(
      WikiValidationError
    )
  })

  it('allows an external source with no document/chunk id', async () => {
    const supabase = createFakeSupabase({
      wiki_sources: [{ data: { id: 'source-2', source_type: 'external' }, error: null }],
    }) as never

    const source = await linkSource(supabase, { wikiVersionId: 'version-1', sourceType: 'external', notes: 'a paper' })
    expect(source.source_type).toBe('external')
  })
})

describe('getSourcesForVersion', () => {
  it('returns the evidence linked to a version -- provenance stays reachable after approval', async () => {
    const supabase = createFakeSupabase({
      wiki_sources: [
        {
          data: [
            { id: 'source-1', chunk_id: 'chunk-1', document_id: null, chunk: { chunk_index: 3, source_page: 12 } },
          ],
          error: null,
        },
      ],
    }) as never

    const sources = await getSourcesForVersion(supabase, 'version-1')
    expect(sources).toHaveLength(1)
    expect(sources[0].chunk_id).toBe('chunk-1')
  })
})
