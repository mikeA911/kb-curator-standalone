'use client'

import { useTransition } from 'react'
import type { KnowledgeBase, Profile, UserRole } from '@/types/database'
import { updateUserRole, updateUserActive, assignKBsToCurator } from '@/app/actions/admin'
import { CreateUserForm } from './CreateUserForm'

export function UserManagement({ profiles, knowledgeBases }: { profiles: Profile[]; knowledgeBases: KnowledgeBase[] }) {
  const [isPending, startTransition] = useTransition()

  function toggleKb(profile: Profile, kbId: string) {
    const next = profile.assigned_kbs.includes(kbId)
      ? profile.assigned_kbs.filter((k) => k !== kbId)
      : [...profile.assigned_kbs, kbId]
    startTransition(() => assignKBsToCurator(profile.id, next))
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Users</h2>
      <CreateUserForm />
      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium">Assigned KBs</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-3 py-2">{profile.email ?? <span className="text-zinc-400">(anonymous)</span>}</td>
                <td className="px-3 py-2">
                  {profile.role === 'anonymous' ? (
                    <span className="rounded bg-zinc-100 px-1.5 py-1 text-xs text-zinc-500">anonymous</span>
                  ) : (
                    <select
                      defaultValue={profile.role}
                      disabled={isPending}
                      onChange={(e) => startTransition(() => updateUserRole(profile.id, e.target.value as Exclude<UserRole, 'anonymous'>))}
                      className="rounded border border-zinc-300 px-1.5 py-1 text-xs"
                    >
                      <option value="consultant">consultant</option>
                      <option value="curator">curator</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    defaultChecked={profile.is_active}
                    disabled={isPending}
                    onChange={(e) => startTransition(() => updateUserActive(profile.id, e.target.checked))}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {knowledgeBases.map((kb) => (
                      <label key={kb.id} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          defaultChecked={profile.assigned_kbs.includes(kb.id)}
                          disabled={isPending}
                          onChange={() => toggleKb(profile, kb.id)}
                        />
                        {kb.id}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
