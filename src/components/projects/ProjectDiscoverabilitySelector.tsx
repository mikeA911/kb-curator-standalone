'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectDiscoverability } from '@/types/database'
import { updateProjectDiscoverabilityAction } from '@/app/actions/projects'

const LABELS: Record<ProjectDiscoverability, string> = {
  platform: 'Discoverable',
  members_only: 'Members only',
}

// Same plain select-and-save shape as ProjectCategorySelector.tsx -- two
// fixed values instead of eight. canEdit is owner/curator/admin, same bar as
// updateProjectDiscoverability itself.
export function ProjectDiscoverabilitySelector({
  projectId,
  discoverability,
  canEdit,
}: {
  projectId: string
  discoverability: ProjectDiscoverability
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!canEdit) {
    return <span className="text-xs text-zinc-500">{LABELS[discoverability]}</span>
  }

  function handleChange(value: ProjectDiscoverability) {
    setError(null)
    startTransition(async () => {
      try {
        await updateProjectDiscoverabilityAction(projectId, value)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={discoverability}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as ProjectDiscoverability)}
        className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
      >
        {(Object.entries(LABELS) as [ProjectDiscoverability, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
