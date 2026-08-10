'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ProjectMember, ProjectRole, ProjectMemberStatus } from '@/types/database'
import {
  addProjectMemberAction,
  updateProjectMemberRoleAction,
  updateProjectMemberStatusAction,
  transferOwnershipAction,
} from '@/app/actions/projects'

const ROLES: ProjectRole[] = ['owner', 'curator', 'consultant', 'viewer']

interface MemberWithEmail extends ProjectMember {
  email: string
}

export function MembersManager({
  projectId,
  projectName,
  members,
  currentUserId,
}: {
  projectId: string
  projectName: string
  members: MemberWithEmail[]
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('consultant')
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    run(async () => {
      await addProjectMemberAction(projectId, email.trim(), role)
      setEmail('')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm underline">
          ← {projectName}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Members</h1>
      </div>

      <div className="rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3">
                  {m.email}
                  {m.user_id === currentUserId && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={m.role}
                    disabled={isPending}
                    onChange={(e) => run(() => updateProjectMemberRoleAction(m.id, projectId, e.target.value as ProjectRole))}
                    className="rounded border border-zinc-300 px-1.5 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={m.status === 'active'}
                      disabled={isPending}
                      onChange={(e) =>
                        run(() => updateProjectMemberStatusAction(m.id, projectId, (e.target.checked ? 'active' : 'inactive') as ProjectMemberStatus))
                      }
                    />
                    {m.status}
                  </label>
                </td>
                <td className="px-4 py-3 text-right">
                  {m.role !== 'owner' && (
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (!confirm(`Make ${m.email} the project owner? You will be moved to curator.`)) return
                        run(() => transferOwnershipAction(projectId, m.id))
                      }}
                      className="text-xs underline disabled:opacity-50"
                    >
                      Make owner
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add member</h2>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Existing user's email"
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as ProjectRole)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            {ROLES.filter((r) => r !== 'owner').map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button disabled={isPending} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Add
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
