'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitWorkstreamForPromotionAction } from '@/app/actions/workstream-promotions'

// Submit a completed workstream for this Project's own curator to review --
// on approval, a new Project is created for the promoted work (this
// Project's other, unsubmitted content is never exposed). Visible to any
// active member of this Project, and only when there's nothing already in
// flight for it -- see the page's own gating.
export function WorkstreamPromotionForm({ projectId, workstreamId }: { projectId: string; workstreamId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return <p className="text-sm text-emerald-700">Submitted for promotion -- the operator will review it.</p>
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        await submitWorkstreamForPromotionAction(projectId, workstreamId)
        setSubmitted(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Submit for promotion</h2>
      <p className="text-xs text-zinc-500">
        Propose this completed workstream to this Project&apos;s curator. If accepted, a new Project is created with
        your approved artifacts, and you&apos;re added as a member.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Submit for promotion'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
