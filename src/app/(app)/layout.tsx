import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import type { Profile } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (!profile || !(profile as Profile).is_active) redirect('/login')

  return (
    <div className="flex flex-1 flex-col">
      <Header profile={profile as Profile} />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
