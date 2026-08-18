'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveProjectAction } from '@/app/actions/projects'

export function ApproveProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleApprove() {
    if (!confirm('Mark this project completed? This signals the work is approved.')) return
    setError(null)
    startTransition(async () => {
      try {
        await approveProjectAction(projectId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve')
      }
    })
  }

  return (
    <span className="flex items-center gap-2">
      <button
        disabled={isPending}
        onClick={handleApprove}
        className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 disabled:opacity-50"
      >
        {isPending ? 'Approving…' : 'Approve'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
