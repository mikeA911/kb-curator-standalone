import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { getBrandingUrls } from '@/lib/branding'
import { ChatPanel } from '@/components/chat/ChatPanel'
import type { Profile } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, brandingUrls] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getBrandingUrls(supabase),
  ])

  if (!profile || !(profile as Profile).is_active) redirect('/login')

  return (
    <div className="flex flex-1 flex-col">
      <Header profile={profile as Profile} logoUrl={brandingUrls.logo} />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
      <ChatPanel />
    </div>
  )
}
