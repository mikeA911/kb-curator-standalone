'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types/database'
import { createUserAction } from '@/app/actions/admin'

function randomPassword() {
  return crypto.getRandomValues(new Uint8Array(9)).reduce((s, b) => s + b.toString(36), '').slice(0, 12) + 'aA1!'
}

export function CreateUserForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  // 'member' default, not 'consultant' -- self-serve registration is
  // removed (admin is the only way to create an account), so this default
  // is what actually matters: an ordinary employee is the common case,
  // consultant the exception (OL-007).
  const [role, setRole] = useState<Exclude<UserRole, 'anonymous'>>('member')
  const [password, setPassword] = useState(() => randomPassword())
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await createUserAction({ email, password, role })
      setCreated({ email, password })
      setEmail('')
      setPassword(randomPassword())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-medium">Create user</h3>
      <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Exclude<UserRole, 'anonymous'>)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="member">member</option>
            <option value="consultant">consultant</option>
            <option value="curator">curator</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Initial password</span>
          <input
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 font-mono text-sm"
          />
        </label>
        <button disabled={submitting} className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {created && (
        <p className="mt-2 text-sm text-green-700">
          Created {created.email} -- give them this password now, it won&rsquo;t be shown again: <span className="font-mono">{created.password}</span>
        </p>
      )}
    </div>
  )
}
