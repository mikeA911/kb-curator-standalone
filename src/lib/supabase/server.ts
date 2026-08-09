import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

// User-scoped Supabase client for Server Components / Server Actions / Route
// Handlers. Subject to RLS -- this is the client every non-privileged
// operation should use.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component with no response to attach cookies to.
          // Session refresh will still happen via proxy.ts.
        }
      },
    },
  })
}
