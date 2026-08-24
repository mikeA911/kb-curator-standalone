import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, KnowledgeBase } from '@/types/database'

export async function listActiveKnowledgeBases(supabase: SupabaseClient<Database>): Promise<KnowledgeBase[]> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('lifecycle_status', 'active')
    .order('name')
  // Deployment-safe transition: application instances may briefly run
  // before the migration reaches the database. Preserve the previous list
  // during that window rather than failing the Upload/New Project pages.
  if (error && 'code' in error && error.code === '42703') {
    const fallback = await supabase.from('knowledge_bases').select('*').order('name')
    if (fallback.error) throw fallback.error
    return fallback.data ?? []
  }
  if (error) throw error
  return data ?? []
}

export async function requireActiveKnowledgeBase(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('id', id)
    .eq('lifecycle_status', 'active')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('This knowledge base is retained for reference and cannot be used for new work.')
}
