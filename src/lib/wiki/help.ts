import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface QuickHelp {
  slug: string
  title: string
  quickHelp: string
}

// The one function the contextual Help component needs: resolve a slug to
// its approved quick_help text. Returns null if the article doesn't exist,
// isn't approved yet, or (for a draft/review article) the caller isn't
// staff -- RLS handles that last case for free since wiki_articles/
// wiki_versions SELECT already gates non-approved rows to curator/admin.
export async function getQuickHelpBySlug(supabase: SupabaseClient<Database>, slug: string): Promise<QuickHelp | null> {
  const { data: article, error } = await supabase
    .from('wiki_articles')
    .select('slug, title, current_version_id, status')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  if (error) throw error
  if (!article || !article.current_version_id) return null

  const { data: version, error: versionError } = await supabase
    .from('wiki_versions')
    .select('quick_help')
    .eq('id', article.current_version_id)
    .maybeSingle()
  if (versionError) throw versionError
  if (!version) return null

  return { slug: article.slug, title: article.title, quickHelp: version.quick_help }
}
