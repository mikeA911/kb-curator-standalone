import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '@/types/database'
import { AuthError } from '@/lib/auth'
import { env } from '@/lib/env'
import type { WorkbenchCallerContext } from './context'

// Bearer-token counterpart to requireUser()'s cookie path -- not called by
// anything live yet (Phase D's MCP tool layer is the first real consumer),
// but built and tested now so the identity-verification interface exists
// before something needs it. Mirrors requireUser()'s exact profile-fetch and
// AuthError semantics so a caller gets identical error behavior regardless
// of which path produced its WorkbenchCallerContext.
export async function resolveCallerIdentityFromToken(token: string): Promise<WorkbenchCallerContext> {
  const supabase = createSupabaseClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  if (!user) throw new AuthError('Not authenticated')

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error || !profile) throw new AuthError('No profile found for authenticated user')
  if (!(profile as Profile).is_active) throw new AuthError('Account is deactivated')

  return { user, profile: profile as Profile, supabase }
}
