import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

export function createClient() {
  return supabase
}

/**
 * Admin client with service role key - bypasses RLS
 * WARNING: This exposes the service role key in the frontend.
 * Only use this if you understand the security implications.
 */
export function createAdminClient() {
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
