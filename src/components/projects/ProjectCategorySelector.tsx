'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PortfolioCategory } from '@/types/database'
import { updateProjectPortfolioCategoryAction } from '@/app/actions/projects'

export const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  sandz: 'Sandz',
  foundation: 'Foundation',
  showcases: 'Showcases',
  builder_lab: 'Builder Lab',
  templates: 'Templates',
  legacy_test: 'Legacy/Test',
  archived: 'Archived',
  other: 'Other',
}

// Inline editor for the "My Projects" list-grouping tag (2026-09-04) --
// deliberately a plain select-and-save, not ProjectStarterPromptForm's
// edit-in-place shape, since there's no free text to compose, just three
// fixed options. canEdit is owner/curator/admin, same bar as
// updateProjectPortfolioCategory itself.
export function ProjectCategorySelector({
  projectId,
  category,
  canEdit,
}: {
  projectId: string
  category: PortfolioCategory
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!canEdit) {
    return <span className="text-xs text-zinc-500">{CATEGORY_LABELS[category]}</span>
  }

  function handleChange(value: PortfolioCategory) {
    setError(null)
    startTransition(async () => {
      try {
        await updateProjectPortfolioCategoryAction(projectId, value)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save category')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={category}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as PortfolioCategory)}
        className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
      >
        {(Object.entries(CATEGORY_LABELS) as [PortfolioCategory, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
