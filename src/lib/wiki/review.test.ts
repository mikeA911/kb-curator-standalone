import { describe, it, expect } from 'vitest'
import { approveWikiVersion, embedApprovedVersion } from './review'
import { WikiValidationError } from './articles'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import type { AIProvider } from '@/lib/ai/provider'

describe('approveWikiVersion', () => {
  it('marks the version approved and moves current_version_id to it', async () => {
    const supabase = createFakeSupabase({
      wiki_versions: [
        { data: { id: 'version-2', wiki_article_id: 'article-1', approved_at: null }, error: null },
        { data: null, error: null }, // the approval update
      ],
      wiki_articles: [{ data: null, error: null }], // article update
    }) as never

    await approveWikiVersion(supabase, 'article-1', 'version-2', 'admin-1')

    const calls = (supabase as ReturnType<typeof createFakeSupabase>)._calls
    const versionUpdate = calls.find((c) => c.table === 'wiki_versions' && c.method === 'update')
    const articleUpdate = calls.find((c) => c.table === 'wiki_articles' && c.method === 'update')

    expect(versionUpdate?.args).toMatchObject({ approved_by: 'admin-1' })
    expect(articleUpdate?.args).toMatchObject({ status: 'approved', current_version_id: 'version-2' })
  })

  it('refuses to re-approve a version that is already approved', async () => {
    const supabase = createFakeSupabase({
      wiki_versions: [
        { data: { id: 'version-1', wiki_article_id: 'article-1', approved_at: '2026-01-01T00:00:00Z' }, error: null },
      ],
    }) as never

    await expect(approveWikiVersion(supabase, 'article-1', 'version-1', 'admin-1')).rejects.toBeInstanceOf(WikiValidationError)
  })

  it('rejects a version that belongs to a different article', async () => {
    const supabase = createFakeSupabase({
      wiki_versions: [{ data: { id: 'version-9', wiki_article_id: 'article-OTHER', approved_at: null }, error: null }],
    }) as never

    await expect(approveWikiVersion(supabase, 'article-1', 'version-9', 'admin-1')).rejects.toBeInstanceOf(WikiValidationError)
  })
})

describe('embedApprovedVersion', () => {
  it('never throws -- an embedding failure must not block approval', async () => {
    const supabase = createFakeSupabase({}) as never
    const failingProvider: AIProvider = {
      name: 'fake',
      generateText: async () => {
        throw new Error('unused')
      },
      generateStructured: async () => {
        throw new Error('unused')
      },
      embed: async () => {
        throw new Error('provider outage')
      },
    }

    await expect(embedApprovedVersion(supabase, failingProvider, 'version-1', 'content')).resolves.toBeUndefined()
  })
})
