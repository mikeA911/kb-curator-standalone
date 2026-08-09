'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import type { Profile } from '@/types/database'

export function Header({ profile }: { profile: Profile }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">KB Sandbox</Link>
          <nav className="flex gap-4 text-sm text-zinc-600">
            <Link href="/dashboard" className="hover:text-zinc-900">Dashboard</Link>
            <Link href="/upload" className="hover:text-zinc-900">Upload</Link>
            <Link href="/wiki" className="hover:text-zinc-900">Wiki</Link>
            {(profile.role === 'curator' || profile.role === 'admin') && (
              <Link href="/admin" className="hover:text-zinc-900">Admin</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span>{profile.email} · {profile.role}</span>
          <button onClick={handleSignOut} className="underline">Sign out</button>
        </div>
      </div>
    </header>
  )
}
