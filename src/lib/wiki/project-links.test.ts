import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { linkProjectArticle, unlinkProjectArticle, getProjectsForArticle, listArticlesForProject } from './project-links'

describe('linkProjectArticle / unlinkProjectArticle', () => {
  it('inserts a project_wiki_articles row with the attaching user recorded', async () => {
    const supabase = createFakeSupabase({ project_wiki_articles: [{ data: null, error: null }] })
    await linkProjectArticle(supabase as never, 'project-1', 'article-1', 'user-1')
    const insert = supabase._calls.find((c) => c.table === 'project_wiki_articles' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ project_id: 'project-1', wiki_article_id: 'article-1', attached_by: 'user-1' })
  })

  it('deletes the link row by id', async () => {
    const supabase = createFakeSupabase({ project_wiki_articles: [{ data: null, error: null }] })
    await unlinkProjectArticle(supabase as never, 'link-1')
    const del = supabase._calls.find((c) => c.table === 'project_wiki_articles' && c.method === 'delete')
    expect(del).toBeDefined()
  })
})

describe('getProjectsForArticle', () => {
  it('returns an empty list when nothing is linked, without a second query', async () => {
    const supabase = createFakeSupabase({ project_wiki_articles: [{ data: [], error: null }] })
    const result = await getProjectsForArticle(supabase as never, 'article-1')
    expect(result).toEqual([])
  })

  it('joins link rows to project names', async () => {
    const supabase = createFakeSupabase({
      project_wiki_articles: [{ data: [{ id: 'link-1', project_id: 'project-1' }], error: null }],
      projects: [{ data: [{ id: 'project-1', name: 'Zadara Knowledge Copilot Pilot' }], error: null }],
    })
    const result = await getProjectsForArticle(supabase as never, 'article-1')
    expect(result).toEqual([{ linkId: 'link-1', project: { id: 'project-1', name: 'Zadara Knowledge Copilot Pilot' } }])
  })
})

describe('listArticlesForProject', () => {
  it('joins link rows to article title/status/visibility', async () => {
    const supabase = createFakeSupabase({
      project_wiki_articles: [{ data: [{ id: 'link-1', wiki_article_id: 'article-1' }], error: null }],
      wiki_articles: [
        { data: [{ id: 'article-1', slug: 'zadara-copilot', title: 'Zadara Copilot', status: 'approved', visibility_scope: 'project_private' }], error: null },
      ],
    })
    const result = await listArticlesForProject(supabase as never, 'project-1')
    expect(result).toEqual([
      { linkId: 'link-1', article: { id: 'article-1', slug: 'zadara-copilot', title: 'Zadara Copilot', status: 'approved', visibility_scope: 'project_private' } },
    ])
  })
})
