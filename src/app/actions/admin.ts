'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Every action here requires admin first (using the caller's own RLS-scoped
// session), then switches to the service-role client for the actual write --
// the same two-step pattern the old app's admin-api edge function used, just
// living in this app's server runtime instead of a separate Edge Function.

export async function createKnowledgeBase(id: string, name: string, description: string) {
  await requireRole('admin')
  const admin = createAdminClient()
  const { error } = await admin.from('knowledge_bases').insert({ id, name, description: description || null })
  if (error) throw error
  revalidatePath('/admin')
}

export async function deleteKnowledgeBase(id: string) {
  await requireRole('admin')
  const admin = createAdminClient()
  const { error } = await admin.from('knowledge_bases').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin')
}

export async function addCurationQueueItem(kbId: string, title: string, url: string) {
  const { user } = await requireRole('curator')
  const admin = createAdminClient()
  const { error } = await admin.from('curation_queue').insert({ kb_id: kbId, title, url, status: 'pending', added_by: user.id })
  if (error) throw error
  revalidatePath('/admin')
}

export async function deleteCurationQueueItem(id: string) {
  await requireRole('curator')
  const admin = createAdminClient()
  const { error } = await admin.from('curation_queue').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin')
}

export async function listAllProfiles() {
  await requireRole('admin')
  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('*').order('email')
  if (error) throw error
  return data
}

export async function updateUserRole(userId: string, role: 'consultant' | 'curator' | 'admin') {
  await requireRole('admin')
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
  revalidatePath('/admin')
}

export async function updateUserActive(userId: string, isActive: boolean) {
  await requireRole('admin')
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ is_active: isActive }).eq('id', userId)
  if (error) throw error
  revalidatePath('/admin')
}

export async function assignKBsToCurator(userId: string, kbIds: string[]) {
  await requireRole('admin')
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ assigned_kbs: kbIds }).eq('id', userId)
  if (error) throw error
  revalidatePath('/admin')
}

export async function updateAIProviderSetting(provider: 'openai' | 'gemini') {
  const { user } = await requireRole('admin')
  const admin = createAdminClient()
  const { error } = await admin
    .from('settings')
    .upsert({ key: 'ai_provider', value: provider, updated_by: user.id, updated_at: new Date().toISOString() })
  if (error) throw error
  revalidatePath('/admin')
}

// Final admin sign-off: marks the document (and its curation_queue source
// item, if any) complete. Mirrors the old admin-api edge function's
// approve-document action.
export async function approveDocument(documentId: string) {
  await requireRole('admin')
  const admin = createAdminClient()

  const { error: docError } = await admin.from('documents').update({ processing_status: 'completed', processing_stage: 'completed' }).eq('id', documentId)
  if (docError) throw docError

  const { data: doc } = await admin.from('documents').select('doc_type, source_url').eq('id', documentId).single()
  if (doc?.source_url) {
    await admin.from('curation_queue').update({ status: 'completed' }).eq('kb_id', doc.doc_type).eq('url', doc.source_url)
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}
