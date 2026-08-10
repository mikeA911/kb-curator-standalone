import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/ProfileForm'
import type { Profile, UserRole } from '@/types/database'

const ROLE_LABELS: Record<UserRole, string> = {
  anonymous: 'Anonymous visitor',
  consultant: 'Consultant',
  curator: 'Curator',
  admin: 'Admin',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profileRow) redirect('/login')
  const profile = profileRow as Profile

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {profile.email ?? 'Browsing anonymously -- create an account to keep your work'} ·{' '}
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{ROLE_LABELS[profile.role]}</span>
        </p>
      </div>

      {profile.role === 'anonymous' ? (
        <p className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          You&rsquo;re exploring KB Sandbox anonymously. Create an account to save preferences and unlock consultant
          features like running evaluations.
        </p>
      ) : (
        <ProfileForm initialFullName={profile.full_name} />
      )}

      <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4 text-sm">
        <Row label="Role" value={ROLE_LABELS[profile.role]} />
        <Row label="Status" value={profile.is_active ? 'Active' : 'Deactivated'} />
        {(profile.role === 'curator' || profile.role === 'admin') && (
          <Row label="Assigned knowledge bases" value={profile.assigned_kbs.length ? profile.assigned_kbs.join(', ') : 'None'} />
        )}
        <Row label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
      </div>

      {profile.role === 'admin' && (
        <Link href="/admin" className="rounded border border-zinc-300 bg-white p-4 text-sm hover:border-zinc-400">
          <span className="font-medium">Administration</span>
          <p className="mt-1 text-zinc-500">Manage users, knowledge bases, and AI provider configuration.</p>
        </Link>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
