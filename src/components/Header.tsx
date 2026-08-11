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
            <Link href="/projects" className="hover:text-zinc-900">Projects</Link>
            <Link href="/wiki" className="hover:text-zinc-900">Wiki</Link>
            <Link href="/evals" className="hover:text-zinc-900">Evals</Link>
            <Link href="/graphs" className="hover:text-zinc-900">Graphs</Link>
            <Link href="/agents" className="hover:text-zinc-900">Agents</Link>
            {(profile.role === 'curator' || profile.role === 'admin') && (
              <Link href="/upload" className="hover:text-zinc-900">Upload</Link>
            )}
            {profile.role === 'admin' && (
              <Link href="/admin" className="hover:text-zinc-900">Administration</Link>
            )}
            <Link href="/about" className="hover:text-zinc-900">About</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <Link href="/profile" className="hover:text-zinc-900">
            {profile.email ?? 'anonymous'} · {profile.role}
          </Link>
          <button onClick={handleSignOut} className="underline">Sign out</button>
        </div>
      </div>
    </header>
  )
}
