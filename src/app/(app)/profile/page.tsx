import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/ProfileForm'
import { getDefaultStructuredOutputModel } from '@/lib/ai'
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

  // Best-effort: the journal disclosure names the real current
  // structured-output model, but a missing AI config shouldn't break the
  // rest of the profile page -- just fall back to a generic label.
  let journalModelLabel = "the platform's configured AI model"
  try {
    const { provider, model } = await getDefaultStructuredOutputModel(supabase)
    journalModelLabel = `${provider.display_name} / ${model.display_name}`
  } catch {
    // handled by the fallback label above
  }

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

      {profile.role !== 'anonymous' && (
        <div className="rounded border border-zinc-200 bg-white p-4 text-sm">
          <span className="font-medium">Journal</span>
          <p className="mt-1 text-zinc-500">
            Download a private, reflective summary of your last 30 days of Assistant conversations as a Word document. AI ({journalModelLabel})
            will read and summarize those conversations to write it. This document is generated fresh each time, is never saved by KB Sandbox,
            and does not become Assistant memory -- only you can see or download it, unless you choose to share the file yourself.
          </p>
          <a href="/profile/journal" className="mt-2 inline-block rounded border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400">
            Download my journal (DOCX)
          </a>
        </div>
      )}

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
