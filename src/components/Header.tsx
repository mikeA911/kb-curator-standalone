'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { NavDropdown } from '@/components/NavDropdown'
import type { Profile } from '@/types/database'

const EXPLORE_ITEMS = [
  { href: '/evals', label: 'Evals' },
  { href: '/graphs', label: 'Graphs' },
  { href: '/agents', label: 'Agents' },
]

export function Header({ profile, logoUrl }: { profile: Profile; logoUrl: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/about" aria-label="About KB Sandbox" className="shrink-0">
            <span className="relative block h-9 w-9 overflow-hidden rounded-full">
              <Image src={logoUrl} alt="KB Sandbox" fill className="object-cover" />
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <Link href="/dashboard" className="hover:text-zinc-900">Workbench</Link>
            <Link href="/projects" className="hover:text-zinc-900">Projects</Link>
            <Link href="/wiki" className="hover:text-zinc-900">Wiki</Link>
            <Link href="/trending" className="hover:text-zinc-900">Trending</Link>
            <NavDropdown label="Explore" items={EXPLORE_ITEMS} />
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
