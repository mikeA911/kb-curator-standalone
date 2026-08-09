import { supabase } from '../supabase'
import type { KnowledgeBase, Profile, CurationQueueItem } from '../../types'

/**
 * Get all knowledge bases
 */
export async function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create a new knowledge base (using Edge Function)
 */
export async function createKnowledgeBase(kb: { id: string; name: string; description?: string }): Promise<KnowledgeBase> {
  return await callAdminApi('create-kb', { kb })
}

/**
 * Delete a knowledge base (using Edge Function)
 */
export async function deleteKnowledgeBase(id: string): Promise<void> {
  await callAdminApi('delete-kb', { id })
}

/**
 * Helper to call admin Edge Function
 */
async function callAdminApi(type: string, payload: any = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { type, ...payload }
  })

  if (error) throw error
  return data
}

/**
 * Get all profiles (using Edge Function to bypass RLS securely)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  console.log('[Admin API] getAllProfiles called')
  try {
    const data = await callAdminApi('list-profiles')
    console.log('[Admin API] getAllProfiles success, count:', data?.length)
    return data || []
  } catch (error) {
    console.error('[Admin API] getAllProfiles error:', error)
    throw error
  }
}

/**
 * Update user role (using Edge Function to bypass RLS securely)
 */
export async function updateUserRole(userId: string, role: 'user' | 'curator' | 'admin'): Promise<void> {
  await callAdminApi('update-role', { userId, role })
}

/**
 * Assign KBs to a curator (using Edge Function to bypass RLS securely)
 */
export async function assignKBsToCurator(userId: string, kbIds: string[]): Promise<void> {
  await callAdminApi('assign-kbs', { userId, kbIds })
}

/**
 * Get curation queue
 */
export async function getCurationQueue(kbId?: string): Promise<CurationQueueItem[]> {
  let query = supabase.from('curation_queue').select('*').order('created_at', { ascending: false })
  
  if (kbId) {
    query = query.eq('kb_id', kbId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Add item to curation queue
 */
export async function addToCurationQueue(item: { kb_id: string; title: string; url: string }): Promise<CurationQueueItem> {
  const { data, error } = await supabase
    .from('curation_queue')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete item from curation queue
 */
export async function deleteFromCurationQueue(id: string): Promise<void> {
  const { error } = await supabase
    .from('curation_queue')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Approve/Process a submitted document (using Edge Function)
 */
export async function approveDocument(documentId: string): Promise<void> {
  await callAdminApi('approve-document', { documentId })
}
