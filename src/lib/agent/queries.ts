import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Agent, AgentVersion, AgentTemplate } from '@/types/database'

export async function listActiveAgents(supabase: SupabaseClient<Database>): Promise<Agent[]> {
  const { data, error } = await supabase.from('agents').select('*').eq('status', 'active').order('name')
  if (error) throw error
  return data ?? []
}

export async function getAgentStats(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from('agents').select('status')
  if (error) throw error
  const rows = data ?? []
  return { total: rows.length, active: rows.filter((a) => a.status === 'active').length }
}

export async function getAgentBySlug(supabase: SupabaseClient<Database>, slug: string): Promise<Agent | null> {
  const { data, error } = await supabase.from('agents').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function listAgentVersions(supabase: SupabaseClient<Database>, agentId: string): Promise<AgentVersion[]> {
  const { data, error } = await supabase
    .from('agent_versions')
    .select('*')
    .eq('agent_id', agentId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getAgentVersion(supabase: SupabaseClient<Database>, id: string): Promise<AgentVersion | null> {
  const { data, error } = await supabase.from('agent_versions').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function listAgentTemplates(supabase: SupabaseClient<Database>): Promise<AgentTemplate[]> {
  const { data, error } = await supabase.from('agent_templates').select('*').eq('status', 'active').order('name')
  if (error) throw error
  return data ?? []
}

export async function getAgentTemplateBySlug(supabase: SupabaseClient<Database>, slug: string): Promise<AgentTemplate | null> {
  const { data, error } = await supabase.from('agent_templates').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}
