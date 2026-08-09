import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AIProvider } from '@/lib/ai/provider'
import { WikiValidationError } from './articles'

// Approval is the only path that ever moves wiki_articles.current_version_id
// -- draft creation and edits never touch it (see articles.ts). Call this
// with a service-role client only, from an admin-gated Server Action, the
// same pattern as documents' approveDocument.
export async function approveWikiVersion(
  supabase: SupabaseClient<Database>,
  articleId: string,
  versionId: string,
  approvedBy: string
) {
  const { data: version, error: versionError } = await supabase
    .from('wiki_versions')
    .select('id, wiki_article_id, approved_at')
    .eq('id', versionId)
    .single()
  if (versionError || !version) throw versionError ?? new Error('Version not found')
  if (version.wiki_article_id !== articleId) throw new WikiValidationError('Version does not belong to this article')
  if (version.approved_at) throw new WikiValidationError('This version is already approved')

  const now = new Date().toISOString()

  const { error: versionUpdateError } = await supabase
    .from('wiki_versions')
    .update({ approved_by: approvedBy, approved_at: now })
    .eq('id', versionId)
  if (versionUpdateError) throw versionUpdateError

  const { error: articleUpdateError } = await supabase
    .from('wiki_articles')
    .update({ status: 'approved', current_version_id: versionId })
    .eq('id', articleId)
  if (articleUpdateError) throw articleUpdateError
}

export async function rejectWikiVersionToDraft(supabase: SupabaseClient<Database>, articleId: string) {
  const { error } = await supabase.from('wiki_articles').update({ status: 'draft' }).eq('id', articleId)
  if (error) throw error
}

// Embedding the approved version is optional/best-effort (per the brief:
// "may also be embedded"). It must never block approval itself -- a failed
// embed here would otherwise turn an editorial approval into an AI-outage
// failure, which is a worse failure mode than just not having a Wiki vector
// yet. Failures are logged by the AIProvider's own operation logging.
export async function embedApprovedVersion(
  supabase: SupabaseClient<Database>,
  provider: AIProvider,
  versionId: string,
  content: string
) {
  try {
    const embedding = await provider.embed({ text: content })
    await supabase.from('wiki_vectors').upsert({
      wiki_version_id: versionId,
      content,
      embedding: embedding.embedding,
      embedding_model: embedding.model,
      embedding_dim: embedding.dimensions,
    })
  } catch (err) {
    console.error(`Wiki embedding failed for version ${versionId}:`, err)
  }
}
