import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Client-side Supabase client (anon key only). Used for auth forms and any
// client component that needs a live session; all data mutations still go
// through Server Actions.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
