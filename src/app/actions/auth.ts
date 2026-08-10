'use server'

import { createClient } from '@/lib/supabase/server'

// Self-service profile creation on first login/signup, mirroring the old
// app's useAuth behavior. RLS (profiles_insert_self_consultant /
// profiles_insert_self_anonymous) only allows a session to insert its own
// row with a role matching whether it's a real or anonymous Supabase auth
// session, so this can't be used for privilege escalation -- role/is_active/
// assigned_kbs changes only happen through the admin Server Actions
// (service-role client).
export async function ensureProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (existing) return existing

  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? null,
      full_name: null,
      role: user.is_anonymous ? 'anonymous' : 'consultant',
      is_active: true,
      assigned_kbs: [],
    })
    .select()
    .single()

  if (error) throw error
  return created
}
