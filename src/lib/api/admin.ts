import { supabase, createAdminClient } from '../supabase'
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
 * Create a new knowledge base
 */
export async function createKnowledgeBase(kb: { id: string; name: string; description?: string }): Promise<KnowledgeBase> {
  await ensureAdmin()
  const { data, error } = await supabase
    .from('knowledge_bases')
    .insert(kb)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a knowledge base
 */
export async function deleteKnowledgeBase(id: string): Promise<void> {
  await ensureAdmin()
  const { error } = await supabase
    .from('knowledge_bases')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Helper to ensure only admins can perform certain operations
 */
async function ensureAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    console.error('[Admin API] No session found')
    throw new Error('Unauthorized')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (error || !profile) {
    console.error('[Admin API] Failed to fetch profile:', error)
    throw new Error('Failed to verify admin privileges')
  }

  if (profile.role !== 'admin') {
    console.error('[Admin API] User is not an admin:', profile.role)
    throw new Error('Admin privileges required')
  }
}

/**
 * Get all profiles (using admin client to bypass RLS)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  console.log('[Admin API] getAllProfiles called')
  await ensureAdmin()
  const adminClient = createAdminClient()
  console.log('[Admin API] Fetching profiles with admin client...')
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .order('email')

  if (error) {
    console.error('[Admin API] getAllProfiles error:', error)
    throw error
  }
  console.log('[Admin API] getAllProfiles success, count:', data?.length)
  return data || []
}

/**
 * Update user role (using admin client to bypass RLS)
 */
export async function updateUserRole(userId: string, role: 'user' | 'curator' | 'admin'): Promise<void> {
  await ensureAdmin()
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error
}

/**
 * Assign KBs to a curator (using admin client to bypass RLS)
 */
export async function assignKBsToCurator(userId: string, kbIds: string[]): Promise<void> {
  await ensureAdmin()
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ assigned_kbs: kbIds })
    .eq('id', userId)

  if (error) throw error
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
 * Approve/Process a submitted document
 */
export async function approveDocument(documentId: string): Promise<void> {
  await ensureAdmin()
  // Update document status to completed
  const { error } = await supabase
    .from('documents')
    .update({ processing_status: 'completed' })
    .eq('id', documentId)

  if (error) throw error

  // Update curation queue status if this document was from the queue
  const { data: doc } = await supabase
    .from('documents')
    .select('source_url, doc_type')
    .eq('id', documentId)
    .single()

  if (doc?.source_url) {
    await supabase
      .from('curation_queue')
      .update({ status: 'completed' })
      .eq('url', doc.source_url)
      .eq('kb_id', doc.doc_type)
  }
}
