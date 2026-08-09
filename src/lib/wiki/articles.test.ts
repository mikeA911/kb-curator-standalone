import { describe, it, expect } from 'vitest'
import { createManualDraftArticle, createAIAssistedArticle, createNextDraftVersion, WikiValidationError } from './articles'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const CONTENT = {
  quickHelp: 'A short explanation.',
  content: '# What it is\nSome content.',
  implementationNotes: null,
  limitations: null,
}

describe('createManualDraftArticle', () => {
  it('creates an article and its first version, both attributable to the curator', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [
        { data: null, error: null }, // slug uniqueness check
        { data: { id: 'article-1', slug: 'my-article', status: 'draft' }, error: null }, // insert
      ],
      wiki_versions: [{ data: { id: 'version-1', version_number: 1 }, error: null }],
    }) as never

    const { article, version } = await createManualDraftArticle(supabase, {
      slug: 'my-article',
      title: 'My Article',
      category: 'foundations',
      createdBy: 'curator-1',
      ...CONTENT,
    })

    expect(article.id).toBe('article-1')
    expect(version.version_number).toBe(1)

    const versionInsert = (supabase as ReturnType<typeof createFakeSupabase>)._calls.find(
      (c) => c.table === 'wiki_versions' && c.method === 'insert'
    )
    expect((versionInsert?.args as Record<string, unknown>).generated_by).toBe('human')
  })

  it('rejects a slug that is already in use', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [{ data: { id: 'existing' }, error: null }],
    }) as never

    await expect(
      createManualDraftArticle(supabase, { slug: 'taken', title: 'X', category: 'foundations', createdBy: 'u1', ...CONTENT })
    ).rejects.toBeInstanceOf(WikiValidationError)
  })
})

describe('createAIAssistedArticle', () => {
  it('lands as a draft article with generated_by=ai_assisted -- never auto-published', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [
        { data: null, error: null },
        { data: { id: 'article-2', slug: 'ai-topic', status: 'draft' }, error: null },
      ],
      wiki_versions: [{ data: { id: 'version-2', version_number: 1 }, error: null }],
    }) as never

    const { article } = await createAIAssistedArticle(supabase, {
      slug: 'ai-topic',
      title: 'AI Topic',
      category: 'knowledge_engineering',
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      sourceChunkIds: ['chunk-1', 'chunk-2'],
      createdBy: 'curator-1',
      ...CONTENT,
    })

    // The article shell itself is always created with status='draft'
    // (see createArticleShell in articles.ts) regardless of how the
    // content was produced.
    expect(article.status).toBe('draft')

    const calls = (supabase as ReturnType<typeof createFakeSupabase>)._calls
    const articleInsert = calls.find((c) => c.table === 'wiki_articles' && c.method === 'insert')
    const versionInsert = calls.find((c) => c.table === 'wiki_versions' && c.method === 'insert')
    expect((articleInsert?.args as Record<string, unknown>).status).toBe('draft')
    expect((versionInsert?.args as Record<string, unknown>).generated_by).toBe('ai_assisted')
    expect((versionInsert?.args as Record<string, unknown>).source_chunk_ids).toEqual(['chunk-1', 'chunk-2'])
  })
})

describe('createNextDraftVersion', () => {
  it('creates version N+1 and resets article status to draft, without touching current_version_id', async () => {
    const supabase = createFakeSupabase({
      wiki_versions: [
        { data: { version_number: 3 }, error: null }, // latest-version lookup
        { data: { id: 'version-4', version_number: 4 }, error: null }, // insert
      ],
      wiki_articles: [{ data: null, error: null }], // status update
    }) as never

    const version = await createNextDraftVersion(supabase, 'article-1', CONTENT, 'curator-1')

    expect(version.version_number).toBe(4)

    const calls = (supabase as ReturnType<typeof createFakeSupabase>)._calls
    const articleUpdate = calls.find((c) => c.table === 'wiki_articles' && c.method === 'update')
    expect(articleUpdate?.args).toEqual({ status: 'draft' })
    // Explicitly not present: current_version_id. Only approveWikiVersion
    // (review.ts) is allowed to move that pointer -- see the module comment
    // in articles.ts.
    expect(articleUpdate?.args).not.toHaveProperty('current_version_id')
  })
})
