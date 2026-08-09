import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const BUCKET = 'documents'
const SIGNED_URL_TTL_SECONDS = 60 * 10 // 10 minutes -- just long enough for a parse pass

export function buildStoragePath(filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `uploads/${Date.now()}-${sanitized}`
}

// Uploads to the private `documents` bucket (public = false, see
// supabase/migrations/20260808190011_storage.sql) and returns the storage
// path -- never a public URL. Access later goes through createSignedUrl().
export async function uploadDocument(
  supabase: SupabaseClient<Database>,
  path: string,
  file: Blob,
  contentType: string
): Promise<{ path: string }> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: false,
  })
  if (error) throw error
  return { path }
}

export async function createSignedUrl(supabase: SupabaseClient<Database>, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) throw error ?? new Error('Failed to create signed URL')
  return data.signedUrl
}

export async function downloadDocument(supabase: SupabaseClient<Database>, path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) throw error ?? new Error('Failed to download document')
  return data
}

export async function deleteDocument(supabase: SupabaseClient<Database>, path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}
