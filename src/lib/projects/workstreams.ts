import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ProjectWorkstream, WorkstreamArtifact } from '@/types/database'

// Explicit casts throughout this file -- supabase-js's select-string literal
// type inference degrades to `any` for these two tables' array-shaped
// columns (repository_scope text[], deliverables jsonb array) once chained
// with .eq()/.single(), a known limitation already documented and worked
// around the same way in src/lib/projects/public.ts. The real safety net is
// this cast against the hand-authored Row interface, not the select string.

export async function listWorkstreams(supabase: SupabaseClient<Database>, projectId: string): Promise<ProjectWorkstream[]> {
  const { data, error } = await supabase
    .from('project_workstreams')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProjectWorkstream[]
}

export async function getWorkstreamBySlug(
  supabase: SupabaseClient<Database>,
  projectId: string,
  slug: string
): Promise<ProjectWorkstream | null> {
  const { data, error } = await supabase
    .from('project_workstreams')
    .select('*')
    .eq('project_id', projectId)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data as ProjectWorkstream | null
}

export async function listArtifacts(supabase: SupabaseClient<Database>, workstreamId: string): Promise<WorkstreamArtifact[]> {
  const { data, error } = await supabase
    .from('workstream_artifacts')
    .select('*')
    .eq('workstream_id', workstreamId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WorkstreamArtifact[]
}
