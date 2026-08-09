import { describe, it, expect } from 'vitest'
import { getQuickHelpBySlug } from './help'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

describe('getQuickHelpBySlug', () => {
  it('resolves quick_help for an approved article', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [
        { data: { slug: 'hybrid-retrieval', title: 'Hybrid Retrieval', current_version_id: 'v1', status: 'approved' }, error: null },
      ],
      wiki_versions: [{ data: { quick_help: 'Combines keyword and vector search.' }, error: null }],
    }) as never

    const help = await getQuickHelpBySlug(supabase, 'hybrid-retrieval')
    expect(help).toEqual({ slug: 'hybrid-retrieval', title: 'Hybrid Retrieval', quickHelp: 'Combines keyword and vector search.' })
  })

  it('returns null when no approved article matches the slug (query itself is scoped to status=approved)', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [{ data: null, error: null }],
    }) as never

    const help = await getQuickHelpBySlug(supabase, 'not-approved-yet')
    expect(help).toBeNull()
  })

  it('returns null for an article with no current_version_id (never approved)', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [{ data: { slug: 'x', title: 'X', current_version_id: null, status: 'approved' }, error: null }],
    }) as never

    const help = await getQuickHelpBySlug(supabase, 'x')
    expect(help).toBeNull()
  })
})
