import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

// Service-role client. Bypasses RLS entirely -- only use inside Server Actions
// / Route Handlers, and only after an explicit authorization check against the
// caller's own session (see requireRole in lib/auth.ts). Never import this
// from a Client Component; `server-only` makes that a build error.
export function createAdminClient() {
  return createSupabaseClient<Database>(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
