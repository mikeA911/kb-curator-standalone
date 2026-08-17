import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ProjectType, PublicProjectProfile } from '@/types/database'

// Narrow-select query layer for anonymous/public reads. RLS is row-level
// only -- projects.owner_id/notes/details/published_by must never reach a
// public reader even on an otherwise-visible row, so these functions select
// an explicit column allowlist and are the ONLY way public pages should
// query `projects`. Never select('*') here (see queries elsewhere in this
// codebase that do -- those are for the authenticated app, not this path).
//
// The hand-authored Database type in src/types/database.ts doesn't carry
// enough structural detail for supabase-js's select-string literal
// inference to resolve real per-column types (verified: it silently
// degrades every selected field to `any` rather than erroring) -- so the
// actual type safety here comes from this explicit PublicProjectRow
// interface + cast, not from the select-string type. The runtime column
// list sent to Postgrest is still exactly what's written below regardless.
export interface PublicProjectRow {
  id: string
  public_slug: string | null
  name: string
  project_type: ProjectType
  public_profile: PublicProjectProfile | null
  published_at: string | null
  // Admin-only opt-in (see setPublicFullDetailAction) -- when true, this
  // project's workstreams/artifacts/assessment responses are also visible
  // to anonymous visitors via src/lib/projects/public-workstreams.ts, not
  // just the curated public_profile summary. Defaults false; every other
  // published project (e.g. the RAG vs LLM comparison) is unaffected.
  public_full_detail: boolean
}

const PUBLIC_PROJECT_COLUMNS = 'id, public_slug, name, project_type, public_profile, published_at, public_full_detail'

export async function getPublicProjectBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(PUBLIC_PROJECT_COLUMNS)
    .eq('public_slug', slug)
    .eq('visibility', 'public')
    .not('published_at', 'is', null)
    .maybeSingle()
  if (error) throw error
  return data as PublicProjectRow | null
}

export async function listPublicProjects(supabase: SupabaseClient<Database>, filter: { type?: ProjectType } = {}) {
  let query = supabase
    .from('projects')
    .select(PUBLIC_PROJECT_COLUMNS)
    .eq('visibility', 'public')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })

  if (filter.type) query = query.eq('project_type', filter.type)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PublicProjectRow[]
}
