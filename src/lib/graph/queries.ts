import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Graph, GraphVersion } from '@/types/database'

export async function listActiveGraphs(supabase: SupabaseClient<Database>): Promise<Graph[]> {
  const { data, error } = await supabase.from('graphs').select('*').eq('status', 'active').order('name')
  if (error) throw error
  return data ?? []
}

export async function getGraphBySlug(supabase: SupabaseClient<Database>, slug: string): Promise<Graph | null> {
  const { data, error } = await supabase.from('graphs').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function listGraphVersions(supabase: SupabaseClient<Database>, graphId: string): Promise<GraphVersion[]> {
  const { data, error } = await supabase
    .from('graph_versions')
    .select('*')
    .eq('graph_id', graphId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return data ?? []
}
