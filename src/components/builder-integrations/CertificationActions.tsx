'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ExternalAgentCertificationStatus } from '@/types/database'
import { updateCertificationStatusAction } from '@/app/actions/builder-integrations'

const LADDER: { value: ExternalAgentCertificationStatus; label: string }[] = [
  { value: 'experimental', label: 'Experimental' },
  { value: 'sandbox_tested', label: 'Sandbox Tested' },
  { value: 'security_reviewed', label: 'Security Reviewed' },
  { value: 'outlet_accepted', label: 'Outlet Accepted' },
  { value: 'production_approved', label: 'Production Approved' },
]

export function CertificationActions({
  integrationId,
  versionId,
  currentStatus,
}: {
  integrationId: string
  versionId: string
  currentStatus: ExternalAgentCertificationStatus
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(newStatus: ExternalAgentCertificationStatus) {
    setError(null)
    startTransition(async () => {
      try {
        await updateCertificationStatusAction(integrationId, versionId, newStatus)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  const currentIndex = LADDER.findIndex((s) => s.value === currentStatus)

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium">Certification status</p>
      <div className="flex flex-wrap items-center gap-2">
        {LADDER.map((step, i) => (
          <button
            key={step.value}
            disabled={isPending || i === currentIndex}
            onClick={() => run(step.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium disabled:cursor-default ${
              i === currentIndex
                ? 'border-green-700 bg-green-100 text-green-800'
                : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500'
            }`}
          >
            {step.label}
          </button>
        ))}
        <span className="mx-1 text-zinc-300">|</span>
        <button
          disabled={isPending || currentStatus === 'deprecated'}
          onClick={() => run('deprecated')}
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 disabled:cursor-default"
        >
          Deprecated
        </button>
        <button
          disabled={isPending || currentStatus === 'suspended'}
          onClick={() => run('suspended')}
          className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 disabled:cursor-default"
        >
          Suspended
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Approval applies to this specific version only. A new version always starts back at Experimental.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
