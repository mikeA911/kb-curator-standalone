import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { listUnpublishedArticles } from '@/lib/wiki/queries'
import { listProjectsWithDraftUpdates } from '@/lib/projects/queries'
import { listTrendingUnderReview } from '@/lib/trending/queries'

export interface NeedsAttentionItem {
  label: string
  count: number
  href: string
}

// One aggregator over five independently-owned queries -- deliberately not a
// single SQL query, since "needs attention" spans unrelated tables with
// different meanings of "pending." Items with count 0 are still returned
// (not filtered here) so the UI decides how to render an all-clear state.
export async function getNeedsAttention(supabase: SupabaseClient<Database>): Promise<NeedsAttentionItem[]> {
  const [{ data: submittedDocs }, unpublishedArticles, { data: failedRuns }, draftProjects, trendingUnderReview] =
    await Promise.all([
      supabase.from('documents').select('id').eq('processing_status', 'submitted'),
      listUnpublishedArticles(supabase),
      supabase.from('eval_runs').select('id').eq('status', 'failed'),
      listProjectsWithDraftUpdates(supabase),
      listTrendingUnderReview(supabase),
    ])

  return [
    { label: 'documents awaiting curation', count: (submittedDocs ?? []).length, href: '/upload' },
    { label: 'Wiki articles awaiting approval', count: unpublishedArticles.length, href: '/wiki' },
    { label: 'failed evaluation runs', count: (failedRuns ?? []).length, href: '/evals' },
    { label: 'unpublished project updates', count: draftProjects.length, href: '/projects' },
    { label: 'Trending items under review', count: trendingUnderReview.length, href: '/trending' },
  ]
}
