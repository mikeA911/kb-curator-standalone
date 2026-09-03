'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectRole } from '@/types/database'
import { bulkAddProjectMembersAction } from '@/app/actions/projects'

// Never 'owner' -- same exclusion as the single-add form, ownership stays a
// deliberate one-at-a-time transfer, never a bulk grant.
const ROLES: ProjectRole[] = ['curator', 'consultant', 'viewer']
const PLATFORM_ROLES_ADMIN = ['member', 'consultant', 'curator', 'admin'] as const
const PLATFORM_ROLES_NON_ADMIN = ['member', 'consultant'] as const
type PlatformRole = (typeof PLATFORM_ROLES_ADMIN)[number]

interface ResultRow {
  email: string
  status: 'added' | 'created' | 'skipped' | 'failed'
  password?: string
  error?: string
}

function parseEmails(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// A deliberately small email-cell extractor, not a general CSV parser (no
// quoted-comma support) -- good enough for "one column of emails, maybe
// with a header row," which is what an HR export realistically looks like.
// Any column/row containing something email-shaped is picked up; anything
// else (names, headers) is ignored rather than rejected.
function extractEmailsFromCsvText(text: string): string[] {
  const EMAIL_LIKE = /[^\s,;]+@[^\s,;]+\.[^\s,;]+/g
  return Array.from(text.matchAll(EMAIL_LIKE)).map((m) => m[0])
}

// "Add all Sandz employees" -- onboarding a whole department (e.g. to a
// Sandz HR project) one email at a time was real friction. Reuses
// bulkAddProjectMembers (src/lib/workbench/projects.ts), which itself calls
// the exact same addProjectMember/createAndAddProjectMember functions the
// single-add form above uses, so authorization (including the non-admin
// platformRole cap on brand-new accounts) can never drift between the two
// paths.
export function BulkAddMembersForm({ projectId, viewerIsAdmin }: { projectId: string; viewerIsAdmin: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [role, setRole] = useState<ProjectRole>('consultant')
  const [platformRoleForNew, setPlatformRoleForNew] = useState<PlatformRole>('member')
  const [results, setResults] = useState<ResultRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const availablePlatformRoles = viewerIsAdmin ? PLATFORM_ROLES_ADMIN : PLATFORM_ROLES_NON_ADMIN
  const emailCount = parseEmails(text).length

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((content) => {
      const emails = extractEmailsFromCsvText(content)
      setText((prev) => (prev ? `${prev}\n${emails.join('\n')}` : emails.join('\n')))
    })
    e.target.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emails = parseEmails(text)
    if (emails.length === 0) return
    setError(null)
    setResults(null)
    startTransition(async () => {
      try {
        const rows = await bulkAddProjectMembersAction({ projectId, emails, projectRole: role, platformRoleForNew })
        setResults(rows)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bulk add failed')
      }
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm underline">
        Bulk add members…
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Bulk add members</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 underline">
          Close
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Paste emails (one per line, or comma-separated), or upload a CSV -- any email-shaped text anywhere in the file is picked up. An email with
        no existing account gets a new one created automatically, capped to the platform role selected below.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={'jane@sandz.com\njohn@sandz.com'}
        className="rounded border border-zinc-300 px-3 py-2 text-sm font-mono"
      />
      <input type="file" accept=".csv,text/csv" onChange={handleFile} className="text-xs" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-zinc-500">
          Add as{' '}
          <select value={role} onChange={(e) => setRole(e.target.value as ProjectRole)} className="rounded border border-zinc-300 px-2 py-1 text-xs">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          New accounts get platform role{' '}
          <select
            value={platformRoleForNew}
            onChange={(e) => setPlatformRoleForNew(e.target.value as PlatformRole)}
            className="rounded border border-zinc-300 px-2 py-1 text-xs"
          >
            {availablePlatformRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={isPending || emailCount === 0}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Adding…' : emailCount > 0 ? `Add ${emailCount} ${emailCount === 1 ? 'person' : 'people'}` : 'Add'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {results && (
        <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-xs">
          <p className="mb-2 font-medium">
            {results.filter((r) => r.status === 'added' || r.status === 'created').length}/{results.length} added
          </p>
          <ul className="flex flex-col gap-1">
            {results.map((r, i) => (
              <li key={`${r.email}-${i}`} className="flex flex-wrap items-baseline gap-2">
                <span
                  className={
                    r.status === 'added' || r.status === 'created'
                      ? 'font-medium text-emerald-700'
                      : r.status === 'skipped'
                        ? 'text-zinc-400'
                        : 'font-medium text-red-600'
                  }
                >
                  {r.status}
                </span>
                <span>{r.email}</span>
                {r.password && (
                  <span>
                    password: <code className="rounded bg-white px-1">{r.password}</code>
                  </span>
                )}
                {r.error && <span className="text-zinc-500">{r.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}
