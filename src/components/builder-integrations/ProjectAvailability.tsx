'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { grantProjectAvailabilityAction, revokeProjectAvailabilityAction } from '@/app/actions/builder-integrations'

export interface AvailabilityEntry {
  id: string
  projectId: string
  projectName: string
}

interface ProjectOption {
  id: string
  name: string
}

// Real Project-scoping UI for a registered integration -- same
// add-via-picker / list-with-Revoke shape as the Access groups section of
// AccessEvidenceManager.tsx, since this is the same "deliberate, explicit
// grant" interaction, just for Projects instead of project members.
export function ProjectAvailability({
  integrationId,
  granted,
  availableProjects,
}: {
  integrationId: string
  granted: AvailabilityEntry[]
  availableProjects: ProjectOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')

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

  const grantedProjectIds = new Set(granted.map((g) => g.projectId))
  const addable = availableProjects.filter((p) => !grantedProjectIds.has(p.id))

  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium">Project availability</p>
      <p className="mt-1 text-xs text-zinc-500">
        Which Projects may discover and use this integration. Not attached to any Project means not available anywhere yet.
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {granted.length === 0 && <li className="text-zinc-400">Not available to any Project yet.</li>}
        {granted.map((g) => (
          <li key={g.id} className="flex items-center gap-2">
            <span>{g.projectName}</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => revokeProjectAvailabilityAction(integrationId, g.id))}
              className="text-xs text-red-600 underline disabled:opacity-50"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
      {addable.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded border border-zinc-300 px-1.5 py-1 text-xs"
          >
            <option value="">Add Project…</option>
            {addable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending || !selectedProjectId}
            onClick={() =>
              run(async () => {
                await grantProjectAvailabilityAction(integrationId, selectedProjectId)
                setSelectedProjectId('')
              })
            }
            className="text-xs underline disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
