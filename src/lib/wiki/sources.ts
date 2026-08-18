import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WikiSourceType } from '@/types/database'
import { WikiValidationError } from './articles'

export interface LinkSourceInput {
  wikiVersionId: string
  documentId?: string | null
  chunkId?: string | null
  workstreamArtifactId?: string | null
  sourceType: WikiSourceType
  relationship?: string | null
  notes?: string | null
}

export async function linkSource(supabase: SupabaseClient<Database>, input: LinkSourceInput) {
  if (input.sourceType !== 'external' && !input.documentId && !input.chunkId && !input.workstreamArtifactId) {
    throw new WikiValidationError('A document, chunk, or workstream artifact is required unless sourceType is "external"')
  }

  const { data, error } = await supabase
    .from('wiki_sources')
    .insert({
      wiki_version_id: input.wikiVersionId,
      document_id: input.documentId ?? null,
      chunk_id: input.chunkId ?? null,
      workstream_artifact_id: input.workstreamArtifactId ?? null,
      source_type: input.sourceType,
      relationship: input.relationship ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error || !data) throw error ?? new Error('Failed to link source')
  return data
}

export async function unlinkSource(supabase: SupabaseClient<Database>, sourceId: string) {
  const { error } = await supabase.from('wiki_sources').delete().eq('id', sourceId)
  if (error) throw error
}

export async function getSourcesForVersion(supabase: SupabaseClient<Database>, versionId: string) {
  const { data, error } = await supabase
    .from('wiki_sources')
    .select(
      '*, document:documents(id, original_filename, doc_type), chunk:document_chunks(id, chunk_index, source_page, chunk_text), workstream_artifact:workstream_artifacts(id, title, artifact_type)'
    )
    .eq('wiki_version_id', versionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}
